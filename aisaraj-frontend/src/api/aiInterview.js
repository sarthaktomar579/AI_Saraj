import client from './client';

export const scheduleAIInterview = (data) => client.post('/ai-interviews/', data);
export const listAIInterviews = () => client.get('/ai-interviews/list/');
export const listStudents = () => client.get('/ai-interviews/students/');
export const getAIInterview = (id) => client.get(`/ai-interviews/${id}/`);
export const startAIInterview = (id) => client.patch(`/ai-interviews/${id}/start/`);
export const nextQuestion = (id) => client.post(`/ai-interviews/${id}/next-question/`);
export const submitAnswer = (id, data) => client.post(`/ai-interviews/${id}/submit-answer/`, data);
export const uploadRecording = (id, formData) =>
    client.post(`/ai-interviews/${id}/upload-recording/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const completeInterview = (id) => client.post(`/ai-interviews/${id}/complete/`);
export const saveInterviewReport = (id, data) => client.post(`/ai-interviews/${id}/save-report/`, data);
export const getReport = (id) => client.get(`/ai-interviews/${id}/report/`);
