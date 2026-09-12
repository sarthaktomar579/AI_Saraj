import client from './client';

export const createSession = (data) => client.post('/practice', data);
export const listSessions = () => client.get('/practice');
export const getSession = (id) => client.get(`/practice/${id}`);
export const startQuestions = (sessionId) => client.post(`/practice/${sessionId}/questions/start`);

export const acknowledgeAnswer = (sessionId, questionId, answerText) =>
    client.post(`/practice/${sessionId}/questions/acknowledge`, {
        question_id: questionId,
        text_answer: answerText,
    });

export const nextQuestion = (sessionId) => client.post(`/practice/${sessionId}/questions/next`);
export const getLeetCode = (sessionId) => client.post(`/practice/${sessionId}/leetcode`);
export const submitAnswer = (sessionId, data) => client.post(`/practice/${sessionId}/submit`, data);
export const evaluate = (sessionId, data) => client.post(`/practice/${sessionId}/evaluate`, data);
export const deleteSession = (sessionId) => client.delete(`/practice/${sessionId}`);
