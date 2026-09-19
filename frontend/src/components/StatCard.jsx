import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = '#06b6d4', badgeText, badgeType = 'normal' }) {
  return (
    <div className="cyber-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '80px',
        height: '80px',
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: `${color}18`,
            border: `1px solid ${color}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={18} color={color} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}>
          {value}
        </div>
        {badgeText && (
          <span className={`badge badge-${badgeType}`} style={{ fontSize: '0.7rem' }}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
