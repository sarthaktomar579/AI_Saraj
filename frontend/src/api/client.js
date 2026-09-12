import axios from 'axios';

const client = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Remove automatic refresh logic since FastAPI backend currently uses simple JWT without refresh endpoints
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            // Avoid redirect loops if already on login
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
