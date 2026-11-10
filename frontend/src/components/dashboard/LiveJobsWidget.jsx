import React, { useState, useEffect } from 'react';
import { getDashboardJobs } from '../../api/dashboard';

const TRACK_FILTERS = [
    { key: 'all', label: 'All Jobs' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'backend', label: 'Backend' },
    { key: 'fullstack', label: 'Fullstack' },
    { key: 'data_analyst', label: 'Data' }
];

export default function LiveJobsWidget({ defaultTrack = 'all' }) {
    const [jobs, setJobs] = useState([]);
    const [selectedTrack, setSelectedTrack] = useState(defaultTrack);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [metaInfo, setMetaInfo] = useState({ cached: false, updated_at: 0 });

    const fetchJobs = async (track, manual = false) => {
        if (manual) setIsRefreshing(true);
        else setLoading(true);

        try {
            const { data } = await getDashboardJobs(track);
            if (data && data.jobs) {
                setJobs(data.jobs);
                setMetaInfo({
                    cached: data.cached,
                    updated_at: data.updated_at,
                    source: data.source
                });
            }
        } catch (err) {
            console.error('Failed to load live jobs pulse:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs(selectedTrack);
    }, [selectedTrack]);

    return (
        <div style={{
            background: 'var(--bg-secondary, #181824)',
            borderRadius: 14,
            border: '1px solid rgba(139, 92, 246, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
        }}>
            {/* Header with Live Beacon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>🇮🇳</span>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                                India Tech Jobs Pulse
                            </h3>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    boxShadow: '0 0 6px #10b981',
                                    animation: 'pulse 2s infinite'
                                }} />
                                Real-Time
                            </span>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Bengaluru · Hyderabad · Pune · Gurugram · Remote India
                        </p>
                    </div>
                </div>

                {/* Manual Refresh / Latency Indicator */}
                <button
                    onClick={() => fetchJobs(selectedTrack, true)}
                    disabled={isRefreshing}
                    title="Refresh Live Feed"
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#8b5cf6'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                >
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            transform: isRefreshing ? 'rotate(360deg)' : 'none',
                            transition: 'transform 0.6s ease'
                        }}
                    >
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                </button>
            </div>

            {/* Filter Pills for Tracks */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TRACK_FILTERS.map(t => {
                    const isSelected = selectedTrack === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setSelectedTrack(t.key)}
                            style={{
                                padding: '4px 11px',
                                borderRadius: 16,
                                border: '1px solid',
                                borderColor: isSelected ? '#8b5cf6' : 'rgba(255, 255, 255, 0.08)',
                                background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                color: isSelected ? '#c4b5fd' : 'var(--text-secondary)',
                                fontSize: '0.76rem',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Job Listings Stream */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 380,
                overflowY: 'auto',
                paddingRight: 4
            }}>
                {loading ? (
                    /* Zero Cumulative Layout Shift Skeleton */
                    [1, 2, 3].map(i => (
                        <div key={i} style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                        }}>
                            <div style={{ width: '70%', height: 14, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4 }} />
                            <div style={{ width: '45%', height: 10, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 4 }} />
                        </div>
                    ))
                ) : jobs.length === 0 ? (
                    <div style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                    }}>
                        No matching jobs found in this track. Try "All Jobs".
                    </div>
                ) : (
                    jobs.map((job, idx) => (
                        <a
                            key={job.id || idx}
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                textDecoration: 'none',
                                color: 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6', lineHeight: 1.3 }}>
                                    {job.title}
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: '#a78bfa',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}>
                                    Apply ↗
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 600, color: '#c4b5fd' }}>{job.company_name}</span>
                                <span>•</span>
                                <span>{job.location}</span>
                                {job.remote && (
                                    <span style={{
                                        fontSize: '0.68rem',
                                        padding: '1px 6px',
                                        borderRadius: 8,
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        color: '#60a5fa'
                                    }}>
                                        Remote
                                    </span>
                                )}
                            </div>

                            {/* Tags / Skills Preview */}
                            {job.tags && job.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                                    {job.tags.slice(0, 3).map((tag, tIdx) => (
                                        <span
                                            key={tIdx}
                                            style={{
                                                fontSize: '0.68rem',
                                                padding: '2px 7px',
                                                borderRadius: 6,
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                color: '#d1d5db'
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </a>
                    ))
                )}
            </div>

            {/* Performance & Optimization Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#10b981' }}>⚡</span>
                    {metaInfo.cached ? 'Low-Latency Cache Hit (< 2ms)' : 'Live Synced'}
                </span>
                <span>🇮🇳 Top Indian Tech Hubs</span>
            </div>
        </div>
    );
}

