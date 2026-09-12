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
            setError(err.response?.data?.detail || 'Google sign-in failed');
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-shell-inner">
                <div className="card" style={{ width: 400, maxWidth: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                        <img 
                            src="/handshake_logo.png" 
                            alt="AISaraj Logo" 
                            style={{ 
                                width: 68, 
                                height: 68, 
                                objectFit: 'cover', 
                                borderRadius: '50%', 
                                border: '2px solid rgba(139, 92, 246, 0.4)',
                                boxShadow: '0 0 24px rgba(124, 58, 237, 0.5)',
                                marginBottom: 12
                            }} 
                        />
                        <h1 style={{ textAlign: 'center', margin: 0, fontSize: '2rem' }}>
                            <span style={{ background: 'linear-gradient(135deg, #6c63ff, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AISaraj</span>
                        </h1>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 20 }}>Sign in to your account</p>
                    {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
                    
                    <div style={{ marginBottom: 14 }}>
                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google sign-in was unsuccessful')}
                            text="Sign in with Google"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 18px', gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or continue with credentials</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 16 }}>
                            <label>Username</label>
                            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label>Password</label>
                            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Sign In</button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)' }}>
                        No account? <Link to="/register">Register</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
