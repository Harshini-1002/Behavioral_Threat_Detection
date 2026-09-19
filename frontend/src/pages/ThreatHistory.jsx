import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck, 
  Clock,
  RotateCw
} from 'lucide-react';
import { getHistory } from '../services/api';

export default function ThreatHistory() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory(100);
      setHistory(data);
      setFilteredHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let result = history;
    if (searchTerm) {
      result = result.filter(item => 
        item.account_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (severityFilter !== 'ALL') {
      result = result.filter(item => 
        item.severity.toUpperCase() === severityFilter
      );
    }
    setFilteredHistory(result);
  }, [searchTerm, severityFilter, history]);

  const exportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = ["ID", "Account", "Timestamp", "Anomaly_Score", "Threshold", "Prediction", "Severity", "Confidence", "Action", "Status"];
    const rows = filteredHistory.map(h => [
      h.id,
      h.account_id,
      h.timestamp,
      h.ensemble_score,
      h.threshold,
      h.prediction,
      h.severity,
      h.confidence,
      `"${h.recommended_action}"`,
      h.response_status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `threat_telemetry_audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">
            <History size={26} color="#06b6d4" />
            Threat History & Audit Log
          </h2>
          <p className="page-subtitle">
            Immutable SQLite records of all behavioral evaluations and automated response statuses
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={fetchHistory} title="Refresh Records">
            <RotateCw size={16} />
            Refresh
          </button>
          <button className="btn-primary" onClick={exportCSV}>
            <Download size={16} />
            Export Audit Log (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              className="cyber-input"
              placeholder="Search by Ethereum account address (0x...)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: '420px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              SEVERITY:
            </span>
            {['ALL', 'NORMAL', 'LOW', 'MEDIUM', 'HIGH'].map(level => (
              <button
                key={level}
                onClick={() => setSeverityFilter(level)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: severityFilter === level ? 'rgba(6, 182, 212, 0.2)' : 'rgba(28, 37, 65, 0.6)',
                  border: severityFilter === level ? '1px solid #06b6d4' : '1px solid #233256',
                  color: severityFilter === level ? '#06b6d4' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="cyber-card" style={{ padding: '0.5rem 0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #233256', color: '#94a3b8', background: 'rgba(17, 24, 44, 0.5)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>ACCOUNT ADDRESS</th>
                <th style={{ padding: '0.85rem 1rem' }}>TIMESTAMP</th>
                <th style={{ padding: '0.85rem 1rem' }}>SCORE</th>
                <th style={{ padding: '0.85rem 1rem' }}>PREDICTION</th>
                <th style={{ padding: '0.85rem 1rem' }}>SEVERITY</th>
                <th style={{ padding: '0.85rem 1rem' }}>AUTOMATED ACTION</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No audit records match your search criteria.
                  </td>
                </tr>
              )}
              {filteredHistory.map((row) => {
                const isThreat = row.prediction === 'THREAT';
                return (
                  <tr 
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #1c294b',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.85rem 1.25rem', color: '#fff', fontWeight: 600 }}>
                      {row.account_id}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                      {row.timestamp}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: isThreat ? '#f87171' : '#34d399', fontWeight: 700 }}>
                      {row.ensemble_score.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge badge-${row.prediction.toLowerCase()}`}>
                        {row.prediction}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge badge-${row.severity.toLowerCase()}`}>
                        {row.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#fff' }}>
                      {row.recommended_action}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        color: row.response_status === 'EXECUTED' || row.response_status === 'LOGGED' ? '#34d399' : '#f87171',
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '4px'
                      }}>
                        {row.response_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
