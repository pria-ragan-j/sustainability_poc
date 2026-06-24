import React, { useEffect, useState, useCallback } from 'react';
import { FileText, FileSpreadsheet, File, Download, Trash2 } from 'lucide-react';
import api from '../../api/client.js';

const FORMAT_ICON = { pdf: FileText, excel: FileSpreadsheet, csv: File };

function formatDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportLibraryPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api.listReportLibrary().then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id) => {
    await api.deleteLibraryReport(id).catch(() => {});
    refresh();
  };

  if (loading) return <div className="summary-loading">Loading report library…</div>;

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <FileText size={36} className="placeholder-icon" />
        <p className="placeholder-title">No reports generated yet. Use the Generate Report tab to create one.</p>
      </div>
    );
  }

  return (
    <div className="report-library-list">
      {reports.map((r) => {
        const Icon = FORMAT_ICON[r.format] || File;
        return (
          <div key={r.id} className="report-library-row">
            <Icon size={20} className="report-library-icon" />
            <div className="report-library-info">
              <span className="report-library-filename">{r.filename}</span>
              <span className="report-library-meta">
                {r.framework} · {r.format.toUpperCase()} · {formatSize(r.size_bytes)} · {formatDate(r.created_at)}
              </span>
            </div>
            <a className="report-library-action" href={api.downloadLibraryReportUrl(r.id)} title="Download">
              <Download size={16} />
            </a>
            <button className="report-library-action" onClick={() => handleDelete(r.id)} title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
