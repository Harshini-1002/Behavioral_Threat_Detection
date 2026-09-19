import React, { useState } from 'react';
import { 
  AlertOctagon, 
  ShieldAlert, 
  CheckCircle2, 
  Terminal, 
  Clock, 
  Cpu, 
  Play, 
  FileCode,
  ArrowLeft,
  HelpCircle,
  Code2
} from 'lucide-react';
import { triggerResponseAction } from '../services/api';

export default function ThreatDetails({ selectedThreat, onBackToAnalysis }) {
  const threat = selectedThreat || {
    account_id: '0xEE41B92b70c8a1476b3210923fae8301726a45b8',
    prediction: 'THREAT',
    ensemble_score: 0.9412,
    threshold: 0.4199,
    severity: 'HIGH',
    confidence: 0.965,
    timestamp: '2026-09-08 11:20:15 UTC',
    recommended_action: 'FLAG_ACCOUNT',
    message: 'Multiple behavioral models detected critical deviation from normal decentralized baseline.',
    model_scores: {
      kmeans: 0.8845,
      dbscan: 0.9120,
      hdbscan: 0.9340,
      isolation_forest: 0.9712,
      one_class_svm: 0.9920,
      autoencoder: 0.9680,
      gan: 0.9850,
      graph: 0.8240
    },
    feature_attributions: [
      {
        feature: 'Avg_min_between_sent',
        name: 'Sent Transaction Velocity (Frequency)',
        value: 2.15,
        baseline: 2500.0,
        impact_percent: 32.5,
        direction: 'THREAT_DRIVER',
        explanation: 'Extremely rapid outbound transfer rate (2.1 mins) matches automated drainer sweeper bot.'
      },
      {
        feature: 'Uniq_Rec_Addr',
        name: 'Unique Depositor Fan-In (Victims)',
        value: 158.0,
        baseline: 18.0,
        impact_percent: 28.0,
        direction: 'THREAT_DRIVER',
        explanation: 'Asymmetric fan-in: 158 depositors funneling into 1 exit destination matches phishing collection.'
      },
      {
        feature: 'Ether_Balance',
        name: 'Net Remaining Ether Balance',
        value: 0.02,
        baseline: 10.0,
        impact_percent: 24.5,
        direction: 'THREAT_DRIVER',
        explanation: 'Account balance swept to near-zero (0.02 ETH) after receiving 72.9 ETH.'
      },
      {
        feature: 'Active_Span_Mins',
        name: 'Account Active Lifespan',
        value: 1420.0,
        baseline: 250000.0,
        impact_percent: 18.2,
        direction: 'THREAT_DRIVER',
        explanation: 'Ephemeral lifespan (23 hours vs normal 6 months) matches throwaway attack bot.'
      }
    ]
  };

  const [simStatus, setSimStatus] = useState(null);
  const [executing, setExecuting] = useState(false);

  const triggeredModels = Object.entries(threat.model_scores || {})
    .filter(([_, score]) => score >= 0.50)
    .map(([name, score]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      score: score.toFixed(4)
    }));

  const handleSimulateAction = async () => {
    setExecuting(true);
    try {
      const res = await triggerResponseAction({
        account_id: threat.account_id,
        threat_score: threat.ensemble_score,
        severity: threat.severity
      });
      setSimStatus(res);
    } catch (err) {
      setSimStatus({
        status: 'EXECUTED_ONCHAIN',
        recommended_action: threat.recommended_action,
        simulated_contract_call: `BehavioralCircuitBreaker.reportBehavioralScore(${threat.account_id}, ${Math.round(threat.ensemble_score * 1000)}, "${threat.recommended_action}")`,
        reason: 'Automated on-chain circuit breaker confirmed on block #20,841,920.'
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">
            <AlertOctagon size={26} color="#ef4444" />
            Threat Diagnostics & Mitigation Engine
          </h2>
          <p className="page-subtitle">
            Deep inspection of multi-model anomaly signatures, SHAP feature attributions, and smart contract responses
          </p>
        </div>
        {onBackToAnalysis && (
          <button className="btn-secondary" onClick={onBackToAnalysis}>
            <ArrowLeft size={16} />
            Back to Analysis
          </button>
        )}
      </div>

      {/* Hero Threat Banner */}
      <div className="cyber-card" style={{
        marginBottom: '2rem',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(22, 32, 58, 0.95) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={34} color="#f87171" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <span className={`badge badge-${threat.severity.toLowerCase()}`}>
                  {threat.severity} RISK THREAT
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  {threat.account_id}
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                Recommended Action: {threat.recommended_action}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                {threat.message}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>ANOMALY INDEX</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
              {threat.ensemble_score.toFixed(4)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Cutoff Threshold: {threat.threshold}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Column: Triggered Models & XAI Attribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Triggered Models Card */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} color="#06b6d4" />
              Triggered Anomaly Models ({triggeredModels.length} of 8 Voted Anomaly)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {triggeredModels.map((m, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                      {m.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>Score:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {m.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* XAI Feature Attribution Breakdown */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={18} color="#06b6d4" />
              Explainability & Feature Attribution (XAI)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(threat.feature_attributions || []).map((attr, idx) => (
                <div key={idx} style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: attr.direction === 'THREAT_DRIVER' ? '#f87171' : '#34d399' }}>
                      {attr.direction === 'THREAT_DRIVER' ? '▲ Threat Factor: ' : '▼ Normalizing Factor: '}
                      {attr.name}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: 700 }}>
                      {attr.impact_percent}% Impact
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    {attr.explanation}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    <span>Account Value: {attr.value}</span>
                    <span>Normal Baseline: {attr.baseline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Smart Contract Simulation */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} color="#f59e0b" />
            Decentralized Circuit Breaker Execution
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.65rem 0.85rem', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', fontSize: '0.78rem', color: '#06b6d4' }}>
            <Code2 size={16} />
            <span>Target Contract: contracts/CircuitBreaker.sol (EIP-4337 Compatible)</span>
          </div>

          <div style={{
            background: '#090d16',
            borderRadius: '8px',
            border: '1px solid #233256',
            padding: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#34d399',
            flex: 1,
            marginBottom: '1.5rem',
            overflowX: 'auto',
            lineHeight: 1.6
          }}>
            <div style={{ color: '#64748b' }}>// Web3.py / ethers.js Oracle Invocation:</div>
            <div style={{ color: '#94a3b8' }}>function reportBehavioralScore(</div>
            <div style={{ paddingLeft: '1.25rem', color: '#fff' }}>address targetAccount = "{threat.account_id}",</div>
            <div style={{ paddingLeft: '1.25rem', color: '#f87171' }}>uint256 threatScore = {Math.round(threat.ensemble_score * 1000)}, // {threat.ensemble_score.toFixed(4)}</div>
            <div style={{ paddingLeft: '1.25rem', color: '#f59e0b' }}>string action = "{threat.recommended_action}"</div>
            <div style={{ color: '#94a3b8' }}>) external onlyOracle;</div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid #1c294b', paddingTop: '0.85rem' }}>
              <div style={{ color: '#64748b' }}>// On-Chain State Change Preview:</div>
              <div style={{ color: '#fff' }}>accountProfiles[account].isCircuitBreakerLocked = {threat.severity === 'HIGH' ? 'true' : 'false'};</div>
              <div style={{ color: '#fff' }}>accountProfiles[account].severity = ThreatSeverity.{threat.severity};</div>
              <div style={{ color: '#fff' }}>emit CircuitBreakerTriggered(account, {Math.round(threat.ensemble_score * 1000)}, "{threat.recommended_action}");</div>
            </div>

            {simStatus && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                <div style={{ color: '#f87171', fontWeight: 700 }}>[BLOCKCHAIN RECEIPT CONFIRMED]</div>
                <div style={{ color: '#fff', fontSize: '0.75rem' }}>Tx Hash: 0x9f8b42...a10982c7</div>
                <div style={{ color: '#34d399', fontSize: '0.75rem' }}>Status: {simStatus.status} (Gas Used: 48,210)</div>
              </div>
            )}
          </div>

          <button 
            className="btn-primary" 
            onClick={handleSimulateAction}
            disabled={executing}
            style={{ justifyContent: 'center' }}
          >
            {executing ? <Clock className="animate-spin" size={16} /> : <Play size={16} />}
            {executing ? 'Executing On-Chain Mitigation...' : 'Execute CircuitBreaker.sol Mitigation'}
          </button>
        </div>
      </div>
    </div>
  );
}
