import React, { useState, useEffect } from 'react';
import { getDashboardJobs } from '../../api/dashboard';

const TRACK_FILTERS = [
    { key: 'all', label: 'All Jobs' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'backend', label: 'Backend' },
    { key: 'fullstack', label: 'Fullstack' },
    { key: 'data_analyst', label: 'Data' }
];

// Aesthetic brand accent colors for Indian tech companies
const COMPANY_COLORS = {
    'Razorpay': { bg: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', text: '#fff', char: 'R' },
    'Swiggy': { bg: 'linear-gradient(135deg, #c2410c, #f97316)', text: '#fff', char: 'S' },
    'Zomato': { bg: 'linear-gradient(135deg, #b91c1c, #ef4444)', text: '#fff', char: 'Z' },
    'CRED': { bg: 'linear-gradient(135deg, #18181b, #27272a)', text: '#fafafa', char: 'C' },
    'PhonePe': { bg: 'linear-gradient(135deg, #581c87, #7c3aed)', text: '#fff', char: 'P' },
    'Zepto': { bg: 'linear-gradient(135deg, #4338ca, #6366f1)', text: '#fff', char: 'Z' },
    'Groww': { bg: 'linear-gradient(135deg, #047857, #10b981)', text: '#fff', char: 'G' },
    'Mindtickle': { bg: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', text: '#fff', char: 'M' },
    'Flipkart': { bg: 'linear-gradient(135deg, #b45309, #f59e0b)', text: '#fff', char: 'F' },
    'Meesho': { bg: 'linear-gradient(135deg, #be185d, #ec4899)', text: '#fff', char: 'M' },
    'Postman': { bg: 'linear-gradient(135deg, #c2410c, #fb923c)', text: '#fff', char: 'P' },
    'InMobi': { bg: 'linear-gradient(135deg, #0e7490, #06b6d4)', text: '#fff', char: 'I' },
};

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
            console.error('Failed to load India tech jobs:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs(selectedTrack);
    }, [selectedTrack]);

    const getCompanyBadge = (companyName) => {
        const found = COMPANY_COLORS[companyName];
        if (found) return found;
        return {
            bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            text: '#fff',
            char: (companyName || 'T').charAt(0).toUpperCase()
        };
    };

    return (
        <div style={{
            background: 'linear-gradient(180deg, rgba(23, 23, 43, 0.95) 0%, rgba(15, 15, 28, 0.98) 100%)',
            borderRadius: 16,
            border: '1px solid rgba(139, 92, 246, 0.28)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 20px rgba(124, 58, 237, 0.08)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
        }}>
            {/* Header: Clean 1-Row Layout */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(16, 185, 129, 0.2))',
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.05rem',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                        🇮🇳
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                                India Tech Pulse
                            </h3>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 7px',
                                borderRadius: 8,
                                background: 'rgba(16, 185, 129, 0.16)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34d399',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                <span style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    boxShadow: '0 0 6px #10b981',
                                    animation: 'pulse 2s infinite'
                                }} />
                                LIVE
                            </span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                            Bengaluru · Hyderabad · Pune · Gurugram · Remote
                        </p>
                    </div>
                </div>

                {/* 1-Click Sync Button */}
                <button
                    onClick={() => fetchJobs(selectedTrack, true)}
                    disabled={isRefreshing}
                    title="Sync Latest Indian Job Openings"
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#8b5cf6';
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                >
                    <svg
                        width="12"
                        height="12"
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
                    <span>{isRefreshing ? '...' : 'Sync'}</span>
                </button>
            </div>

            {/* In-Line Category Filter Buttons (All on ONE Row) */}
            <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                paddingBottom: 2
            }}>
                {TRACK_FILTERS.map(t => {
                    const isSelected = selectedTrack === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setSelectedTrack(t.key)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 18,
                                border: '1px solid',
                                borderColor: isSelected ? '#8b5cf6' : 'rgba(255, 255, 255, 0.08)',
                                background: isSelected ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(124, 58, 237, 0.2))' : 'rgba(255, 255, 255, 0.04)',
                                color: isSelected ? '#fff' : 'var(--text-secondary)',
                                fontSize: '0.76rem',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 0 12px rgba(139, 92, 246, 0.3)' : 'none'
                            }}
                            onMouseEnter={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = '#fff';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
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
                maxHeight: 400,
                overflowY: 'auto',
                paddingRight: 3
            }}>
                {loading ? (
                    /* Zero Cumulative Layout Shift Skeleton */
                    [1, 2, 3].map(i => (
                        <div key={i} style={{
                            padding: '12px 14px',
                            borderRadius: 12,
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center'
                        }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255, 255, 255, 0.06)' }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ width: '65%', height: 13, background: 'rgba(255, 255, 255, 0.07)', borderRadius: 4 }} />
                                <div style={{ width: '40%', height: 10, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 4 }} />
                            </div>
                        </div>
                    ))
                ) : jobs.length === 0 ? (
                    <div style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                    }}>
                        No matching Indian tech jobs found in this track. Try "All Jobs".
                    </div>
                ) : (
                    jobs.map((job, idx) => {
                        const badge = getCompanyBadge(job.company_name);
                        return (
                            <a
                                key={job.id || idx}
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    background: 'rgba(255, 255, 255, 0.025)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 7,
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.45)';
                                    e.currentTarget.style.transform = 'translateY(-1.5px)';
                                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.35)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Top Row: Company Avatar + Title + Apply Pill */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: badge.bg,
                                        color: badge.text,
                                        fontWeight: 800,
                                        fontSize: '0.88rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                    }}>
                                        {badge.char}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                            <div style={{
                                                fontSize: '0.86rem',
                                                fontWeight: 700,
                                                color: '#f3f4f6',
                                                lineHeight: 1.3,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {job.title}
                                            </div>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                padding: '2px 8px',
                                                borderRadius: 12,
                                                background: 'rgba(139, 92, 246, 0.2)',
                                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                                color: '#c4b5fd',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                            }}>
                                                Apply ↗
                                            </span>
                                        </div>

                                        {/* Company Name & Location Meta */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: '0.76rem',
                                            color: 'var(--text-secondary)',
                                            marginTop: 3,
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{job.company_name}</span>
                                            <span>•</span>
                                            <span style={{ color: '#94a3b8' }}>📍 {job.location}</span>
                                            {job.remote && (
                                                <span style={{
                                                    fontSize: '0.66rem',
                                                    padding: '1px 6px',
                                                    borderRadius: 6,
                                                    background: 'rgba(59, 130, 246, 0.16)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    color: '#93c5fd',
                                                    fontWeight: 600
                                                }}>
                                                    Remote
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Skill Tags */}
                                {job.tags && job.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2, paddingLeft: 42 }}>
                                        {job.tags.slice(0, 3).map((tag, tIdx) => (
                                            <span
                                                key={tIdx}
                                                style={{
                                                    fontSize: '0.67rem',
                                                    padding: '2px 7px',
                                                    borderRadius: 6,
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    color: '#cbd5e1',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </a>
                        );
                    })
                )}
            </div>

            {/* Performance & Optimization Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#10b981' }}>⚡</span>
                    {metaInfo.cached ? 'Low-Latency Cache Hit (< 2ms)' : 'Live Synced'}
                </span>
                <span style={{ fontWeight: 600, color: '#a78bfa' }}>Top Indian Product Hubs</span>
            </div>
        </div>
    );
}
