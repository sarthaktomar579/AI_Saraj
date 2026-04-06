import client from './client';

export const createInterview = (data) => client.post('/interviews/', data);
export const listInterviews = () => client.get('/interviews/list/');
export const getInterview = (id) => client.get(`/interviews/${id}/`);
export const getVideoToken = (id) => client.post(`/interviews/${id}/video-token/`);
export const submitFeedback = (id, data) => client.post(`/interviews/${id}/feedback/`, data);
export const getFeedback = (id) => client.get(`/interviews/${id}/feedback/`);
export const submitCode = (id, data) => client.post(`/interviews/${id}/code-submit/`, data);
