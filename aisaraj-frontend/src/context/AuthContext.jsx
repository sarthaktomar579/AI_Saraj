import React, { createContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, register as registerApi, getProfile } from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) { setLoading(false); return; }
            const { data } = await getProfile();
            setUser(data);
        } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const login = async (credentials) => {
        const { data } = await loginApi(credentials);
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        await fetchProfile();
    };

    const register = async (userData) => {
        await registerApi(userData);
        await login({ username: userData.username, password: userData.password });
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
