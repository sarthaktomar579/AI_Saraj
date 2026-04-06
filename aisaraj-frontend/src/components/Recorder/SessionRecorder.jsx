import React, { useRef, useEffect } from 'react';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';

export default function SessionRecorder({ onRecordingComplete }) {
    const videoRef = useRef(null);
    const { isRecording, startRecording, stopRecording } = useMediaRecorder();

    useEffect(() => {
        // Show live preview
        if (isRecording && videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => { videoRef.current.srcObject = stream; });
        }
    }, [isRecording]);

    const handleStop = async () => {
        const blob = await stopRecording();
        if (blob && onRecordingComplete) {
            onRecordingComplete(blob);
        }
    };

    return (
        <div className="card" style={{ textAlign: 'center' }}>
            <video
                ref={videoRef}
                autoPlay muted playsInline
                style={{
                    width: '100%', maxWidth: 320, borderRadius: 8,
                    background: '#000', marginBottom: 12,
                }}
            />
            <div>
                {!isRecording ? (
                    <button className="btn-primary" onClick={startRecording}>
                        🔴 Start Recording
                    </button>
                ) : (
                    <button className="btn-secondary" onClick={handleStop}>
                        ⬛ Stop Recording
                    </button>
                )}
            </div>
        </div>
    );
}
