import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  RotateCcw,
  CheckCircle2,
  Globe,
  HelpCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { predictAccount, getPresets, fetchLiveAccount } from '../services/api';

export default function AccountAnalysis({ onThreatSelect }) {
  const [formData, setFormData] = useState({
    account_id: '0x71C93...B491a',
    Avg_min_between_sent: 4820.5,
    Avg_min_between_rec: 3940.1,
    Active_Span_Mins: 248100.0,
    Sent_tnx: 28.0,
    Received_tnx: 35.0,
    Created_Contracts: 0.0,
    Uniq_Rec_Addr: 18.0,
    Uniq_Sent_Addr: 14.0,
    Avg_Val_Rec: 0.82,
    Avg_Val_Sent: 0.71,
    Total_ETH_Rec: 28.7,
    Total_ETH_Sent: 19.88,
    Ether_Balance: 8.82,
    Total_ERC20_tnx: 12.0,
    ERC20_Total_Rec: 1200.0,
    ERC20_Total_Sent: 450.0
  });

  const [liveAddressInput, setLiveAddressInput] = useState('');
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveSourceInfo, setLiveSourceInfo] = useState(null);

  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState('retail_user');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const data = await getPresets();
        setPresets(data);
      } catch (err) {
        console.error('Failed to load presets', err);
      }
    };
    loadPresets();
  }, []);

  const handlePresetSelect = (preset) => {
    setActivePreset(preset.id);
    setFormData(preset.data);
    setLiveSourceInfo(null);
    setResult(null);
    setError(null);
  };

  const handleLiveFetch = async (targetAddress) => {
    const addr = targetAddress || liveAddressInput;
    if (!addr || !addr.startsWith('0x')) {
      setError('Please enter a valid Ethereum address starting with 0x (42 characters).');
      return;
    }
    setFetchingLive(true);
    setError(null);
    try {
      const res = await fetchLiveAccount(addr);
      if (res.success) {
        setFormData(res.features);
        setLiveSourceInfo({
          source: res.source,
          label: res.label
        });
        setActivePreset(null);
        // Automatically run prediction on fetched live data
        setLoading(true);
        const predRes = await predictAccount(res.features);
        setResult(predRes);
      }
    } catch (err) {
      setError('Failed to fetch on-chain data for this address. Network timeout or invalid RPC.');
    } finally {
      setFetchingLive(false);
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'account_id' ? value : parseFloat(value) || 0
    }));
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await predictAccount(formData);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Model scores for horizontal bar chart
  const modelChartData = result ? [
    { model: 'K-Means', score: result.model_scores.kmeans },
    { model: 'DBSCAN', score: result.model_scores.dbscan },
    { model: 'HDBSCAN', score: result.model_scores.hdbscan },
    { model: 'IsoForest', score: result.model_scores.isolation_forest },
    { model: 'One-Class SVM', score: result.model_scores.one_class_svm },
    { model: 'Autoencoder', score: result.model_scores.autoencoder },
    { model: 'GAN (AnoGAN)', score: result.model_scores.gan },
    { model: 'Graph Model', score: result.model_scores.graph },
  ] : [];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="page-title">
          <Search size={26} color="#06b6d4" />
          Account Behavioral Profiler
        </h2>
        <p className="page-subtitle">
          Query live on-chain Ethereum addresses or evaluate custom behavioral feature vectors
        </p>
      </div>

      {/* LIVE ETHEREUM ON-CHAIN FETCHER BAR */}
      <div className="cyber-card" style={{
        marginBottom: '1.5rem',
        padding: '1.25rem',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(22, 32, 58, 0.95) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} color="#06b6d4" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              LIVE ETHEREUM ON-CHAIN QUERY (ETH MAINNET RPC / ETHERSCAN)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '0.2rem', display: 'flex', alignItems: 'center' }}>QUICK ON-CHAIN TARGETS:</span>
            <button
              onClick={() => {
                setLiveAddressInput('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
                handleLiveFetch('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
              }}
              style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            >
              Vitalik (vitalik.eth)
            </button>
            <button
              onClick={() => {
                setLiveAddressInput('0x722122dF12D450404793b52d7e7742507309569B');
                handleLiveFetch('0x722122dF12D450404793b52d7e7742507309569B');
              }}
              style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            >
              Tornado Cash Router
            </button>
            <button
              onClick={() => {
                setLiveAddressInput('0xb66cd966670d962c227b3eaba30a872dbfb995db');
                handleLiveFetch('0xb66cd966670d962c227b3eaba30a872dbfb995db');
              }}
              style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            >
              Euler Flash Exploiter
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="cyber-input"
            placeholder="Paste any live Ethereum wallet address (0x...)..."
            value={liveAddressInput}
            onChange={(e) => setLiveAddressInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            onClick={() => handleLiveFetch()}
            disabled={fetchingLive}
            style={{ padding: '0.65rem 1.25rem' }}
          >
            {fetchingLive ? <RotateCcw className="animate-spin" size={16} /> : <Zap size={16} />}
            {fetchingLive ? 'Querying Blockchain...' : 'Fetch Live & Analyze'}
          </button>
        </div>

        {liveSourceInfo && (
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={14} color="#34d399" />
            <span>{liveSourceInfo.label} &bull; Verified via {liveSourceInfo.source}</span>
          </div>
        )}
      </div>

      {/* Preset Selector Bar */}
      <div className="cyber-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={18} color="#06b6d4" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>
              SYNTHETIC ARCHETYPE PRESETS:
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  background: activePreset === p.id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(28, 37, 65, 0.6)',
                  border: activePreset === p.id ? '1px solid #06b6d4' : '1px solid #233256',
                  color: activePreset === p.id ? '#06b6d4' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-2">
        {/* Form Card */}
        <div className="cyber-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="#06b6d4" />
            Account Behavioral Vector (16 Features)
          </h3>

          <form onSubmit={handleAnalyze}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                ACCOUNT IDENTIFIER (0x...)
              </label>
              <input
                type="text"
                className="cyber-input"
                value={formData.account_id}
                onChange={(e) => handleInputChange('account_id', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Avg Min Between Sent</label>
                <input type="number" step="any" className="cyber-input" value={formData.Avg_min_between_sent} onChange={e => handleInputChange('Avg_min_between_sent', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Avg Min Between Rec</label>
                <input type="number" step="any" className="cyber-input" value={formData.Avg_min_between_rec} onChange={e => handleInputChange('Avg_min_between_rec', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Active Lifespan (Mins)</label>
                <input type="number" step="any" className="cyber-input" value={formData.Active_Span_Mins} onChange={e => handleInputChange('Active_Span_Mins', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Ether Balance (ETH)</label>
                <input type="number" step="any" className="cyber-input" value={formData.Ether_Balance} onChange={e => handleInputChange('Ether_Balance', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Sent Tnx Count</label>
                <input type="number" className="cyber-input" value={formData.Sent_tnx} onChange={e => handleInputChange('Sent_tnx', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Received Tnx Count</label>
                <input type="number" className="cyber-input" value={formData.Received_tnx} onChange={e => handleInputChange('Received_tnx', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Unique Sent Addresses</label>
                <input type="number" className="cyber-input" value={formData.Uniq_Sent_Addr} onChange={e => handleInputChange('Uniq_Sent_Addr', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Unique Rec Addresses</label>
                <input type="number" className="cyber-input" value={formData.Uniq_Rec_Addr} onChange={e => handleInputChange('Uniq_Rec_Addr', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Total ETH Sent</label>
                <input type="number" step="any" className="cyber-input" value={formData.Total_ETH_Sent} onChange={e => handleInputChange('Total_ETH_Sent', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Total ETH Rec</label>
                <input type="number" step="any" className="cyber-input" value={formData.Total_ETH_Rec} onChange={e => handleInputChange('Total_ETH_Rec', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Total ERC-20 Tnxs</label>
                <input type="number" className="cyber-input" value={formData.Total_ERC20_tnx} onChange={e => handleInputChange('Total_ERC20_tnx', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>ERC-20 Total Sent</label>
                <input type="number" step="any" className="cyber-input" value={formData.ERC20_Total_Sent} onChange={e => handleInputChange('ERC20_Total_Sent', e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? <RotateCcw className="animate-spin" size={18} /> : <Zap size={18} />}
                {loading ? 'Evaluating 8 ML Models...' : 'Run Behavioral Analysis'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Card */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: result?.prediction === 'THREAT' ? '#ef4444' : '#10b981' }} />
            Inference Telemetry & Model Verdict
          </h3>

          {error && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {!result && !loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '3rem 1rem', textAlign: 'center' }}>
              <Search size={48} strokeWidth={1.2} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>Ready for Behavioral Evaluation</div>
              <p style={{ fontSize: '0.8rem', maxWidth: '300px', marginTop: '0.25rem' }}>
                Query a live Ethereum address or choose a preset and click "Run Behavioral Analysis".
              </p>
            </div>
          )}

          {result && (
            <div>
              {/* Verdict Header Banner */}
              <div style={{
                padding: '1.25rem',
                borderRadius: '10px',
                background: result.prediction === 'THREAT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${result.prediction === 'THREAT' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {result.prediction === 'THREAT' ? (
                    <ShieldAlert size={32} color="#ef4444" />
                  ) : (
                    <ShieldCheck size={32} color="#10b981" />
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      VERDICT
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: result.prediction === 'THREAT' ? '#f87171' : '#34d399' }}>
                      {result.prediction}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>SEVERITY</div>
                  <span className={`badge badge-${result.severity.toLowerCase()}`} style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    {result.severity} RISK
                  </span>
                </div>
              </div>

              {/* Anomaly Score vs Threshold */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>ENSEMBLE SCORE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {result.ensemble_score.toFixed(4)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>DECISION THRESHOLD</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                    {result.threshold.toFixed(4)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>CONFIDENCE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Horizontal Bar Chart of 8 Model Scores */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    INDIVIDUAL MODEL SCORES (8 MODELS)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                    Threshold: {result.threshold}
                  </span>
                </div>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelChartData} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 1.0]} stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="model" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={85} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        formatter={(val) => [val.toFixed(4), 'Score']}
                        contentStyle={{ background: '#16203a', border: '1px solid #233256', borderRadius: '8px', color: '#fff' }}
                      />
                      <ReferenceLine x={result.threshold} stroke="#ef4444" strokeDasharray="3 3" />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {modelChartData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.score >= result.threshold ? '#ef4444' : '#06b6d4'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* EXPLAINABILITY ATTRIBUTION BREAKDOWN (XAI) */}
              {result.feature_attributions && result.feature_attributions.length > 0 && (
                <div style={{ marginBottom: '1.25rem', background: 'rgba(22, 32, 58, 0.6)', borderRadius: '8px', border: '1px solid #233256', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <HelpCircle size={14} />
                    EXPLAINABILITY ATTRIBUTION: TOP DRIVING FACTORS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.feature_attributions.slice(0, 3).map((attr, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: attr.direction === 'THREAT_DRIVER' ? '#f87171' : '#34d399' }}>
                            {attr.direction === 'THREAT_DRIVER' ? '▲ ' : '▼ '} {attr.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                            Impact: {attr.impact_percent}%
                          </span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                          {attr.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action & Diagnostic Redirect */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: 'rgba(22, 32, 58, 0.9)',
                border: '1px solid #233256',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>AUTOMATED DEFENSIVE ACTION</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>
                    {result.recommended_action}
                  </div>
                </div>
                {result.prediction === 'THREAT' && (
                  <button
                    className="btn-secondary"
                    onClick={() => onThreatSelect(result)}
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.8rem' }}
                  >
                    View Diagnostics
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
