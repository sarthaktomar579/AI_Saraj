import client from './client';

export const register = (data) => client.post('/auth/register/', data);
export const login = (data) => client.post('/auth/login/', data);
export const refreshToken = (refresh) => client.post('/auth/refresh/', { refresh });
export const getProfile = () => client.get('/auth/me/');
export const updateProfile = (data) => client.put('/auth/me/', data);
