import React from 'react';

export function Loader({ size = 40, text = 'Loading...' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 }}>
            <div style={{
                width: size, height: size,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
            }} />
            {text && <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{text}</p>}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div className="card" style={{ maxWidth: 520, width: '90%' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', padding: 0 }}>×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function ScoreBar({ label, value, max, color }) {
    const percentage = Math.round((value / max) * 100);
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ textTransform: 'capitalize' }}>{label}</span>
                <span>{value}/{max}</span>
            </div>
            <div className="score-bar">
                <div className="score-bar-fill" style={{ width: `${percentage}%`, background: color || undefined }} />
            </div>
        </div>
    );
}

export function Badge({ type = 'success', children }) {
    return <span className={`badge badge-${type}`}>{children}</span>;
}

export function EmptyState({ icon = '📭', title, description }) {
    return (
        <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
            <h3>{title}</h3>
            {description && <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{description}</p>}
        </div>
    );
}
