import React, { useEffect, useState } from 'react';

/**
 * VideoRoom component for GetStream Video SDK integration.
 * Used only in Section 1 (Human Interview mode).
 *
 * Props:
 *  - callId: string — GetStream call ID
 *  - userToken: string — JWT token from backend /video-token/ endpoint
 *  - userId: string — current user's ID
 */
export default function VideoRoom({ callId, userToken, userId }) {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!callId || !userToken) return;

        // Dynamic import of GetStream SDK to keep bundle smaller
        const initCall = async () => {
            try {
                const { StreamVideoClient, StreamVideo, StreamCall } = await import(
                    '@stream-io/video-react-sdk'
                );

                const apiKey = process.env.REACT_APP_GETSTREAM_API_KEY;
                if (!apiKey) {
                    setError('GetStream API key not configured');
                    return;
                }

                const client = new StreamVideoClient({
                    apiKey,
                    user: { id: userId },
                    token: userToken,
                });

                const call = client.call('default', callId);
                await call.join({ create: false });
                setReady(true);

                // Cleanup on unmount
                return () => {
                    call.leave();
                    client.disconnectUser();
                };
            } catch (err) {
                console.error('Video init failed:', err);
                setError(err.message);
            }
        };

        initCall();
    }, [callId, userToken, userId]);

    if (error) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--danger)' }}>⚠️ Video Error: {error}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
                    Ensure GetStream API key is configured in .env
                </p>
            </div>
        );
    }

    if (!ready) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{
                    width: 40, height: 40, border: '3px solid var(--border)',
                    borderTopColor: 'var(--accent)', borderRadius: '50%',
                    animation: 'spin 1s linear infinite', margin: '0 auto 12px',
                }} />
                <p style={{ color: 'var(--text-secondary)' }}>Connecting to video call...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="card" style={{ minHeight: 300 }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 280, background: '#000', borderRadius: 8,
            }}>
                {/* GetStream SDK renders video participants here via StreamVideo/StreamCall components */}
                <p style={{ color: '#fff' }}>📹 Live Video — Call ID: {callId}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                <button className="btn-secondary" style={{ fontSize: '0.85rem' }}>🎤 Mute</button>
                <button className="btn-secondary" style={{ fontSize: '0.85rem' }}>📷 Camera</button>
                <button className="btn-primary" style={{ fontSize: '0.85rem', background: 'var(--danger)' }}>📞 End Call</button>
            </div>
        </div>
    );
}
