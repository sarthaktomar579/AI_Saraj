import client from './client';

export const executeCode = (data) => client.post('/code/execute/', data);
export const getLanguages = () => client.get('/code/languages/');
