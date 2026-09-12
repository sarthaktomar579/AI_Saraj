import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInterview, submitCode } from '../../api/interviews';
import CodeEditor from '../../components/CodeEditor/CodeEditor';
import { useCodeExecution } from '../../hooks/useCodeExecution';

export default function InterviewRoomPage() {
    const { id } = useParams();
    const [interview, setInterview] = useState(null);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('python');
    const { result, running, execute } = useCodeExecution();

    useEffect(() => {
        getInterview(id).then(r => setInterview(r.data)).catch(() => { });
    }, [id]);

    const handleRun = async () => {
        await execute(language, code);
        await submitCode(id, { language, source_code: code });
    };

    if (!interview) return <div className="container">Loading...</div>;

    return (
        <div className="container">
            <h1 style={{ marginBottom: 8 }}>{interview.title}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{interview.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Video area placeholder */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                    <h3>📹 Video Call</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>GetStream video will render here</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Call ID: {interview.video_call_id || 'N/A'}</p>
                </div>

                {/* Code editor */}
                <div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                        <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: 'auto' }}>
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                        <button className="btn-primary" onClick={handleRun} disabled={running}>
                            {running ? '⏳ Running...' : '▶ Run Code'}
                        </button>
                    </div>
                    <CodeEditor language={language} value={code} onChange={setCode} height="300px" />
                    {result && (
                        <div className="card" style={{ marginTop: 12 }}>
                            <h4>Output</h4>
                            <pre style={{ whiteSpace: 'pre-wrap', color: result.exit_code === 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {result.stdout || result.stderr || '(no output)'}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
