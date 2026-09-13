import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleSignInButton from '../../components/common/GoogleSignInButton';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        document.body.classList.add('signin-background');
        return () => {
            document.body.classList.remove('signin-background');
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(form);
            navigate('/dashboard');
        } catch {
            setError('Invalid credentials');
        }
    };

    const handleGoogleSuccess = async (tokenData) => {
        try {
            setError('');
            await loginWithGoogle(tokenData);
            navigate('/dashboard');
        } catch (err) {
            console.error('Google login error:', err);
            const detail = err.response?.data?.detail;
            let msg = 'Google sign-in failed';
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

    return (
        <div className="auth-shell">
            <div className="auth-wrapper">
                <div className="auth-form-side">
                    <div 
                        onClick={() => navigate('/dashboard')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14, cursor: 'pointer' }}
                        title="AISaraj Home"
                    >
                        <img 
                            src="/handshake_logo.png" 
                            alt="AISaraj Logo" 
                            style={{ 
                                width: 64, 
                                height: 64, 
                                objectFit: 'cover', 
                                borderRadius: '50%', 
                                border: '2px solid rgba(139, 92, 246, 0.4)',
                                boxShadow: '0 0 24px rgba(124, 58, 237, 0.5)',
                                marginBottom: 10
                            }} 
                        />
                        <h1 style={{ textAlign: 'center', margin: 0, fontSize: '1.95rem' }}>
                            <span style={{ background: 'linear-gradient(135deg, #6c63ff, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AISaraj</span>
                        </h1>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 18, fontSize: '0.92rem' }}>Sign in to your account</p>
                    {error && <p style={{ color: 'var(--danger)', marginBottom: 12, textAlign: 'center', fontSize: '0.88rem' }}>{error}</p>}
                    
                    <div style={{ marginBottom: 12 }}>
                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google sign-in was unsuccessful')}
                            text="Sign in with Google"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 16px', gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>or continue with credentials</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 5, display: 'block', color: 'var(--text-secondary)' }}>Username</label>
                            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 5, display: 'block', color: 'var(--text-secondary)' }}>Password</label>
                            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px 24px', fontSize: '0.98rem', fontWeight: 700, borderRadius: 12 }}>Sign In</button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        No account? <Link to="/register" style={{ color: '#a78bfa', fontWeight: 600 }}>Register</Link>
                    </p>
                </div>

                <div className="auth-showcase-side">
                    <div className="auth-showcase-badge">
                        ✨ Autonomous Interview AI
                    </div>
                    <div className="auth-showcase-img-wrap">
                        <img src="/ai-saraj-avatar.png" alt="AISaraj Interviewer" className="auth-showcase-img" />
                    </div>
                    <h2 className="auth-showcase-title">Master Your Tech Interviews</h2>
                    <div className="auth-feature-pills" style={{ marginTop: 8 }}>
                        <span className="auth-pill">🗣️ Real-time Voice</span>
                        <span className="auth-pill">👁️ Smart Proctor</span>
                        <span className="auth-pill">⚡ Instant Feedback</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
