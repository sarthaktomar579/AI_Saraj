import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listInterviews } from '../../api/interviews';
import { listSessions } from '../../api/aiPractice';
import { listAIInterviews, scheduleAIInterview, listStudents, getReport } from '../../api/aiInterview';

const TRACKS = [
    { key: 'frontend', label: 'Frontend', subs: ['HTML', 'CSS', 'JavaScript', 'React'] },
    { key: 'backend', label: 'Backend', subs: ['Node.js', 'Django', 'Express', 'REST API'] },
    { key: 'dsa', label: 'DSA', subs: ['Arrays', 'Strings', 'Linked List', 'Trees', 'Graphs', 'DP'] },
    { key: 'data_analyst', label: 'Data Analyst', subs: ['SQL', 'MongoDB'] },
];

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [aiInterviews, setAIInterviews] = useState([]);
    const [showSchedule, setShowSchedule] = useState(false);
    const [students, setStudents] = useState([]);
    const [scheduleForm, setScheduleForm] = useState({
        student: '', difficulty: 'medium', deadline: '', company_name: '',
        selected_tracks: [], selected_subcategories: {},
    });
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState('');
    const [expandedReport, setExpandedReport] = useState(null);
    const [reportData, setReportData] = useState({});

    const isInterviewer = user?.role === 'interviewer' || user?.role === 'admin';

    useEffect(() => {
        listInterviews().then(r => setInterviews(r.data.results || r.data)).catch(() => {});
        if (user?.role === 'student') {
            listSessions().then(r => setSessions(r.data.results || r.data)).catch(() => {});
        }
        listAIInterviews().then(r => setAIInterviews(r.data.results || r.data)).catch(() => {});
    }, [user]);

    const openScheduleForm = async () => {
        setShowSchedule(true);
        try {
            const { data } = await listStudents();
            setStudents(data);
        } catch { setStudents([]); }
    };

    const toggleTrack = (key) => {
        setScheduleForm(prev => {
            const tracks = prev.selected_tracks.includes(key)
                ? prev.selected_tracks.filter(t => t !== key)
                : [...prev.selected_tracks, key];
            return { ...prev, selected_tracks: tracks };
        });
    };

    const toggleSub = (trackKey, sub) => {
        const value = sub.toLowerCase();
        setScheduleForm(prev => {
            const current = prev.selected_subcategories[trackKey] || [];
            const next = current.includes(value) ? current.filter(s => s !== value) : [...current, value];
            return { ...prev, selected_subcategories: { ...prev.selected_subcategories, [trackKey]: next } };
        });
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        setScheduleError('');
        if (!scheduleForm.student) { setScheduleError('Select a candidate'); return; }
        if (scheduleForm.selected_tracks.length === 0) { setScheduleError('Select at least one track'); return; }
        if (!scheduleForm.deadline) { setScheduleError('Set a deadline'); return; }
        setScheduleLoading(true);
        try {
            const topic = scheduleForm.selected_tracks.join(', ');
            await scheduleAIInterview({
                student: parseInt(scheduleForm.student),
                topic,
                difficulty: scheduleForm.difficulty,
                scheduled_at: new Date().toISOString(),
                deadline: new Date(scheduleForm.deadline).toISOString(),
                company_name: scheduleForm.company_name,
                selected_tracks: scheduleForm.selected_tracks,
                selected_subcategories: scheduleForm.selected_subcategories,
            });
            setShowSchedule(false);
            setScheduleForm({ student: '', difficulty: 'medium', deadline: '', company_name: '', selected_tracks: [], selected_subcategories: {} });
            const { data } = await listAIInterviews();
            setAIInterviews(data.results || data);
        } catch (err) {
            setScheduleError(err.response?.data?.detail || 'Failed to schedule');
        } finally {
            setScheduleLoading(false);
        }
    };

    const viewReport = async (interviewId) => {
        if (expandedReport === interviewId) { setExpandedReport(null); return; }
        setExpandedReport(interviewId);
        if (reportData[interviewId]) return;
        try {
            const { data } = await getReport(interviewId);
            setReportData(prev => ({ ...prev, [interviewId]: data }));
        } catch {
            setReportData(prev => ({ ...prev, [interviewId]: null }));
        }
    };

    const deadlinePassed = (deadline) => deadline && new Date(deadline) < new Date();

    return (
        <div className="container" style={{ maxWidth: 960, margin: '0 auto', padding: 32 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <h1><span style={{ background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AISaraj</span></h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="badge badge-success">{user?.role}</span>
                    <span>{user?.first_name || user?.username}</span>
                    <button className="btn-secondary" onClick={logout}>Logout</button>
                </div>
            </header>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
                {user?.role === 'student' && (
                    <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/ai-practice')}>
                        <h3>🤖 AI Practice</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Start a mock interview with AISaraj</p>
                    </div>
                )}
                {isInterviewer && (
                    <div className="card" style={{ cursor: 'pointer' }} onClick={openScheduleForm}>
                        <h3>📋 Schedule Interview</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Assign an AI interview to a candidate</p>
                    </div>
                )}
                <div className="card">
                    <h3>📊 My Stats</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {interviews.length} interviews · {sessions.length} practice sessions · {aiInterviews.length} AI interviews
                    </p>
                </div>
            </div>

            {/* Schedule Form Modal */}
            {showSchedule && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-secondary, #1e1e2e)', borderRadius: 16, padding: 32, width: '90%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ marginBottom: 20 }}>Schedule AI Interview</h2>
                        <form onSubmit={handleSchedule}>
                            <label style={{ display: 'block', marginBottom: 12 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Candidate</span>
                                <select value={scheduleForm.student} onChange={e => setScheduleForm(f => ({ ...f, student: e.target.value }))}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4 }}>
                                    <option value="">Select candidate...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.username})</option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ display: 'block', marginBottom: 12 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Company Name</span>
                                <input type="text" value={scheduleForm.company_name} onChange={e => setScheduleForm(f => ({ ...f, company_name: e.target.value }))}
                                    placeholder="e.g. Google, Infosys..."
                                    style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4 }} />
                            </label>

                            <div style={{ marginBottom: 12 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Interview Tracks</span>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {TRACKS.map(t => (
                                        <button key={t.key} type="button" onClick={() => toggleTrack(t.key)}
                                            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                                background: scheduleForm.selected_tracks.includes(t.key) ? '#6c63ff' : '#2a2a3e', color: '#fff' }}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {TRACKS.filter(t => scheduleForm.selected_tracks.includes(t.key)).map(t => (
                                <div key={t.key} style={{ marginBottom: 10 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t.label} subcategories</span>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                        {t.subs.map(sub => {
                                            const val = sub.toLowerCase();
                                            const sel = (scheduleForm.selected_subcategories[t.key] || []).includes(val);
                                            return (
                                                <button key={sub} type="button" onClick={() => toggleSub(t.key, sub)}
                                                    style={{ padding: '4px 12px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                                                        background: sel ? '#8b5cf6' : '#2a2a3e', color: '#fff' }}>
                                                    {sub}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <label style={{ display: 'block', marginBottom: 12 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Difficulty</span>
                                <select value={scheduleForm.difficulty} onChange={e => setScheduleForm(f => ({ ...f, difficulty: e.target.value }))}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4 }}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </label>

                            <label style={{ display: 'block', marginBottom: 16 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Deadline</span>
                                <input type="datetime-local" value={scheduleForm.deadline} onChange={e => setScheduleForm(f => ({ ...f, deadline: e.target.value }))}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4 }} />
                            </label>

                            {scheduleError && <p style={{ color: '#f87171', marginBottom: 12 }}>{scheduleError}</p>}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="submit" disabled={scheduleLoading}
                                    style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
                                    {scheduleLoading ? 'Scheduling...' : 'Schedule Interview'}
                                </button>
                                <button type="button" onClick={() => setShowSchedule(false)}
                                    style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid #444', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Recent Interviews (human) */}
            {interviews.length > 0 && (
                <>
                    <h2 style={{ marginBottom: 16 }}>Recent Interviews</h2>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
                        {interviews.slice(0, 5).map(iv => (
                            <Link key={iv.id} to={`/interview/${iv.id}`} style={{ textDecoration: 'none' }}>
                                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong>{iv.title}</strong>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(iv.scheduled_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`badge ${iv.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{iv.status}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {/* AI Scheduled Interviews */}
            <h2 style={{ margin: '24px 0 16px' }}>
                {isInterviewer ? 'Scheduled AI Interviews' : 'My AI Interviews'}
            </h2>
            {aiInterviews.length === 0 ? (
                <div className="card" style={{ marginBottom: 32 }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No AI interviews yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
                    {aiInterviews.map(ai => (
                        <div key={ai.id}>
                            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 20 }}>
                                <div style={{ flex: 1 }}>
                                    <strong>{ai.topic}</strong>
                                    {/* Student sees company name and interviewer */}
                                    {!isInterviewer && ai.company_name && (
                                        <p style={{ color: '#8b5cf6', fontSize: '0.85rem', margin: '2px 0' }}>
                                            🏢 {ai.company_name} · Scheduled by {ai.interviewer?.first_name || ai.interviewer?.username}
                                        </p>
                                    )}
                                    {/* Interviewer sees candidate name */}
                                    {isInterviewer && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0' }}>
                                            Candidate: {ai.student?.first_name} {ai.student?.last_name} ({ai.student?.username})
                                        </p>
                                    )}
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {ai.difficulty} · {ai.deadline ? `Deadline: ${new Date(ai.deadline).toLocaleString()}` : `Scheduled: ${new Date(ai.scheduled_at).toLocaleDateString()}`}
                                        {ai.deadline && deadlinePassed(ai.deadline) && ai.status !== 'completed' && (
                                            <span style={{ color: '#f87171', marginLeft: 8 }}>⏰ Expired</span>
                                        )}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className={`badge ${ai.status === 'completed' ? 'badge-success' : ai.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>{ai.status}</span>
                                    {/* Student: start/resume button if not completed and not expired */}
                                    {!isInterviewer && (ai.status === 'scheduled' || ai.status === 'in_progress') && !deadlinePassed(ai.deadline) && (
                                        <button onClick={() => navigate(`/ai-interview/${ai.id}/take`)}
                                            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {ai.status === 'in_progress' ? 'Resume' : 'Start'}
                                        </button>
                                    )}
                                    {/* Interviewer: view report if completed */}
                                    {isInterviewer && ai.status === 'completed' && (
                                        <button onClick={() => viewReport(ai.id)}
                                            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {expandedReport === ai.id ? 'Hide Report' : 'View Report'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Inline report for interviewer */}
                            {isInterviewer && expandedReport === ai.id && reportData[ai.id] && (() => {
                                const r = reportData[ai.id];
                                const hiringColor = r.hiring_signal === 'Strong Hire' ? '#10b981'
                                    : r.hiring_signal === 'Hire' ? '#10b981'
                                    : r.hiring_signal === 'Consider' ? '#f59e0b'
                                    : '#f87171';
                                return (
                                    <div className="card" style={{ marginTop: 10, padding: 20, borderLeft: `4px solid ${r.disqualified ? '#f87171' : '#10b981'}` }}>
                                        {r.disqualified && (
                                            <div style={{ background: '#7f1d1d', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: '1.5rem' }}>🚨</span>
                                                <div>
                                                    <strong style={{ color: '#fca5a5', fontSize: '1rem' }}>CHEATING DETECTED — Candidate Disqualified</strong>
                                                    <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '4px 0 0' }}>{r.disqualify_reason || 'Proctoring policy violation'}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                                            <div><strong>Total</strong><br /><span style={{ fontSize: '1.5rem', color: r.total_score >= 50 ? '#10b981' : '#f87171' }}>{r.total_score}/100</span></div>
                                            <div><strong>Communication</strong><br />{r.communication}/20</div>
                                            <div><strong>Technical</strong><br />{r.technical_depth}/25</div>
                                            <div><strong>Code Quality</strong><br />{r.code_quality}/20</div>
                                            <div><strong>Problem Solving</strong><br />{r.problem_solving}/20</div>
                                            <div><strong>Optimization</strong><br />{r.optimization}/15</div>
                                            <div>
                                                <strong>Warnings</strong><br />
                                                <span style={{ color: r.warning_count > 0 ? '#f87171' : '#10b981', fontWeight: 700 }}>
                                                    {r.warning_count || 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <strong style={{ color: '#10b981' }}>Strengths</strong>
                                                <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                                                    {(r.strengths || []).length > 0
                                                        ? r.strengths.map((s, i) => <li key={i} style={{ fontSize: '0.85rem' }}>{s}</li>)
                                                        : <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>None</li>}
                                                </ul>
                                            </div>
                                            <div>
                                                <strong style={{ color: '#f87171' }}>Weaknesses</strong>
                                                <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                                                    {(r.weaknesses || []).map((w, i) => <li key={i} style={{ fontSize: '0.85rem' }}>{w}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                        <p style={{ marginTop: 12, fontSize: '0.9rem' }}>
                                            <strong>Hiring Signal: </strong>
                                            <span style={{ color: hiringColor, fontWeight: 700 }}>{r.hiring_signal}</span>
                                        </p>
                                    </div>
                                );
                            })()}
                            {isInterviewer && expandedReport === ai.id && reportData[ai.id] === null && (
                                <div className="card" style={{ marginTop: 10, color: 'var(--text-secondary)' }}>No report available yet.</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Practice sessions for students */}
            {user?.role === 'student' && sessions.length > 0 && (
                <>
                    <h2 style={{ marginBottom: 16 }}>Practice Sessions</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {sessions.slice(0, 5).map(s => (
                            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{s.topic || 'Practice'}</strong>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {s.difficulty} · {new Date(s.started_at).toLocaleDateString()}
                                        {s.evaluation && <span style={{ color: '#10b981', marginLeft: 8 }}>Score: {s.evaluation.total_score}/100</span>}
                                    </p>
                                </div>
                                <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
