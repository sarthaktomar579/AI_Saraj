import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({
    language = 'python',
    value = '',
    onChange,
    height = '400px',
    readOnly = false,
}) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <Editor
                height={height}
                language={language}
                value={value}
                onChange={onChange}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', monospace",
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    readOnly,
                    automaticLayout: true,
                }}
            />
        </div>
    );
}
