import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAIInterview, getReport } from '../../api/aiInterview';

export default function AIReportPage() {
    const { id } = useParams();
    const [interview, setInterview] = useState(null);
    const [report, setReport] = useState(null);

    useEffect(() => {
        getAIInterview(id).then(r => setInterview(r.data)).catch(() => { });
        getReport(id).then(r => setReport(r.data)).catch(() => { });
    }, [id]);

    if (!report) return <div className="container">Loading report...</div>;

    const dims = [
        { key: 'communication', max: 20 }, { key: 'technical_depth', max: 25 },
        { key: 'code_quality', max: 20 }, { key: 'optimization', max: 15 },
        { key: 'problem_solving', max: 20 },
    ];

    return (
        <div className="container">
            <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 16 }}>← Dashboard</Link>
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
                {dims.map(({ key, max }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
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
