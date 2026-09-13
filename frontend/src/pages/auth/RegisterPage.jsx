import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleSignInButton from '../../components/common/GoogleSignInButton';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'student', first_name: '', last_name: '' });
    const [error, setError] = useState('');
    const { register, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        document.body.classList.add('signin-background');
        return () => {
            document.body.classList.remove('signin-background');
        };
    }, []);

    const handleGoogleSuccess = async (tokenData) => {
        try {
            setError('');
            await loginWithGoogle(tokenData, form.role);
            navigate('/dashboard');
        } catch (err) {
            console.error('Google registration error:', err);
            const detail = err.response?.data?.detail;
            let msg = 'Google registration failed';
            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                msg = `${detail[0].loc?.slice(-1)[0] || 'Field'}: ${detail[0].msg}`;
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await register(form);
            navigate('/dashboard');
        } catch (err) {
            let errorMsg = 'Registration failed';
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                errorMsg = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                errorMsg = `${detail[0].loc?.slice(-1)[0] || 'Field'}: ${detail[0].msg}`;
            }
            setError(errorMsg);
        }
    };

    const update = (key, val) => setForm({ ...form, [key]: val });

    return (
        <div className="auth-shell">
            <div className="auth-wrapper">
                <div className="auth-form-side" style={{ padding: '34px 36px' }}>
                    <div 
                        onClick={() => navigate('/dashboard')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}
                        title="AISaraj Home"
                    >
                        <img 
                            src="/handshake_logo.png" 
                            alt="AISaraj Logo" 
                            style={{ 
                                width: 56, 
                                height: 56, 
                                objectFit: 'cover', 
                                borderRadius: '50%', 
                                border: '2px solid rgba(139, 92, 246, 0.4)',
                                boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
                                marginBottom: 4
                            }} 
                        />
                        <span className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                            AISaraj
                        </span>
                        <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create your account</p>
                    </div>

                    {error && <p style={{ color: 'var(--danger)', marginBottom: 8, fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
                    
                    <div style={{ marginBottom: 10 }}>
                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google sign-up was unsuccessful')}
                            text="Sign up with Google"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0 12px', gap: 14 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or register with email</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>First Name</label>
                                <input style={{ padding: '9px 12px', borderRadius: 10, fontSize: '0.9rem' }} value={form.first_name} onChange={e => update('first_name', e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Last Name</label>
                                <input style={{ padding: '9px 12px', borderRadius: 10, fontSize: '0.9rem' }} value={form.last_name} onChange={e => update('last_name', e.target.value)} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 10 }}>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Username</label>
                                <input style={{ padding: '9px 12px', borderRadius: 10, fontSize: '0.9rem' }} value={form.username} onChange={e => update('username', e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Role</label>
                                <select style={{ padding: '9px 12px', borderRadius: 10, fontSize: '0.9rem' }} value={form.role} onChange={e => update('role', e.target.value)}>
                                    <option value="student">Candidate</option>
                                    <option value="interviewer">Interviewer</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Email</label>
                            <input style={{ padding: '9px 12px', borderRadius: 10, fontSize: '0.9rem' }} type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Password</label>
                            <input style={{ padding: '9px 12px', borderRadius: 10, fontSize: '0.9rem' }} type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} />
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '11px 24px', fontSize: '0.96rem', fontWeight: 700, borderRadius: 12 }}>Create Account</button>
                    </form>
                    
                    <p style={{ textAlign: 'center', marginTop: 14, marginBottom: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Have an account? <Link to="/login" style={{ color: '#a78bfa', fontWeight: 600 }}>Sign In</Link>
                    </p>
                </div>

                <div className="auth-showcase-side">
                    <div className="auth-showcase-badge">
                        🚀 Accelerate Your Career
                    </div>
                    <div className="auth-showcase-img-wrap">
                        <img src="/ai-saraj-avatar.png" alt="AISaraj Interviewer" className="auth-showcase-img" />
                    </div>
                    <h2 className="auth-showcase-title">Join AISaraj Today</h2>
                    <div className="auth-feature-pills" style={{ marginTop: 8 }}>
                        <span className="auth-pill">🎯 Curated Tracks</span>
                        <span className="auth-pill">💻 Interactive Code</span>
                        <span className="auth-pill">📈 Detailed Reports</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
