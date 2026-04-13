import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'student', first_name: '', last_name: '' });
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await register(form);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail?.username?.[0] || 'Registration failed');
        }
    };

    const update = (key, val) => setForm({ ...form, [key]: val });

    return (
        <div className="auth-shell">
            <div className="auth-shell-inner">
                <div className="card" style={{ width: 440, maxWidth: '100%' }}>
                    <h1 style={{ textAlign: 'center', marginBottom: 24 }}>
                        <span style={{ background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create Account</span>
                    </h1>
                    {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
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
