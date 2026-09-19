import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Activity, 
  Flame, 
  TrendingUp,
  AlertOctagon,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area 
} from 'recharts';
import StatCard from '../components/StatCard';
import { getDashboardStatistics } from '../services/api';

export default function Dashboard({ onNavigateToAnalysis }) {
  const [stats, setStats] = useState({
    total_analyzed: 0,
    normal_accounts: 0,
    threats_detected: 0,
    low_threats: 0,
    medium_threats: 0,
    high_threats: 0,
    average_anomaly_score: 0.0,
    detection_rate: '0%',
    recent_activity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStatistics();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const pieData = [
    { name: 'Normal Accounts', value: stats.normal_accounts, color: '#10b981' },
    { name: 'Threats Detected', value: stats.threats_detected, color: '#ef4444' }
  ];

  const severityData = [
    { name: 'Normal', count: stats.normal_accounts, color: '#10b981' },
    { name: 'Low Risk', count: stats.low_threats, color: '#f59e0b' },
    { name: 'Medium Risk', count: stats.medium_threats, color: '#f97316' },
    { name: 'High Risk', count: stats.high_threats, color: '#ef4444' }
  ];

  const activityData = stats.recent_activity.map((item, idx) => ({
    time: item.timestamp.split(' ')[1] || `T-${idx}`,
    score: item.ensemble_score,
    threshold: 0.42
  }));

  const modelComparisonData = [
    { model: 'Autoencoder', f1: 100.0, color: '#06b6d4' },
    { model: 'One-Class SVM', f1: 100.0, color: '#06b6d4' },
    { model: 'GAN (AnoGAN)', f1: 99.45, color: '#3b82f6' },
    { model: 'K-Means', f1: 96.77, color: '#8b5cf6' },
    { model: 'DBSCAN', f1: 94.12, color: '#10b981' },
    { model: 'HDBSCAN', f1: 92.97, color: '#14b8a6' },
    { model: 'IsoForest', f1: 83.50, color: '#f59e0b' },
    { model: 'Ensemble', f1: 99.45, color: '#ec4899' }
  ];

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">
            <Activity size={26} color="#06b6d4" />
            Threat Intelligence Dashboard
          </h2>
          <p className="page-subtitle">
            Real-time behavioral telemetry, model scores, and automated decentralized defenses
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={onNavigateToAnalysis}
        >
          <Flame size={16} />
          Analyze New Account
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid-5" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Accounts Analyzed"
          value={stats.total_analyzed}
          subtitle="Processed via 8-model suite"
          icon={Users}
          color="#3b82f6"
        />
        <StatCard
          title="Threats Detected"
          value={stats.threats_detected}
          subtitle={`Detection Rate: ${stats.detection_rate}`}
          icon={ShieldAlert}
          color="#ef4444"
          badgeText="INTERCEPTED"
          badgeType="high"
        />
        <StatCard
          title="Normal Accounts"
          value={stats.normal_accounts}
          subtitle="Conforms to verified profile"
          icon={ShieldCheck}
          color="#10b981"
          badgeText="AUTHORIZED"
          badgeType="normal"
        />
        <StatCard
          title="High-Risk Threats"
          value={stats.high_threats}
          subtitle="Circuit breaker triggered"
          icon={AlertOctagon}
          color="#f43f5e"
          badgeText="CRITICAL"
          badgeType="high"
        />
        <StatCard
          title="Avg Anomaly Score"
          value={stats.average_anomaly_score.toFixed(3)}
          subtitle="Calibrated Threshold: 0.420"
          icon={TrendingUp}
          color="#8b5cf6"
        />
      </div>

      {/* Chart Grid Row 1 */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Normal vs Threat Donut */}
        <div className="cyber-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
            Network Account Distribution
          </h3>
          <div style={{ height: '260px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#16203a', border: '1px solid #233256', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '40%' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  Normal Accounts
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {stats.normal_accounts}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  Threats Detected
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {stats.threats_detected}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Threat Severity Distribution */}
        <div className="cyber-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            Threat Severity Breakdown
          </h3>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#16203a', border: '1px solid #233256', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Grid Row 2 */}
      <div className="grid-2">
        {/* Real-Time Telemetry Trend */}
        <div className="cyber-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
            Recent Anomaly Scores vs Calibrated Threshold (0.42)
          </h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 1.0]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: '#16203a', border: '1px solid #233256', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#scoreGradient)" />
                <Area type="step" dataKey="threshold" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Performance Comparison F1 */}
        <div className="cyber-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ec4899' }} />
            Model F1-Score Benchmark (% on Test Split)
          </h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelComparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
                <YAxis dataKey="model" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(val) => [`${val}%`, 'F1-Score']}
                  contentStyle={{ background: '#16203a', border: '1px solid #233256', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="f1" radius={[0, 6, 6, 0]}>
                  {modelComparisonData.map((entry, index) => (
                    <Cell key={`f1-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
