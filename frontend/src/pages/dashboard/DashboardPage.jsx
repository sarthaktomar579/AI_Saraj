import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listInterviews } from '../../api/interviews';
import { listSessions, deleteSession } from '../../api/aiPractice';
import { listAIInterviews, scheduleAIInterview, updateAIInterview, deleteAIInterview, listStudents, getReport } from '../../api/aiInterview';

const TRACKS = [
    { key: 'frontend', label: 'Frontend', subs: ['HTML', 'CSS', 'JavaScript', 'React'] },
    { key: 'backend', label: 'Backend', subs: ['Node.js', 'Django', 'Express', 'REST API'] },
    { key: 'fullstack', label: 'Fullstack', subs: ['Frontend', 'Backend', 'Database'] },
    { key: 'data_analyst', label: 'Data Analyst', subs: ['SQL', 'MongoDB'] },
];

export default function DashboardPage() {
    const { user, logout, updateUserRole } = useAuth();
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
    const [expandedPracticeReport, setExpandedPracticeReport] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(() => {
        return sessionStorage.getItem('prompt_role_selection') === 'true';
    });
    const [roleUpdating, setRoleUpdating] = useState(false);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [isCandidateDropdownOpen, setIsCandidateDropdownOpen] = useState(false);

    // AI Interview details and inline edit states
    const [selectedInterviewId, setSelectedInterviewId] = useState(null);
    const [editingInterviewId, setEditingInterviewId] = useState(null);
    const [editForm, setEditForm] = useState({
        student: '', difficulty: 'medium', deadline: '', company_name: '',
        selected_tracks: [], selected_subcategories: {},
    });
    const [editCandidateSearch, setEditCandidateSearch] = useState('');
    const [isEditCandidateDropdownOpen, setIsEditCandidateDropdownOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const isInterviewer = user?.role === 'interviewer' || user?.role === 'admin';
    const displayName = (user?.first_name || user?.username || '').trim().split(' ')[0];
    const practiceSessions = sessions.filter(s => s.session_type !== 'scheduled' && !s.scheduled_interview_id);

    const selectedStudent = students.find(s => String(s.id) === String(scheduleForm.student));
    const filteredStudents = students.filter(s => {
        const q = candidateSearch.toLowerCase().trim();
        if (!q) return true;
        const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
        const username = (s.username || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        return name.includes(q) || username.includes(q) || email.includes(q);
    });

    const selectedEditStudent = students.find(s => String(s.id) === String(editForm.student));
    const filteredEditStudents = students.filter(s => {
        const q = editCandidateSearch.toLowerCase().trim();
        if (!q) return true;
        const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
        const username = (s.username || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        return name.includes(q) || username.includes(q) || email.includes(q);
    });

    const getCandidateDisplay = (ai) => {
        const student = ai.student || students.find(s => s.id === ai.student_id);
        if (!student) return `Candidate #${ai.student_id || ''}`;
        const name = [student.first_name, student.last_name].filter(Boolean).join(' ');
        if (name.trim()) {
            return `${name} (${student.username || student.email})`;
        }
        return student.username || student.email || `Candidate #${ai.student_id}`;
    };

    const formatDeadlineDisplay = (deadline) => {
        if (!deadline) return 'No deadline';
        const d = new Date(deadline);
        if (isNaN(d.getTime())) return deadline;
        const dateStr = d.toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const isEndOfDay = (d.getHours() === 23 && d.getMinutes() === 59) || String(deadline).includes('23:59:59') || String(deadline).includes('23:59');
        if (isEndOfDay) {
            return dateStr;
        }
        const timeStr = d.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${dateStr}, ${timeStr}`;
    };

    const handleSelectRole = async (selectedRole) => {
        setRoleUpdating(true);
        try {
            if (updateUserRole) {
                await updateUserRole(selectedRole);
            }
            sessionStorage.removeItem('prompt_role_selection');
            setShowRoleModal(false);
        } catch (err) {
            console.error('Failed to update role:', err);
            sessionStorage.removeItem('prompt_role_selection');
            setShowRoleModal(false);
        } finally {
            setRoleUpdating(false);
        }
    };

    useEffect(() => {
        listInterviews().then(r => setInterviews(r.data.results || r.data)).catch(() => {});
        if (user?.role === 'student') {
            listSessions().then(r => setSessions(r.data.results || r.data)).catch(() => {});
        }
        listAIInterviews().then(r => setAIInterviews(r.data.results || r.data)).catch(() => {});
        if (user?.role === 'interviewer' || user?.role === 'admin') {
            listStudents().then(r => setStudents(r.data)).catch(() => {});
        }
    }, [user]);

    const openScheduleForm = async () => {
        setShowSchedule(true);
        setCandidateSearch('');
        setIsCandidateDropdownOpen(false);
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
            const deadlineStr = scheduleForm.deadline.includes('T') 
                ? scheduleForm.deadline 
                : `${scheduleForm.deadline}T23:59:59`;
            await scheduleAIInterview({
                student_id: parseInt(scheduleForm.student),
                student: parseInt(scheduleForm.student),
                topic,
                difficulty: scheduleForm.difficulty,
                scheduled_at: new Date().toISOString(),
                deadline: deadlineStr,
                company_name: scheduleForm.company_name,
                selected_tracks: scheduleForm.selected_tracks,
                selected_subcategories: scheduleForm.selected_subcategories,
            });
            setShowSchedule(false);
            setScheduleForm({ student: '', difficulty: 'medium', deadline: '', company_name: '', selected_tracks: [], selected_subcategories: {} });
            const { data } = await listAIInterviews();
            setAIInterviews(data.results || data);
        } catch (err) {
            const detail = err.response?.data?.detail;
            let msg = 'Failed to schedule';
            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                msg = detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'Field'}: ${d.msg}`).join(', ');
            } else if (err.message) {
                msg = err.message;
            }
            setScheduleError(msg);
        } finally {
            setScheduleLoading(false);
        }
    };

    const startEditing = (ai, e) => {
        if (e) e.stopPropagation();
        setEditingInterviewId(ai.id);
        setSelectedInterviewId(ai.id);
        setEditError('');
        setEditCandidateSearch('');
        setIsEditCandidateDropdownOpen(false);
        let dStr = '';
        if (ai.deadline) {
            dStr = ai.deadline.split('T')[0];
        }
        setEditForm({
            student: String(ai.student_id),
            difficulty: ai.difficulty || 'medium',
            deadline: dStr,
            company_name: ai.company_name || '',
            selected_tracks: Array.isArray(ai.selected_tracks) ? [...ai.selected_tracks] : [],
            selected_subcategories: typeof ai.selected_subcategories === 'object' && ai.selected_subcategories !== null ? { ...ai.selected_subcategories } : {},
        });
    };

    const cancelEditing = (e) => {
        if (e) e.stopPropagation();
        setEditingInterviewId(null);
        setEditError('');
    };

    const toggleEditTrack = (key) => {
        setEditForm(prev => {
            const tracks = prev.selected_tracks.includes(key)
                ? prev.selected_tracks.filter(t => t !== key)
                : [...prev.selected_tracks, key];
            return { ...prev, selected_tracks: tracks };
        });
    };

    const toggleEditSub = (trackKey, sub) => {
        const value = sub.toLowerCase();
        setEditForm(prev => {
            const current = prev.selected_subcategories[trackKey] || [];
            const next = current.includes(value) ? current.filter(s => s !== value) : [...current, value];
            return { ...prev, selected_subcategories: { ...prev.selected_subcategories, [trackKey]: next } };
        });
    };

    const handleSaveEdit = async (id, e) => {
        if (e) e.preventDefault();
        setEditError('');
        if (!editForm.student) { setEditError('Select a candidate'); return; }
        if (editForm.selected_tracks.length === 0) { setEditError('Select at least one track'); return; }
        if (!editForm.deadline) { setEditError('Set a deadline'); return; }
        setEditLoading(true);
        try {
            const topic = editForm.selected_tracks.join(', ');
            const deadlineStr = editForm.deadline.includes('T') 
                ? editForm.deadline 
                : `${editForm.deadline}T23:59:59`;
            const { data } = await updateAIInterview(id, {
                student_id: parseInt(editForm.student),
                student: parseInt(editForm.student),
                topic,
                difficulty: editForm.difficulty,
                deadline: deadlineStr,
                company_name: editForm.company_name,
                selected_tracks: editForm.selected_tracks,
                selected_subcategories: editForm.selected_subcategories,
            });
            setAIInterviews(prev => prev.map(item => item.id === id ? data : item));
            setEditingInterviewId(null);
        } catch (err) {
            const detail = err.response?.data?.detail;
            let msg = 'Failed to update interview';
            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                msg = detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'Field'}: ${d.msg}`).join(', ');
            } else if (err.message) {
                msg = err.message;
            }
            setEditError(msg);
        } finally {
            setEditLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        const { type, id } = deleteConfirm;
        setDeleteConfirm(prev => ({ ...prev, loading: true, error: '' }));
        try {
            if (type === 'session') {
                await deleteSession(id);
                setSessions(prev => prev.filter(s => s.id !== id));
            } else if (type === 'interview') {
                await deleteAIInterview(id);
                setAIInterviews(prev => prev.filter(item => item.id !== id));
                if (selectedInterviewId === id) setSelectedInterviewId(null);
                if (editingInterviewId === id) setEditingInterviewId(null);
            }
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete:', err);
            setDeleteConfirm(prev => ({
                ...prev,
                loading: false,
                error: err.response?.data?.detail || 'Failed to delete. Please try again.'
            }));
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                width: '100%',
                background: 'rgba(10, 10, 22, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '14px 40px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxSizing: 'border-box'
            }}>
                <div 
                    style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                    onClick={() => navigate('/dashboard')}
                    title="AISaraj Home"
                >
                    <img src="/handshake_logo.png" alt="AISaraj Logo" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '50%', border: '2px solid rgba(139, 92, 246, 0.35)', boxShadow: '0 0 16px rgba(124, 58, 237, 0.45)' }} />
                    <h1 style={{ margin: 0, fontSize: '1.75rem' }}><span className="text-gradient">AISaraj</span></h1>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span className="badge badge-success" style={{ textTransform: 'capitalize', letterSpacing: '0.04em' }}>
                        {user?.role === 'student' ? 'Candidate' : user?.role}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{displayName}</span>
                    <button 
                        className="btn-logout" 
                        onClick={() => setShowLogoutConfirm(true)}
                        title="Log out of AISaraj"
                    >
                        <span>Logout</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease' }}>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="container" style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px', width: '100%', flex: 1 }}>

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
                        {interviews.length} interviews · {practiceSessions.length} practice sessions · {aiInterviews.length} AI interviews
                    </p>
                </div>
            </div>

            {/* Schedule Form Modal */}
            {showSchedule && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-secondary, #1e1e2e)', borderRadius: 16, padding: 32, width: '90%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ marginBottom: 20 }}>Schedule AI Interview</h2>
                        <form onSubmit={handleSchedule}>
                            {/* Searchable Candidate Selection */}
                            <div style={{ marginBottom: 14, position: 'relative' }}>
                                <label style={{ display: 'block', marginBottom: 6 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                                        Candidate
                                    </span>
                                </label>
                                
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <div style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <input 
                                        type="text"
                                        value={candidateSearch}
                                        onChange={e => {
                                            setCandidateSearch(e.target.value);
                                            setIsCandidateDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsCandidateDropdownOpen(true)}
                                        placeholder={selectedStudent ? `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''} (@${selectedStudent.username})` : "Search candidate by name, username or email..."}
                                        style={{
                                            width: '100%',
                                            padding: '10px 36px 10px 34px',
                                            borderRadius: 8,
                                            background: 'var(--bg-primary, #12121a)',
                                            color: '#fff',
                                            border: isCandidateDropdownOpen ? '1px solid #8b5cf6' : '1px solid #333',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s',
                                            boxShadow: isCandidateDropdownOpen ? '0 0 12px rgba(139, 92, 246, 0.25)' : 'none'
                                        }}
                                    />
                                    {scheduleForm.student ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setScheduleForm(f => ({ ...f, student: '' }));
                                                setCandidateSearch('');
                                                setIsCandidateDropdownOpen(true);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: 8,
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                padding: 4,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Clear selected candidate"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <div 
                                            style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--text-secondary)' }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {selectedStudent && !isCandidateDropdownOpen && (
                                    <div style={{
                                        marginTop: 6,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        background: 'rgba(139, 92, 246, 0.15)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        fontSize: '0.8rem',
                                        color: '#c4b5fd'
                                    }}>
                                        <span>Candidate: <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> (@{selectedStudent.username})</span>
                                    </div>
                                )}

                                {isCandidateDropdownOpen && (
                                    <>
                                        <div 
                                            onClick={() => setIsCandidateDropdownOpen(false)}
                                            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            left: 0,
                                            right: 0,
                                            zIndex: 1200,
                                            maxHeight: 200,
                                            overflowY: 'auto',
                                            background: '#181824',
                                            border: '1px solid rgba(139, 92, 246, 0.35)',
                                            borderRadius: 10,
                                            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(124, 58, 237, 0.15)',
                                            padding: 4
                                        }}>
                                            {filteredStudents.length === 0 ? (
                                                <div style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    No candidates matching "{candidateSearch}"
                                                </div>
                                            ) : (
                                                filteredStudents.map(s => {
                                                    const isSelected = String(scheduleForm.student) === String(s.id);
                                                    return (
                                                        <div 
                                                            key={s.id}
                                                            onClick={() => {
                                                                setScheduleForm(f => ({ ...f, student: s.id }));
                                                                setCandidateSearch(`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username);
                                                                setIsCandidateDropdownOpen(false);
                                                            }}
                                                            style={{
                                                                padding: '8px 12px',
                                                                borderRadius: 6,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                                                border: isSelected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                                                                transition: 'all 0.15s ease',
                                                                marginBottom: 2
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                                            }}
                                                            onMouseLeave={e => {
                                                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{
                                                                    width: 28,
                                                                    height: 28,
                                                                    borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.8rem',
                                                                    color: '#fff',
                                                                    flexShrink: 0
                                                                }}>
                                                                    {(s.first_name || s.username || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div style={{ textAlign: 'left' }}>
                                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                                                                        {s.first_name} {s.last_name}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                                                        @{s.username} {s.email ? `· ${s.email}` : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <span style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 700 }}>✓</span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

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
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Last Date to Complete</span>
                                <input 
                                    type="date" 
                                    min={new Date().toISOString().split('T')[0]}
                                    value={scheduleForm.deadline} 
                                    onChange={e => setScheduleForm(f => ({ ...f, deadline: e.target.value }))}
                                    onClick={e => e.target.showPicker && e.target.showPicker()}
                                    style={{ 
                                        width: '100%', 
                                        padding: '11px 14px', 
                                        borderRadius: 8, 
                                        background: 'var(--bg-primary, #12121a)', 
                                        color: '#fff', 
                                        border: '1px solid #333', 
                                        fontSize: '0.92rem',
                                        cursor: 'pointer',
                                        colorScheme: 'dark'
                                    }} 
                                    required
                                />
                            </label>

                            {scheduleError && (
                                <p style={{ color: '#f87171', marginBottom: 12 }}>
                                    {typeof scheduleError === 'string' ? scheduleError : JSON.stringify(scheduleError)}
                                </p>
                            )}

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
                        {interviews.slice(0, 10).map(iv => (
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
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', display: 'grid', gap: 14, marginBottom: 32 }}>
                    {aiInterviews.slice(0, 20).map(ai => (
                        <div key={ai.id}>
                            <div style={{ borderRadius: 14, overflow: 'hidden', border: selectedInterviewId === ai.id ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)', background: 'var(--card-bg, #1a1a2e)', transition: 'all 0.2s ease' }}>
                            <div 
                                onClick={() => {
                                    if (editingInterviewId !== ai.id) {
                                        setSelectedInterviewId(prev => prev === ai.id ? null : ai.id);
                                    }
                                }}
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    flexWrap: 'wrap', 
                                    gap: 12, 
                                    padding: '18px 22px', 
                                    cursor: 'pointer',
                                    background: selectedInterviewId === ai.id ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 240 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{ai.topic}</strong>
                                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#ccc', textTransform: 'capitalize' }}>
                                            {ai.difficulty}
                                        </span>
                                    </div>
                                    {/* Student sees company name and interviewer */}
                                    {!isInterviewer && (
                                        <p style={{ color: '#a78bfa', fontSize: '0.85rem', margin: '4px 0 2px' }}>
                                            🏢 {ai.company_name || 'AISaraj'} · Scheduled by {ai.interviewer?.first_name || ai.interviewer?.username || 'Interviewer'}
                                        </p>
                                    )}
                                    {/* Interviewer sees candidate name */}
                                    {isInterviewer && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 2px' }}>
                                            Candidate: <span style={{ color: '#fff', fontWeight: 500 }}>{getCandidateDisplay(ai)}</span>
                                        </p>
                                    )}
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0' }}>
                                        {ai.deadline ? `Deadline: ${formatDeadlineDisplay(ai.deadline)}` : `Scheduled: ${new Date(ai.scheduled_at).toLocaleDateString()}`}
                                        {ai.deadline && deadlinePassed(ai.deadline) && ai.status !== 'completed' && (
                                            <span style={{ color: '#f87171', marginLeft: 8, fontWeight: 600 }}>⏰ Expired</span>
                                        )}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <span className={`badge ${ai.status === 'completed' ? 'badge-success' : ai.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>
                                        {ai.status.toUpperCase()}
                                    </span>
                                    {/* Student: start/resume button if not completed and not expired */}
                                    {!isInterviewer && (ai.status === 'scheduled' || ai.status === 'in_progress') && !deadlinePassed(ai.deadline) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); navigate(`/ai-interview/${ai.id}/take`); }}
                                            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {ai.status === 'in_progress' ? 'Resume' : 'Start'}
                                        </button>
                                    )}
                                    {/* Interviewer: view report if completed */}
                                    {isInterviewer && ai.status === 'completed' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); viewReport(ai.id); }}
                                            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {expandedReport === ai.id ? 'Hide Report' : 'View Report'}
                                        </button>
                                    )}
                                    <span style={{ color: '#a78bfa', fontSize: '0.82rem', padding: '4px 8px', borderRadius: 6, background: 'rgba(167, 139, 250, 0.1)', fontWeight: 600 }}>
                                        {selectedInterviewId === ai.id ? '▲ Close' : '▼ Details'}
                                    </span>
                                </div>
                            </div>

                            {/* Expanded Full Information & Edit Section */}
                            {selectedInterviewId === ai.id && (
                                <div style={{ padding: '18px 22px 22px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                                    {editingInterviewId === ai.id ? (
                                        /* Inline Edit Form */
                                        <form onSubmit={(e) => handleSaveEdit(ai.id, e)} style={{ display: 'grid', gap: 16 }}>
                                            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                                                <strong style={{ color: '#a78bfa', fontSize: '1rem' }}>✏️ Edit Interview Details</strong>
                                            </div>

                                            {/* Candidate selection with search */}
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Candidate</span>
                                                <div 
                                                    onClick={() => setIsEditCandidateDropdownOpen(prev => !prev)}
                                                    style={{ 
                                                        padding: '10px 12px', borderRadius: 8, 
                                                        background: 'var(--bg-primary, #12121a)', color: '#fff', 
                                                        border: '1px solid #444', cursor: 'pointer', 
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                                                    }}
                                                >
                                                    <span>
                                                        {selectedEditStudent ? (
                                                            <>
                                                                <strong>{selectedEditStudent.first_name || ''} {selectedEditStudent.last_name || ''}</strong>
                                                                <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontSize: '0.85rem' }}>
                                                                    ({selectedEditStudent.email || selectedEditStudent.username})
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span style={{ color: '#888' }}>-- Select Candidate --</span>
                                                        )}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#a78bfa' }}>{isEditCandidateDropdownOpen ? '▲' : '▼'}</span>
                                                </div>

                                                {isEditCandidateDropdownOpen && (
                                                    <div style={{ 
                                                        position: 'absolute', top: '100%', left: 0, right: 0, 
                                                        zIndex: 100, background: '#1c1c2e', border: '1px solid #444', 
                                                        borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', 
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: 6 
                                                    }}>
                                                        <input
                                                            type="text"
                                                            placeholder="🔍 Search candidate by name, email..."
                                                            value={editCandidateSearch}
                                                            onChange={e => setEditCandidateSearch(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            autoFocus
                                                            style={{ 
                                                                width: '100%', padding: '8px 10px', borderRadius: 6, 
                                                                background: '#12121a', border: '1px solid #333', 
                                                                color: '#fff', fontSize: '0.85rem', marginBottom: 6, boxSizing: 'border-box' 
                                                            }}
                                                        />
                                                        {filteredEditStudents.length === 0 ? (
                                                            <div style={{ padding: 10, textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                                                                No matching candidates
                                                            </div>
                                                        ) : (
                                                            filteredEditStudents.map(s => {
                                                                const isSelected = String(s.id) === String(editForm.student);
                                                                return (
                                                                    <div
                                                                        key={s.id}
                                                                        onClick={() => {
                                                                            setEditForm(f => ({ ...f, student: String(s.id) }));
                                                                            setIsEditCandidateDropdownOpen(false);
                                                                        }}
                                                                        style={{ 
                                                                            padding: '8px 10px', borderRadius: 6, cursor: 'pointer', 
                                                                            background: isSelected ? 'rgba(108, 99, 255, 0.25)' : 'transparent',
                                                                            color: isSelected ? '#a78bfa' : '#eee', fontSize: '0.85rem',
                                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                                        }}
                                                                    >
                                                                        <span>{s.first_name || ''} {s.last_name || ''} ({s.email || s.username})</span>
                                                                        {isSelected && <span style={{ color: '#10b981' }}>✓</span>}
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Company Name */}
                                            <label style={{ display: 'block' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Company / Organization</span>
                                                <input 
                                                    type="text" 
                                                    value={editForm.company_name} 
                                                    onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                                                    placeholder="e.g. Google, Infosys..."
                                                    style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4, boxSizing: 'border-box' }} 
                                                />
                                            </label>

                                            {/* Tracks */}
                                            <div>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Interview Tracks</span>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                                    {TRACKS.map(t => (
                                                        <button 
                                                            key={t.key} 
                                                            type="button" 
                                                            onClick={() => toggleEditTrack(t.key)}
                                                            style={{
                                                                padding: '5px 12px', borderRadius: 8, border: '1px solid',
                                                                borderColor: editForm.selected_tracks.includes(t.key) ? '#6c63ff' : '#444',
                                                                background: editForm.selected_tracks.includes(t.key) ? 'rgba(108, 99, 255, 0.2)' : 'transparent',
                                                                color: editForm.selected_tracks.includes(t.key) ? '#a78bfa' : 'var(--text-secondary)',
                                                                cursor: 'pointer', fontSize: '0.82rem',
                                                            }}>
                                                            {editForm.selected_tracks.includes(t.key) ? '✓ ' : ''}{t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Subcategories */}
                                            {TRACKS.filter(t => editForm.selected_tracks.includes(t.key)).map(t => (
                                                <div key={t.key} style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                                                    <span style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600 }}>{t.label} Topics:</span>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                                        {t.subs.map(sub => {
                                                            const val = sub.toLowerCase();
                                                            const active = (editForm.selected_subcategories[t.key] || []).includes(val);
                                                            return (
                                                                <button 
                                                                    key={sub} 
                                                                    type="button" 
                                                                    onClick={() => toggleEditSub(t.key, sub)}
                                                                    style={{
                                                                        padding: '3px 10px', borderRadius: 6, border: '1px solid',
                                                                        borderColor: active ? '#10b981' : '#333',
                                                                        background: active ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                                                        color: active ? '#10b981' : 'var(--text-secondary)',
                                                                        cursor: 'pointer', fontSize: '0.78rem',
                                                                    }}>
                                                                    {active ? '✓ ' : ''}{sub}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Difficulty & Deadline */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <label>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Difficulty</span>
                                                    <select 
                                                        value={editForm.difficulty} 
                                                        onChange={e => setEditForm(f => ({ ...f, difficulty: e.target.value }))}
                                                        style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4, boxSizing: 'border-box' }}
                                                    >
                                                        <option value="easy">Easy</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="hard">Hard</option>
                                                    </select>
                                                </label>

                                                <label>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Last Date to Complete</span>
                                                    <input 
                                                        type="date" 
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={editForm.deadline} 
                                                        onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                                                        onClick={e => e.target.showPicker && e.target.showPicker()}
                                                        style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--bg-primary, #12121a)', color: '#fff', border: '1px solid #333', marginTop: 4, boxSizing: 'border-box', colorScheme: 'dark' }} 
                                                        required
                                                    />
                                                </label>
                                            </div>

                                            {editError && <p style={{ color: '#f87171', margin: '4px 0 0', fontSize: '0.85rem' }}>{editError}</p>}

                                            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                                <button 
                                                    type="submit" 
                                                    disabled={editLoading}
                                                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    {editLoading ? 'Saving...' : '💾 Save Changes'}
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={cancelEditing}
                                                    style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #444', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        /* Full Information View */
                                        <div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                                                {/* Candidate Information */}
                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <div style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                                        {isInterviewer ? '👤 Candidate Information' : '💼 Interviewer / Organization'}
                                                    </div>
                                                    {isInterviewer ? (
                                                        <>
                                                            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                                                                {ai.student?.first_name || ai.student?.last_name 
                                                                    ? `${ai.student?.first_name || ''} ${ai.student?.last_name || ''}`.trim() 
                                                                    : (ai.student?.username || `Candidate #${ai.student_id}`)}
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                                                                ✉️ {ai.student?.email || 'No email registered'}
                                                            </div>
                                                            {ai.student?.username && (
                                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                                    @{ai.student.username}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                                                                {ai.interviewer?.first_name || ai.interviewer?.last_name 
                                                                    ? `${ai.interviewer?.first_name || ''} ${ai.interviewer?.last_name || ''}`.trim() 
                                                                    : (ai.interviewer?.username || 'Interviewer')}
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                                                                ✉️ {ai.interviewer?.email || 'Recruiter'}
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: '#a78bfa', marginTop: 2 }}>
                                                                🏢 {ai.company_name || 'AISaraj'}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Assessment Scope */}
                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <div style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                                        🎯 Assessment Scope
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#eee', marginBottom: 4 }}>
                                                        <strong>Tracks:</strong> {(ai.selected_tracks || [ai.topic]).map(t => (
                                                            <span key={t} style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 4, background: 'rgba(108, 99, 255, 0.25)', color: '#c4b5fd', fontSize: '0.78rem' }}>
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#eee', marginBottom: 4 }}>
                                                        <strong>Difficulty:</strong> <span style={{ textTransform: 'capitalize', color: '#10b981', fontWeight: 600 }}>{ai.difficulty}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#eee' }}>
                                                        <strong>Company:</strong> {ai.company_name || 'AISaraj General Assessment'}
                                                    </div>
                                                </div>

                                                {/* Schedule & Timing */}
                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <div style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                                        ⏱️ Schedule & Timing
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                        Scheduled: {new Date(ai.scheduled_at).toLocaleString()}
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: deadlinePassed(ai.deadline) ? '#f87171' : '#10b981', fontWeight: 600, marginBottom: 4 }}>
                                                        Last Date: {formatDeadlineDisplay(ai.deadline)}
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                        Status: <span style={{ textTransform: 'uppercase', color: '#fff', fontWeight: 600 }}>{ai.status}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subcategories tags list only for Interviewer */}
                                            {isInterviewer && ai.selected_subcategories && Object.keys(ai.selected_subcategories).length > 0 && (
                                                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginRight: 8 }}>Focus Areas:</span>
                                                    <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {Object.entries(ai.selected_subcategories).flatMap(([track, subs]) => (subs || []).map(s => (
                                                            <span key={`${track}-${s}`} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.78rem' }}>
                                                                {s}
                                                            </span>
                                                        )))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons for Interviewer */}
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingTop: 6 }}>
                                                {isInterviewer && ai.status !== 'completed' && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => startEditing(ai, e)}
                                                            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #7c3aed', background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                                        >
                                                            ✏️ Edit Interview
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteConfirm({
                                                                    type: 'interview',
                                                                    id: ai.id,
                                                                    title: `${ai.topic} Assessment`,
                                                                    subtitle: ai.company_name ? `For ${ai.company_name}` : `Candidate: ${getCandidateDisplay(ai)}`
                                                                });
                                                            }}
                                                            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #dc2626', background: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                                        >
                                                            🗑️ Cancel & Delete
                                                        </button>
                                                    </>
                                                )}
                                                {isInterviewer && ai.status === 'completed' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); viewReport(ai.id); }}
                                                        style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                                    >
                                                        {expandedReport === ai.id ? 'Hide Report' : '📊 View Full Report'}
                                                    </button>
                                                )}
                                                {!isInterviewer && (ai.status === 'scheduled' || ai.status === 'in_progress') && !deadlinePassed(ai.deadline) && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/ai-interview/${ai.id}/take`); }}
                                                        style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                                    >
                                                        🚀 {ai.status === 'in_progress' ? 'Resume Interview' : 'Start Interview'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                            <div><strong>{r.selected_tracks?.includes?.('dsa') ? 'Code Quality' : 'Best Practices'}</strong><br />{r.code_quality}/20</div>
                                            <div><strong>{r.selected_tracks?.includes?.('dsa') ? 'Problem Solving' : 'Concept Clarity'}</strong><br />{r.problem_solving}/20</div>
                                            <div><strong>{r.selected_tracks?.includes?.('dsa') ? 'Optimization' : 'Performance'}</strong><br />{r.optimization}/15</div>
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
            {user?.role === 'student' && practiceSessions.length > 0 && (
                <>
                    <h2 style={{ marginBottom: 16 }}>Practice Sessions</h2>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', display: 'grid', gap: 12 }}>
                        {practiceSessions.slice(0, 20).map(s => (
                            <div key={s.id} style={{ position: 'relative' }}>
                                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingRight: 40 }}>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm({
                                                type: 'session',
                                                id: s.id,
                                                title: `${s.topic || 'Practice'} Session`,
                                                subtitle: `${s.difficulty || 'medium'} · ${new Date(s.started_at).toLocaleDateString()}${s.evaluation ? ` · Score: ${s.evaluation.total_score}/100` : ''}`
                                            });
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            border: '1px solid rgba(239, 68, 68, 0.22)',
                                            borderRadius: 8,
                                            color: '#f87171',
                                            cursor: 'pointer',
                                            padding: '6px 8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                            e.currentTarget.style.transform = 'scale(1.08)';
                                            e.currentTarget.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.35)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.22)';
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                        title="Delete Session"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            <line x1="10" y1="11" x2="10" y2="17" />
                                            <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                    </button>
                                    <div>
                                        <strong>{s.topic || 'Practice'}</strong>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {s.difficulty} · {new Date(s.started_at).toLocaleDateString()}
                                            {s.evaluation && <span style={{ color: '#10b981', marginLeft: 8 }}>Score: {s.evaluation.total_score}/100</span>}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'abandoned' ? 'badge-danger' : 'badge-warning'}`}>{s.status}</span>
                                        {s.status === 'completed' && s.evaluation && (
                                            <button
                                                onClick={() => setExpandedPracticeReport(expandedPracticeReport === s.id ? null : s.id)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    background: '#6c63ff',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {expandedPracticeReport === s.id ? 'Hide Report' : 'View Report'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedPracticeReport === s.id && s.evaluation && (() => {
                                    const r = s.evaluation;
                                    const raw = r.raw_ai_response || {};
                                    const hiringColor = (r.hiring_signal || '').includes('Hire')
                                        ? '#10b981'
                                        : r.hiring_signal === 'Consider'
                                            ? '#f59e0b'
                                            : '#f87171';
                                    return (
                                        <div className="card" style={{ marginTop: 10, padding: 20, borderLeft: `4px solid ${hiringColor}` }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                                                <div><strong>Total</strong><br /><span style={{ fontSize: '1.5rem', color: r.total_score >= 50 ? '#10b981' : '#f87171' }}>{r.total_score}/100</span></div>
                                                <div><strong>Communication</strong><br />{r.communication}/20</div>
                                                <div><strong>Technical</strong><br />{r.technical_depth}/25</div>
                                                <div><strong>{r.selected_tracks?.includes?.('dsa') ? 'Code Quality' : 'Best Practices'}</strong><br />{r.code_quality}/20</div>
                                                <div><strong>{r.selected_tracks?.includes?.('dsa') ? 'Optimization' : 'Performance'}</strong><br />{r.optimization}/15</div>
                                                <div><strong>{r.selected_tracks?.includes?.('dsa') ? 'Problem Solving' : 'Concept Clarity'}</strong><br />{r.problem_solving}/20</div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                                                <div className="card" style={{ padding: 12 }}>
                                                    <strong>🎯 Topic Relevance</strong>
                                                    <p style={{ marginTop: 4 }}>{raw.topic_relevance || 0}/10</p>
                                                </div>
                                                <div className="card" style={{ padding: 12 }}>
                                                    <strong>👁️ Proctoring</strong>
                                                    <p style={{ marginTop: 4 }}>{raw.proctoring_score || 0}/10</p>
                                                </div>
                                            </div>

                                            {(raw.detailed_feedback || '').trim() && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <strong>📝 Feedback</strong>
                                                    <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{raw.detailed_feedback}</p>
                                                </div>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <strong style={{ color: '#10b981' }}>Strengths</strong>
                                                    <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                                                        {(r.strengths || []).length > 0
                                                            ? r.strengths.map((v, i) => <li key={i} style={{ fontSize: '0.85rem' }}>{v}</li>)
                                                            : <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>None</li>}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <strong style={{ color: '#f87171' }}>Weaknesses</strong>
                                                    <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                                                        {(r.weaknesses || []).length > 0
                                                            ? r.weaknesses.map((v, i) => <li key={i} style={{ fontSize: '0.85rem' }}>{v}</li>)
                                                            : <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>None</li>}
                                                    </ul>
                                                </div>
                                            </div>

                                            <p style={{ marginTop: 12, fontSize: '0.9rem' }}>
                                                <strong>Hiring Signal: </strong>
                                                <span style={{ color: hiringColor, fontWeight: 700 }}>{r.hiring_signal || 'No Hire'}</span>
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </>
            )}
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <div className="card" style={{
                        maxWidth: 400,
                        width: '100%',
                        padding: '28px 32px',
                        textAlign: 'center',
                        borderRadius: 16,
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Confirm Logout</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 0 24px' }}>
                            Are you sure you want to log out of AISaraj?
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button 
                                type="button"
                                className="btn-secondary" 
                                style={{ flex: 1, padding: '10px 18px' }}
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                className="btn-primary" 
                                style={{ flex: 1, padding: '10px 18px', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    logout();
                                    navigate('/login');
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Glassmorphic Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(5, 5, 15, 0.82)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 3500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="card" style={{
                        maxWidth: 440,
                        width: '100%',
                        padding: '32px 28px',
                        textAlign: 'center',
                        borderRadius: 20,
                        background: 'rgba(18, 14, 32, 0.96)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(239, 68, 68, 0.2)'
                    }}>
                        {/* Glowing Red Trash Icon */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 68,
                            height: 68,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)',
                            marginBottom: 18
                        }}>
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </div>

                        <h3 style={{ margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                            Delete {deleteConfirm.type === 'interview' ? 'Scheduled Interview' : 'Practice Session'}?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 0 6px', lineHeight: 1.5 }}>
                            Are you sure you want to delete <span style={{ color: '#fff', fontWeight: 600 }}>{deleteConfirm.title}</span>?
                        </p>
                        {deleteConfirm.subtitle && (
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: '0 0 18px' }}>
                                {deleteConfirm.subtitle}
                            </p>
                        )}

                        <div style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.22)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            marginBottom: 24,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            textAlign: 'left'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <span style={{ fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.4 }}>
                                This action is permanent. All associated questions, code, transcripts, and evaluation scorecards will be erased.
                            </span>
                        </div>

                        {deleteConfirm.error && (
                            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 16 }}>
                                {deleteConfirm.error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ flex: 1, padding: '11px 18px', borderRadius: 10, cursor: deleteConfirm.loading ? 'not-allowed' : 'pointer' }}
                                onClick={() => !deleteConfirm.loading && setDeleteConfirm(null)}
                                disabled={deleteConfirm.loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                style={{
                                    flex: 1,
                                    padding: '11px 18px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.92rem',
                                    cursor: deleteConfirm.loading ? 'wait' : 'pointer',
                                    boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8
                                }}
                                onClick={handleConfirmDelete}
                                disabled={deleteConfirm.loading}
                            >
                                {deleteConfirm.loading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1-Click Role Selection Modal for First-Time Google Users */}
            {showRoleModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(5, 5, 12, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="card" style={{
                        maxWidth: 560,
                        width: '100%',
                        padding: '36px 36px 32px',
                        textAlign: 'center',
                        borderRadius: 20,
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(124, 58, 237, 0.25)',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                    }}>
                        <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: 16 }}>
                            <span style={{ fontSize: '2rem' }}>✨</span>
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px' }}>
                            Welcome to <span className="text-gradient">AISaraj</span>!
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', margin: '0 0 28px' }}>
                            How will you be using the platform? Choose your role to personalize your workspace:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 20 }}>
                            {/* Student Option */}
                            <div 
                                onClick={() => !roleUpdating && handleSelectRole('student')}
                                style={{
                                    padding: '24px 20px',
                                    borderRadius: 16,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid var(--border)',
                                    cursor: roleUpdating ? 'wait' : 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.25s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 10
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#8b5cf6';
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.25)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🎯</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Candidate</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    Practice AI technical mock interviews, track performance, and master coding tracks.
                                </div>
                            </div>

                            {/* Interviewer Option */}
                            <div 
                                onClick={() => !roleUpdating && handleSelectRole('interviewer')}
                                style={{
                                    padding: '24px 20px',
                                    borderRadius: 16,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid var(--border)',
                                    cursor: roleUpdating ? 'wait' : 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.25s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 10
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#a855f7';
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.25)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>💼</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Interviewer / Recruiter</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    Schedule AI interviews for candidates, evaluate reports, and assess readiness.
                                </div>
                            </div>
                        </div>

                        {roleUpdating && (
                            <p style={{ color: '#a78bfa', fontSize: '0.88rem', margin: '10px 0 0' }}>
                                Setting up your workspace...
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
