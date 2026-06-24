"""SQLite-backed persistence for chat threads, generated report metadata,
alert acknowledgements, and alert threshold configuration.

The rest of the backend is stateless (reads Excel files on every request via
the in-memory _CACHE in main.py) - this module is the only place data is
actually written to disk, backing the Chats, Report Library, and Alerts screens.
"""
import os
import sqlite3
import time
import uuid

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "app_state.db")
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "reports_storage")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_threads (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS generated_reports (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                framework TEXT NOT NULL,
                format TEXT NOT NULL,
                templates TEXT,
                year TEXT,
                plant TEXT,
                fy TEXT,
                storage_path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        # Per-domain anomaly detection threshold configuration.
        # Domain 'global' stores the fallback used when a domain has no
        # custom entry. All percentages represent YoY % change thresholds.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alert_config (
                domain TEXT PRIMARY KEY,
                low_pct REAL NOT NULL DEFAULT 12,
                medium_pct REAL NOT NULL DEFAULT 25,
                high_pct REAL NOT NULL DEFAULT 50
            )
        """)
        # Acknowledgement records for individual anomalies. The alert_id is a
        # deterministic composite key: "{domain}:{metric}:{plant}:{year}".
        # Status: open (default — not stored) | acknowledged | resolved | ignored.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alert_acks (
                alert_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                updated_at REAL NOT NULL
            )
        """)
        conn.commit()


# ─── Chat threads ────────────────────────────────────────────────────────────

def create_thread(title="New chat"):
    thread_id = str(uuid.uuid4())
    now = time.time()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO chat_threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (thread_id, title, now, now),
        )
        conn.commit()
    return {"id": thread_id, "title": title, "created_at": now, "updated_at": now}


def list_threads():
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM chat_threads ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]


def get_thread(thread_id):
    with _connect() as conn:
        row = conn.execute("SELECT * FROM chat_threads WHERE id = ?", (thread_id,)).fetchone()
        if not row:
            return None
        messages = conn.execute(
            "SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC", (thread_id,)
        ).fetchall()
        thread = dict(row)
        thread["messages"] = [dict(m) for m in messages]
        return thread


def rename_thread(thread_id, title):
    with _connect() as conn:
        cur = conn.execute(
            "UPDATE chat_threads SET title = ?, updated_at = ? WHERE id = ?",
            (title, time.time(), thread_id),
        )
        conn.commit()
        return cur.rowcount > 0


def delete_thread(thread_id):
    with _connect() as conn:
        cur = conn.execute("DELETE FROM chat_threads WHERE id = ?", (thread_id,))
        conn.commit()
        return cur.rowcount > 0


def clear_all_threads():
    with _connect() as conn:
        conn.execute("DELETE FROM chat_threads")
        conn.commit()


def add_message(thread_id, role, content):
    msg_id = str(uuid.uuid4())
    now = time.time()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO chat_messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (msg_id, thread_id, role, content, now),
        )
        conn.execute("UPDATE chat_threads SET updated_at = ? WHERE id = ?", (now, thread_id))
        conn.commit()
    return {"id": msg_id, "thread_id": thread_id, "role": role, "content": content, "created_at": now}


# ─── Generated report library ───────────────────────────────────────────────

def save_report(content_bytes, filename, framework, format, templates=None, year=None, plant=None, fy=None):
    report_id = str(uuid.uuid4())
    storage_path = os.path.join(REPORTS_DIR, f"{report_id}_{filename}")
    with open(storage_path, "wb") as f:
        f.write(content_bytes)
    now = time.time()
    with _connect() as conn:
        conn.execute(
            """INSERT INTO generated_reports
               (id, filename, framework, format, templates, year, plant, fy, storage_path, size_bytes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (report_id, filename, framework, format,
             ",".join(templates) if templates else None,
             str(year) if year is not None else None, plant, fy,
             storage_path, len(content_bytes), now),
        )
        conn.commit()
    return report_id


def list_reports():
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM generated_reports ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def get_report(report_id):
    with _connect() as conn:
        row = conn.execute("SELECT * FROM generated_reports WHERE id = ?", (report_id,)).fetchone()
        return dict(row) if row else None


def delete_report(report_id):
    report = get_report(report_id)
    if not report:
        return False
    try:
        os.remove(report["storage_path"])
    except OSError:
        pass
    with _connect() as conn:
        cur = conn.execute("DELETE FROM generated_reports WHERE id = ?", (report_id,))
        conn.commit()
        return cur.rowcount > 0


# ─── Alert threshold configuration ──────────────────────────────────────────

_DEFAULT_THRESHOLDS = {"low": 12.0, "medium": 25.0, "high": 50.0}

def get_alert_config():
    """Returns global defaults plus any per-domain overrides."""
    with _connect() as conn:
        rows = conn.execute("SELECT domain, low_pct, medium_pct, high_pct FROM alert_config").fetchall()
    domains = {
        r["domain"]: {"low": r["low_pct"], "medium": r["medium_pct"], "high": r["high_pct"]}
        for r in rows
    }
    return {"defaults": _DEFAULT_THRESHOLDS, "domains": domains}


def get_domain_thresholds(domain: str):
    """Returns effective thresholds for a domain (custom override or global defaults)."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT low_pct, medium_pct, high_pct FROM alert_config WHERE domain = ?", (domain,)
        ).fetchone()
    if row:
        return {"low": row["low_pct"], "medium": row["medium_pct"], "high": row["high_pct"]}
    return dict(_DEFAULT_THRESHOLDS)


def save_domain_thresholds(domain: str, low_pct: float, medium_pct: float, high_pct: float):
    with _connect() as conn:
        conn.execute("""
            INSERT INTO alert_config (domain, low_pct, medium_pct, high_pct)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(domain) DO UPDATE
            SET low_pct = excluded.low_pct,
                medium_pct = excluded.medium_pct,
                high_pct = excluded.high_pct
        """, (domain, low_pct, medium_pct, high_pct))
        conn.commit()


def reset_domain_thresholds(domain: str):
    with _connect() as conn:
        conn.execute("DELETE FROM alert_config WHERE domain = ?", (domain,))
        conn.commit()


# ─── Alert acknowledgements ──────────────────────────────────────────────────

def upsert_alert_ack(alert_id: str, status: str, note: str = ""):
    now = time.time()
    with _connect() as conn:
        conn.execute("""
            INSERT INTO alert_acks (alert_id, status, note, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(alert_id) DO UPDATE
            SET status = excluded.status,
                note = excluded.note,
                updated_at = excluded.updated_at
        """, (alert_id, status, note, now))
        conn.commit()


def delete_alert_ack(alert_id: str):
    with _connect() as conn:
        conn.execute("DELETE FROM alert_acks WHERE alert_id = ?", (alert_id,))
        conn.commit()


def list_alert_acks():
    """Returns a dict keyed by alert_id for O(1) lookup when decorating anomaly lists."""
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM alert_acks").fetchall()
    return {r["alert_id"]: dict(r) for r in rows}
