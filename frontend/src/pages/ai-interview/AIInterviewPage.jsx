import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAIInterview, startAIInterview, nextQuestion, submitAnswer, uploadRecording, completeInterview } from '../../api/aiInterview';
import CodeEditor from '../../components/CodeEditor/CodeEditor';
import SessionRecorder from '../../components/Recorder/SessionRecorder';
import { useCodeExecution } from '../../hooks/useCodeExecution';

export default function AIInterviewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [interview, setInterview] = useState(null);
    const [question, setQuestion] = useState(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [codeAnswer, setCodeAnswer] = useState('');
    const [language, setLanguage] = useState('python');
    const [loading, setLoading] = useState(false);
    const { result, running, execute } = useCodeExecution();

    useEffect(() => {
        getAIInterview(id).then(r => setInterview(r.data)).catch(() => { });
    }, [id]);

    const handleStart = async () => {
        await startAIInterview(id);
        const q = await nextQuestion(id);
        setQuestion(q.data);
        setInterview(prev => ({ ...prev, status: 'in_progress' }));
    };

    const handleNext = async () => {
        setLoading(true);
        await submitAnswer(id, { question_id: question.id, text_answer: textAnswer, code_answer: codeAnswer, language });
        setTextAnswer(''); setCodeAnswer('');
        const q = await nextQuestion(id);
        setQuestion(q.data);
        setLoading(false);
    };

    const handleRecordingComplete = async (blob) => {
        const formData = new FormData();
        formData.append('recording', blob, 'recording.webm');
        await uploadRecording(id, formData);
    };

    const handleComplete = async () => {
        setLoading(true);
        if (question) {
            await submitAnswer(id, { question_id: question.id, text_answer: textAnswer, code_answer: codeAnswer, language });
        }
        await completeInterview(id);
        navigate('/dashboard');
    };

    if (!interview) return <div className="container">Loading...</div>;

    if (interview.status === 'scheduled') {
        const expired = interview.deadline && new Date(interview.deadline) < new Date();
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ width: 460, textAlign: 'center' }}>
                    <h1 style={{ marginBottom: 8 }}>AI Interview</h1>
                    {interview.company_name && (
                        <p style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 8 }}>🏢 {interview.company_name}</p>
                    )}
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Topic: <strong>{interview.topic}</strong></p>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Difficulty: <strong>{interview.difficulty}</strong></p>
                    {interview.deadline && (
                        <p style={{ color: expired ? '#f87171' : 'var(--text-secondary)', marginBottom: 8 }}>
                            Deadline: <strong>{new Date(interview.deadline).toLocaleString()}</strong>
                            {expired && ' (Expired)'}
                        </p>
                    )}
                    {interview.interviewer && (
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
                            Scheduled by: {interview.interviewer.first_name || interview.interviewer.username}
                        </p>
                    )}
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.85rem' }}>
                        Your webcam and mic will be recorded. Results will be sent to the interviewer.
                    </p>
                    {expired ? (
                        <p style={{ color: '#f87171', fontWeight: 600 }}>This interview has expired. Contact your interviewer.</p>
                    ) : (
                        <button className="btn-primary" onClick={handleStart} style={{ width: '100%' }}>Begin Interview</button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                <div>
                    <h2 style={{ marginBottom: 12 }}>Question {question?.order + 1}</h2>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <span className={`badge ${question?.difficulty_level === 'hard' ? 'badge-danger' : question?.difficulty_level === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                            {question?.difficulty_level}
                        </span>
                        <p style={{ marginTop: 12, fontSize: '1.05rem' }}>{question?.question_text}</p>
                    </div>
                    <div style={{ marginBottom: 12 }}><label>Answer</label><textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} rows={3} /></div>
                    {question?.question_type === 'coding' && (
                        <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: 'auto' }}>
                                    <option value="python">Python</option><option value="javascript">JavaScript</option>
                                </select>
                                <button className="btn-secondary" onClick={() => execute(language, codeAnswer)} disabled={running}>▶ Run</button>
                            </div>
                            <CodeEditor language={language} value={codeAnswer} onChange={setCodeAnswer} height="250px" />
                            {result && <pre className="card" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{result.stdout || result.stderr}</pre>}
                        </>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <button className="btn-primary" onClick={handleNext} disabled={loading}>Next →</button>
                        <button className="btn-secondary" onClick={handleComplete} disabled={loading}>Finish Interview</button>
                    </div>
                </div>
                <div><SessionRecorder onRecordingComplete={handleRecordingComplete} /></div>
            </div>
        </div>
    );
}
