import { useState, useRef, useCallback } from 'react';

export function useMediaRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);

    const startRecording = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true,
        });
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus',
        });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.current.push(e.data);
        };
        recorder.start(30000);
        mediaRecorder.current = recorder;
        setIsRecording(true);
    }, []);

    const stopRecording = useCallback(() => {
        return new Promise((resolve) => {
            if (!mediaRecorder.current) { resolve(null); return; }
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: 'video/webm' });
                chunks.current = [];
                setIsRecording(false);
                resolve(blob);
            };
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
        });
    }, []);

    return { isRecording, startRecording, stopRecording };
}
