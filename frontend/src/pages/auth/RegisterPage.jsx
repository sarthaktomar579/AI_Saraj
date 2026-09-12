import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'student', first_name: '', last_name: '' });
    const [error, setError] = useState('');
    const { register, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setError('');
            await loginWithGoogle(credentialResponse.credential, form.role);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Google registration failed');
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
                // e.g. [{ loc: ["body", "email"], msg: "field required" }]
                errorMsg = `${detail[0].loc?.slice(-1)[0] || 'Field'}: ${detail[0].msg}`;
            }
            setError(errorMsg);
        }
    };

    const update = (key, val) => setForm({ ...form, [key]: val });

    return (
        <div className="auth-shell">
            <div className="auth-shell-inner">
                <div className="card" style={{ width: 440, maxWidth: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                        <img 
                            src="/handshake_logo.png" 
                            alt="AISaraj Logo" 
                            style={{ 
                                width: 56, 
                                height: 56, 
                                objectFit: 'cover', 
                                borderRadius: '50%', 
                                border: '2px solid rgba(139, 92, 246, 0.4)',
                                boxShadow: '0 0 20px rgba(124, 58, 237, 0.45)',
                                marginBottom: 8
                            }} 
                        />
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', background: 'linear-gradient(135deg, #6c63ff, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            AISaraj
                        </span>
                    </div>
                    <h2 style={{ textAlign: 'center', marginBottom: 16, fontSize: '1.4rem' }}>Create Account</h2>
                    {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google sign-up was unsuccessful')}
                            theme="filled_black"
                            shape="pill"
                            size="large"
                            text="signup_with"
                            width="340"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 18px', gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or register with email</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div><label>First Name</label><input value={form.first_name} onChange={e => update('first_name', e.target.value)} /></div>
                            <div><label>Last Name</label><input value={form.last_name} onChange={e => update('last_name', e.target.value)} /></div>
                        </div>
                        <div style={{ marginBottom: 12 }}><label>Username</label><input value={form.username} onChange={e => update('username', e.target.value)} required /></div>
                        <div style={{ marginBottom: 12 }}><label>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} required /></div>
                        <div style={{ marginBottom: 12 }}><label>Password</label><input type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} /></div>
                        <div style={{ marginBottom: 24 }}>
                            <label>Role</label>
                            <select value={form.role} onChange={e => update('role', e.target.value)}>
                                <option value="student">Student</option>
                                <option value="interviewer">Interviewer</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Register</button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)' }}>
                        Have an account? <Link to="/login">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
