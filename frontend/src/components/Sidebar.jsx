import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  FileSpreadsheet,
  AlertTriangle, 
  BarChart3, 
  History, 
  Network 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'dataset-analysis', label: 'Dataset Batch Audit', icon: FileSpreadsheet },
    { id: 'account-analysis', label: 'Account Analysis', icon: Search },
    { id: 'threat-details', label: 'Threat Diagnostics', icon: AlertTriangle },
    { id: 'model-performance', label: 'Model Performance', icon: BarChart3 },
    { id: 'threat-history', label: 'Threat Audit Log', icon: History },
    { id: 'blockchain-network', label: 'Blockchain Network', icon: Network },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{ padding: '1.5rem 1.25rem' }}>
        <div style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#64748b',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          marginBottom: '0.85rem'
        }}>
          Navigation Modules
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: isActive ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)' : 'transparent',
                  color: isActive ? '#06b6d4' : '#94a3b8',
                  border: isActive ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={isActive ? '#06b6d4' : '#94a3b8'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ marginTop: 'auto', padding: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{
          padding: '0.85rem',
          borderRadius: '8px',
          background: 'rgba(22, 32, 58, 0.5)',
          border: '1px solid #233256'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Zero-Leakage Architecture</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
            Normal profiles learned without label contamination. Models loaded once at startup.
          </div>
        </div>
      </div>
    </aside>
  );
}
