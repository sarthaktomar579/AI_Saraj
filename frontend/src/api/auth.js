import client from './client';

export const register = (data) => client.post('/auth/register', data);
export const login = (data) => {
    // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', data.email || data.username);
    formData.append('password', data.password);
    return client.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
};
// getProfile doesn't exist on the backend yet, but formatting the path anyway
export const getProfile = () => client.get('/auth/me');
export const updateProfile = (data) => client.put('/auth/me', data);
export const googleLogin = (credential, role = 'student') => client.post('/auth/google', { credential, role });
