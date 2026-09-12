import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';
import AppIntro from './components/AppIntro';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function App() {
    // Show intro on every hard refresh
    const [showIntro, setShowIntro] = useState(true);

    const handleIntroComplete = () => {
        setShowIntro(false);
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                {showIntro && <AppIntro onComplete={handleIntroComplete} />}
                <AppRouter />
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;
