import React, { useState, useEffect } from 'react';
import { Shield, Activity, Wifi, CheckCircle2, Cpu, UserCheck, LogOut } from 'lucide-react';
import { checkHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab }) {
  const { user, logout } = useAuth();
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [isOnline, setIsOnline] = useState(false);
  const [modelsCount, setModelsCount] = useState(8);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const verifyHealth = async () => {
      try {
        const data = await checkHealth();
        if (data.status === 'HEALTHY') {
          setIsOnline(true);
          setServerStatus('SYSTEM ACTIVE');
          setModelsCount(data.models_count || 8);
        }
      } catch (err) {
        setIsOnline(false);
        setServerStatus('OFFLINE');
      }
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      background: 'rgba(17, 24, 44, 0.95)',
      borderBottom: '1px solid #233256',
      backdropFilter: 'blur(12px)',
      padding: '0.85rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
        }}>
          <Shield size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            BEHAVIORAL THREAT DETECTION
            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)', fontFamily: 'var(--font-mono)' }}>
              v2.2 &bull; MONGODB
            </span>
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
            AI-Powered Ethereum Network Security &bull; Distributed Ledger Defense
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '8px',
          background: 'rgba(22, 32, 58, 0.7)',
          border: '1px solid #233256',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem'
        }}>
          <Cpu size={14} color="#06b6d4" />
          <span style={{ color: '#94a3b8' }}>MODELS:</span>
          <span style={{ color: '#06b6d4', fontWeight: 700 }}>{modelsCount} ACTIVE</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '8px',
          background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOnline ? '#10b981' : '#ef4444',
            boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444'
          }} />
          <span style={{ color: isOnline ? '#34d399' : '#f87171', fontWeight: 700 }}>
            {serverStatus}
          </span>
        </div>

        {/* Logged in User Profile Chip */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.35rem 0.65rem 0.35rem 0.75rem',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fff'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                {user.full_name || user.username}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {user.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.25rem',
                marginLeft: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          {time}
        </div>
      </div>
    </header>
  );
}
