import client from './client';

export const scheduleAIInterview = (data) => client.post('/ai_interviews', data);
export const listAIInterviews = () => client.get('/ai_interviews');
export const listStudents = () => client.get('/ai_interviews/students');
export const getAIInterview = (id) => client.get(`/ai_interviews/${id}`);
export const startAIInterview = (id) => client.patch(`/ai_interviews/${id}/start`);
export const nextQuestion = (id, index) => client.post(`/ai_interviews/${id}/questions/next?current_index=${index || 0}`);
export const submitAnswer = (id, data) => client.post(`/ai_interviews/${id}/submit`, data);
export const uploadRecording = (id, formData) =>
    client.post(`/ai_interviews/${id}/recording`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const completeInterview = (id) => client.post(`/ai_interviews/${id}/complete`);
export const saveInterviewReport = (id, data) => client.post(`/ai_interviews/${id}/report`, data);
export const getReport = (id) => client.get(`/ai_interviews/${id}/report`);
export const updateAIInterview = (id, data) => client.put(`/ai_interviews/${id}`, data);
export const deleteAIInterview = (id) => client.delete(`/ai_interviews/${id}`);
