import client from './client';

export const createSession = (data) => client.post('/ai-practice/sessions/', data);
export const listSessions = () => client.get('/ai-practice/sessions/list/');
export const getSession = (id) => client.get(`/ai-practice/sessions/${id}/`);
export const startQuestions = (sessionId) => client.post(`/ai-practice/sessions/${sessionId}/start-questions/`);

export const acknowledgeAnswer = (sessionId, questionId, answerText) =>
    client.post(`/ai-practice/sessions/${sessionId}/acknowledge/`, {
        question_id: questionId,
        answer_text: answerText,
    });

export const nextQuestion = (sessionId) => client.post(`/ai-practice/sessions/${sessionId}/next-question/`);
export const getLeetCode = (sessionId) => client.post(`/ai-practice/sessions/${sessionId}/leetcode/`);
export const submitAnswer = (sessionId, data) => client.post(`/ai-practice/sessions/${sessionId}/submit/`, data);
export const evaluate = (sessionId, data) => client.post(`/ai-practice/sessions/${sessionId}/evaluate/`, data);
