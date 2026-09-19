import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Database, 
  Search, 
  Filter, 
  ExternalLink, 
  X, 
  Activity, 
  RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  analyzeDataset, 
  analyzeSampleDataset, 
  getSampleDatasetDownloadUrl 
} from '../services/api';

const SEVERITY_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
  NORMAL: '#10b981'
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function DatasetAnalysis({ onInspectAccount }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedRecord, setInspectedRecord] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a valid CSV file.');
        return;
      }
      setFile(selected);
      setFileName(selected.name);
      setFileSize((selected.size / 1024).toFixed(1) + ' KB');
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.endsWith('.csv')) {
        setError('Please drop a valid CSV file.');
        return;
      }
      setFile(dropped);
      setFileName(dropped.name);
      setFileSize((dropped.size / 1024).toFixed(1) + ' KB');
      setError(null);
    }
  };

  const handleAnalyzeUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeDataset(file);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Batch dataset analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    setFileName('sample_ethereum_dataset.csv (Benchmark 100 Accounts)');
    setFileSize('48.2 KB');
    try {
      const data = await analyzeSampleDataset();
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load sample dataset.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!results || !results.records) return;
    const headers = [
      'Account_ID',
      'Prediction',
      'Ensemble_Score',
      'Severity',
      'Recommended_Action',
      'Top_Driver',
      'KMeans_Score',
      'DBSCAN_Score',
      'HDBSCAN_Score',
      'IsoForest_Score',
      'OneClassSVM_Score',
      'Autoencoder_Score',
      'GAN_Score',
      'Graph_Score'
    ];

    const rows = results.records.map((r) => [
      `"${r.account_id}"`,
      r.prediction,
      r.ensemble_score,
      r.severity,
      `"${r.recommended_action}"`,
      `"${r.top_driver}"`,
      r.model_scores?.kmeans ?? '',
      r.model_scores?.dbscan ?? '',
      r.model_scores?.hdbscan ?? '',
      r.model_scores?.isolation_forest ?? '',
      r.model_scores?.one_class_svm ?? '',
      r.model_scores?.autoencoder ?? '',
      r.model_scores?.gan ?? '',
      r.model_scores?.graph ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analyzed_threat_detection_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = results?.records?.filter((rec) => {
    const matchesSearch = rec.account_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.top_driver.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'threats') return rec.prediction === 'THREAT';
    if (activeFilter === 'high') return rec.severity === 'HIGH';
    if (activeFilter === 'normal') return rec.prediction === 'NORMAL';
    return true;
  }) || [];

  const severityPieData = results?.summary ? [
    { name: 'Normal', value: results.summary.severity_breakdown.NORMAL },
    { name: 'Low Risk', value: results.summary.severity_breakdown.LOW },
    { name: 'Medium Threat', value: results.summary.severity_breakdown.MEDIUM },
    { name: 'High Threat', value: results.summary.severity_breakdown.HIGH }
  ].filter(d => d.value > 0) : [];

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileSpreadsheet size={20} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            Dataset Batch Audit & Abnormal Transaction Analysis
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
          Ingest multi-account Ethereum transaction CSV files or test benchmark datasets. Executes vectorized 8-model inference with zero retraining to isolate abnormal profiles and enforce decentralized mitigation.
        </p>
      </div>

      {/* Upload and Control Panel */}
      <div className="card" style={{ padding: '1.75rem', background: 'var(--card-bg)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center'
        }}>
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: '2px dashed rgba(6, 182, 212, 0.35)',
              borderRadius: '12px',
              padding: '1.75rem',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.6)',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease'
            }}
            onClick={() => document.getElementById('csv-file-input').click()}
          >
            <input 
              id="csv-file-input"
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            <UploadCloud size={36} color="#06b6d4" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
              Drag and drop your transaction CSV here
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Supports standard 16 features or Kaggle / Etherscan format
            </div>

            {fileName && (
              <div style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                color: '#38bdf8'
              }}>
                <FileSpreadsheet size={15} />
                <span>{fileName} ({fileSize})</span>
              </div>
            )}
          </div>

          {/* Action Buttons & Helpers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.1rem' }}>
              Quick Evaluation & Presets
            </div>
            
            <button
              className="btn btn-primary"
              onClick={handleAnalyzeUpload}
              disabled={!file || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.92rem'
              }}
            >
              {loading ? <RefreshCw size={17} className="spin" /> : <Play size={17} />}
              {loading ? 'Evaluating 8 Models in Parallel...' : 'Analyze Uploaded CSV Dataset'}
            </button>

            <button
              className="btn"
              onClick={handleLoadSample}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.92rem',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              <Database size={17} />
              Load Sample 100-Account Benchmark
            </button>

            <a
              href={getSampleDatasetDownloadUrl()}
              download="sample_ethereum_dataset.csv"
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.88rem',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#94a3b8',
                border: '1px solid var(--border-color)',
                textDecoration: 'none'
              }}
            >
              <Download size={16} />
              Download Benchmark CSV Template
            </a>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="card" style={{
          padding: '3rem',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          <RefreshCw size={42} color="#06b6d4" className="spin" style={{ margin: '0 auto 1.25rem auto' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9' }}>
            Vectorized Anomaly Inference in Progress...
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', maxWidth: '500px', margin: '0 auto' }}>
            Executing RobustScaler transformation, evaluating all 8 pre-trained models (K-Means, DBSCAN, HDBSCAN, Isolation Forest, One-Class SVM, Autoencoder, GAN, Graph Affinity), and calculating weighted ensemble thresholding.
          </p>
        </div>
      )}

      {/* Results Dashboard */}
      {results && !loading && (
        <>
          {/* KPI Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Analyzed
                </span>
                <Database size={18} color="#06b6d4" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc' }}>
                {results.summary.total_records}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                Accounts / Transactions Processed
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Abnormal Accounts
                </span>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>
                {results.summary.threat_count}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>
                {results.summary.threat_percentage}% Threat Ratio
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Normal Accounts
                </span>
                <CheckCircle size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
                {results.summary.normal_count}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 600 }}>
                {(100 - results.summary.threat_percentage).toFixed(1)}% Normal Ratio
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Average Threat Score
                </span>
                <ShieldAlert size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {results.summary.average_threat_score.toFixed(4)}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                Threshold: &tau; = {results.summary.calibrated_threshold}
              </div>
            </div>
          </div>

          {/* Ground Truth Validation Metrics Banner (If Present) */}
          {results.summary.validation_metrics && (
            <div className="card" style={{
              padding: '1.25rem 1.75rem',
              background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700 }}>
                    Ground Truth Validation (FLAG Detected)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
                    Zero-Retraining Performance Against Labeled Ground Truth
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Recall</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                      {results.summary.validation_metrics.recall}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>F1-Score</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      {results.summary.validation_metrics.f1_score}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Accuracy</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                      {results.summary.validation_metrics.accuracy}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Precision</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                      {results.summary.validation_metrics.precision}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Analytics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Anomaly Score Distribution */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 1rem 0' }}>
                Anomaly Score Distribution
              </h3>
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.summary.score_distribution}>
                    <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} 
                      labelStyle={{ color: '#38bdf8' }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 1rem 0' }}>
                Severity Classification
              </h3>
              <div style={{ height: '220px', display: 'flex', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {severityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Anomaly Drivers */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 1rem 0' }}>
                Primary Driving Anomaly Factors
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {results.summary.top_drivers.map((drv, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1' }}>{drv.driver}</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{drv.percentage}% ({drv.count})</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${drv.percentage}%`,
                        background: 'linear-gradient(90deg, #06b6d4, #ef4444)',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Records Table and Filter Controls */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${activeFilter === 'all' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveFilter('all')}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                >
                  All ({results.summary.total_records})
                </button>
                <button
                  className={`btn ${activeFilter === 'threats' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveFilter('threats')}
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.4rem 0.85rem',
                    background: activeFilter === 'threats' ? undefined : 'rgba(239, 68, 68, 0.1)',
                    color: activeFilter === 'threats' ? undefined : '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  Abnormal Threats ({results.summary.threat_count})
                </button>
                <button
                  className={`btn ${activeFilter === 'high' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveFilter('high')}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                >
                  Critical Severity ({results.summary.severity_breakdown.HIGH})
                </button>
                <button
                  className={`btn ${activeFilter === 'normal' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveFilter('normal')}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                >
                  Normal Profiles ({results.summary.normal_count})
                </button>
              </div>

              {/* Search & Export */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search address or trigger..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '0.45rem 0.75rem 0.45rem 2rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.82rem',
                      width: '210px'
                    }}
                  />
                </div>

                <button
                  className="btn"
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.82rem',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}
                >
                  <Download size={14} />
                  Export Predictions (CSV)
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>#</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Account Address</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Threat Score</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Verdict</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Severity</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Primary Anomaly Driver</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Recommended Action</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 100).map((r) => {
                    const isThreat = r.prediction === 'THREAT';
                    return (
                      <tr 
                        key={r.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          {r.id}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                          {r.account_id}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: isThreat ? '#ef4444' : '#10b981' }}>
                          {r.ensemble_score.toFixed(4)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isThreat ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isThreat ? '#f87171' : '#34d399',
                            border: `1px solid ${isThreat ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}>
                            {r.prediction}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: SEVERITY_COLORS[r.severity] || '#94a3b8',
                            background: `${SEVERITY_COLORS[r.severity] || '#94a3b8'}15`
                          }}>
                            {r.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1' }}>
                          {r.top_driver}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#94a3b8' }}>
                          {r.recommended_action}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <button
                            onClick={() => setInspectedRecord(r)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#38bdf8',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            title="Inspect Account Diagnostic Telemetry"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRecords.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No transaction records matched the selected filter or search term.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Record Inspection Modal */}
      {inspectedRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="card" style={{
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(6, 182, 212, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Activity size={20} color="#06b6d4" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                  Account Deep Diagnostic Inspection
                </h3>
              </div>
              <button 
                onClick={() => setInspectedRecord(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Account Address</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#38bdf8', fontWeight: 600 }}>
                {inspectedRecord.account_id}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                <span>Ensemble Score: <b style={{ color: inspectedRecord.prediction === 'THREAT' ? '#ef4444' : '#10b981' }}>{inspectedRecord.ensemble_score.toFixed(4)}</b></span>
                <span>Verdict: <b>{inspectedRecord.prediction}</b></span>
                <span>Severity: <b style={{ color: SEVERITY_COLORS[inspectedRecord.severity] }}>{inspectedRecord.severity}</b></span>
              </div>
            </div>

            {/* 8-Model Normalized Scores */}
            <h4 style={{ fontSize: '0.92rem', color: '#f1f5f9', margin: '1rem 0 0.65rem 0' }}>
              8-Model Anomaly Breakdown
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
              {Object.entries(inspectedRecord.model_scores || {}).map(([model, score]) => (
                <div key={model} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                    <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{model.replace('_', ' ')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: score > 0.42 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      {score.toFixed(4)}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, score * 100)}%`,
                      background: score > 0.42 ? '#ef4444' : '#10b981'
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Behavioral Features */}
            <h4 style={{ fontSize: '0.92rem', color: '#f1f5f9', margin: '1.25rem 0 0.65rem 0' }}>
              Input Behavioral Telemetry Features
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem',
              maxHeight: '180px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '6px'
            }}>
              {Object.entries(inspectedRecord.features || {}).map(([feat, val]) => (
                <div key={feat} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', padding: '0.25rem 0' }}>
                  <span style={{ color: '#94a3b8' }}>{feat}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9', fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary"
                onClick={() => setInspectedRecord(null)}
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
