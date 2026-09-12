import React, { createContext, useState } from 'react';

export const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
    const [activeInterview, setActiveInterview] = useState(null);
    const [codeState, setCodeState] = useState({ language: 'python', code: '' });

    return (
        <InterviewContext.Provider value={{
            activeInterview, setActiveInterview,
            codeState, setCodeState,
        }}>
            {children}
        </InterviewContext.Provider>
    );
}
