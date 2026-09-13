import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAIInterview, getReport } from '../../api/aiInterview';

export default function AIReportPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [interview, setInterview] = useState(null);
    const [report, setReport] = useState(null);

    useEffect(() => {
        getAIInterview(id).then(r => setInterview(r.data)).catch(() => { });
        getReport(id).then(r => setReport(r.data)).catch(() => { });
    }, [id]);

    if (!report) return <div className="container">Loading report...</div>;

    const isDSA = (interview?.selected_tracks || []).includes('dsa');
    const dims = isDSA ? [
        { key: 'communication', label: 'Communication', max: 20 },
        { key: 'technical_depth', label: 'Technical Depth', max: 25 },
        { key: 'code_quality', label: 'Code Quality', max: 20 },
        { key: 'optimization', label: 'Optimization', max: 15 },
        { key: 'problem_solving', label: 'Problem Solving', max: 20 },
    ] : [
        { key: 'communication', label: 'Communication', max: 20 },
        { key: 'technical_depth', label: 'Technical Depth', max: 25 },
        { key: 'code_quality', label: 'Best Practices & Architecture', max: 20 },
        { key: 'optimization', label: 'Performance & Scaling', max: 15 },
        { key: 'problem_solving', label: 'Conceptual Clarity', max: 20 },
    ];

    return (
        <div className="container">
            <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 16 }}>← Dashboard</Link>
            <div 
                onClick={() => navigate('/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, cursor: 'pointer' }}
                title="AISaraj Home"
            >
                <img 
                    src="/handshake_logo.png" 
                    alt="AISaraj Logo" 
                    style={{ 
                        width: 40, 
                        height: 40, 
                        objectFit: 'cover', 
                        borderRadius: '50%', 
                        border: '2px solid rgba(139, 92, 246, 0.4)',
                        boxShadow: '0 0 16px rgba(124, 58, 237, 0.45)' 
                    }} 
                />
                <span style={{ fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(135deg, #6c63ff, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    AISaraj
                </span>
            </div>
            <h1 style={{ marginBottom: 8 }}>AI Interview Report</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                {interview?.topic} · {interview?.difficulty} · {interview?.student?.first_name} {interview?.student?.last_name}
            </p>

            {/* Recording */}
            {interview?.recording_url && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3>📹 Recording</h3>
                    <video src={interview.recording_url} controls style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
                </div>
            )}

            {/* Score Overview */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2>Score: {report.total_score}/100</h2>
                    <span className={`badge ${report.hiring_signal.includes('Hire') ? 'badge-success' : report.hiring_signal === 'Consider' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '1rem', padding: '8px 20px' }}>
                        {report.hiring_signal}
                    </span>
                </div>
                {dims.map(({ key, label, max }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>{label || key.replace('_', ' ')}</span>
                            <span>{report[key]}/{max}</span>
                        </div>
                        <div className="score-bar"><div className="score-bar-fill" style={{ width: `${(report[key] / max) * 100}%` }} /></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card"><h3>💪 Strengths</h3><ul>{report.strengths.map((s, i) => <li key={i} style={{ color: 'var(--success)' }}>{s}</li>)}</ul></div>
                <div className="card"><h3>⚠️ Weaknesses</h3><ul>{report.weaknesses.map((w, i) => <li key={i} style={{ color: 'var(--warning)' }}>{w}</li>)}</ul></div>
                <div className="card"><h3>📈 Improvement Plan</h3><ul>{report.improvement_plan.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                <div className="card"><h3>📚 Recommended Topics</h3><ul>{report.recommended_topics.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
            </div>

            {/* Skill Gap */}
            {report.skill_gap_analysis && Object.keys(report.skill_gap_analysis).length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <h3>🔍 Skill Gap Analysis</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                        <thead><tr><th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border)' }}>Topic</th><th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border)' }}>Gap</th></tr></thead>
                        <tbody>
                            {Object.entries(report.skill_gap_analysis).map(([topic, gap]) => (
                                <tr key={topic}><td style={{ padding: 8 }}>{topic}</td><td style={{ padding: 8, color: 'var(--warning)' }}>{gap}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
