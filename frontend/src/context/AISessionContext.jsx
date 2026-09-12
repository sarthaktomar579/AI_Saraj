import React, { createContext, useState } from 'react';

export const AISessionContext = createContext(null);

export function AISessionProvider({ children }) {
    const [session, setSession] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [evaluation, setEvaluation] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);

    const addToHistory = (question, answer) => {
        setQuestionHistory((prev) => [...prev, { question, answer }]);
    };

    const resetSession = () => {
        setSession(null);
        setCurrentQuestion(null);
        setEvaluation(null);
        setQuestionHistory([]);
    };

    return (
        <AISessionContext.Provider value={{
            session, setSession,
            currentQuestion, setCurrentQuestion,
            evaluation, setEvaluation,
            questionHistory, addToHistory,
            resetSession,
        }}>
            {children}
        </AISessionContext.Provider>
    );
}
