import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';
import AppIntro from './components/AppIntro';

function App() {
    // Show intro on every hard refresh
    const [showIntro, setShowIntro] = useState(true);

    const handleIntroComplete = () => {
        setShowIntro(false);
    };

    return (
        <AuthProvider>
            {showIntro && <AppIntro onComplete={handleIntroComplete} />}
            <AppRouter />
        </AuthProvider>
    );
}

export default App;
