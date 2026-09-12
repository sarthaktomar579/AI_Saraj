import React, { useEffect, useState } from 'react';
import './AppIntro.css';

const AppIntro = ({ onComplete }) => {
    const [phase, setPhase] = useState('reach'); // reach -> climax -> fadeout

    useEffect(() => {
        // Timeline for the animation
        const climaxTimer = setTimeout(() => {
            setPhase('climax');
        }, 3200); // 2.5s for hands to slide in + 0.7s hold

        const fadeOutTimer = setTimeout(() => {
            setPhase('fadeout');
        }, 5800); // Wait 5.8s total before fading out

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 6800); // fade out duration 1s

        return () => {
            clearTimeout(climaxTimer);
            clearTimeout(fadeOutTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`app-intro-overlay ${phase === 'fadeout' ? 'fade-out' : ''}`}>
            {/* Human hand comes from the left */}
            <div className={`hand-container human-hand ${phase === 'reach' ? 'slide-in' : 'hide'}`}>
                <img src="/human_hand_right.png" alt="Human Hand" />
            </div>
            
            {/* Robot hand comes from the right */}
            <div className={`hand-container robot-hand ${phase === 'reach' ? 'slide-in' : 'hide'}`}>
                <img src="/robot_hand_left.png" alt="Robot Hand" />
            </div>

            {/* The handshake climax image and text */}
            <div className={`climax-container ${phase === 'climax' ? 'show' : ''} ${phase === 'reach' ? 'hide' : ''}`}>
                <img src="/handshake_logo.png" alt="AISaraj Handshake" className="climax-logo" />
                <div className="climax-text">
                    <h1 className="text-gradient logo-text">AISaraj</h1>
                    <p className="subtitle">Intelligent Interviews</p>
                </div>
            </div>
        </div>
    );
};

export default AppIntro;
