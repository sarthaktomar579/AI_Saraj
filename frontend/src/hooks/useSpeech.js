import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useSpeech — TTS + STT with auto-listen and silence auto-advance.
 * Uses a simple setInterval-based silence detector instead of relying on
 * SpeechRecognition events (which are unreliable for silence detection).
 */
export function useSpeech() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const lastSpeechTimeRef = useRef(0);
    const silenceCheckRef = useRef(null);
    const finalTranscriptRef = useRef('');

    const activeUtteranceRef = useRef(null);
    const speechTimeoutRef = useRef(null);

    const stopSpeaking = useCallback(() => {
        if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
        }
        activeUtteranceRef.current = null;
        window.__aisarajUtterance = null;
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) { }
        }
        setIsSpeaking(false);
    }, []);

    // ── Text-to-Speech ──
    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (!text || !window.speechSynthesis) {
                resolve();
                return;
            }

            // Stop any ongoing speech and watchdog
            stopSpeaking();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 0.9;
            utterance.volume = 1;

            const voices = window.speechSynthesis.getVoices() || [];
            const preferred = voices.find(v =>
                v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
            ) || voices.find(v =>
                v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Google'))
            ) || voices.find(v => v.lang.startsWith('en'));

            if (preferred) utterance.voice = preferred;

            // Anchor utterance to prevent Chrome V8 garbage collection mid-speech
            activeUtteranceRef.current = utterance;
            window.__aisarajUtterance = utterance;

            let finished = false;
            const finish = () => {
                if (finished) return;
                finished = true;
                if (speechTimeoutRef.current) {
                    clearTimeout(speechTimeoutRef.current);
                    speechTimeoutRef.current = null;
                }
                activeUtteranceRef.current = null;
                window.__aisarajUtterance = null;
                setIsSpeaking(false);
                resolve();
            };

            utterance.onstart = () => {
                setIsSpeaking(true);
            };

            utterance.onend = finish;
            utterance.onerror = (e) => {
                finish();
            };

            // Safety timeout watchdog: if browser hangs or drops onend, guarantee promise resolves
            const wordCount = text.trim().split(/\s+/).length;
            const estimatedMs = Math.max(3000, Math.ceil((wordCount / 2.0) * 1000) + 3000);
            speechTimeoutRef.current = setTimeout(finish, estimatedMs);

            try {
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.warn('[useSpeech] speak failed:', err);
                finish();
            }
        });
    }, [stopSpeaking]);

    // ── Speech Recognition ──
    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Stop existing
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        finalTranscriptRef.current = '';
        lastSpeechTimeRef.current = Date.now();

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            // Mark that speech happened
            lastSpeechTimeRef.current = Date.now();
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (e) => {
            if (e.error !== 'aborted') setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        if (silenceCheckRef.current) {
            clearInterval(silenceCheckRef.current);
            silenceCheckRef.current = null;
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    /**
     * startListeningWithSilenceDetection — starts mic and calls onSilence
     * when no speech is detected for `silenceMs` milliseconds.
     */
    const startListeningWithSilenceDetection = useCallback((onSilence, silenceMs = 4000) => {
        startListening();
        lastSpeechTimeRef.current = Date.now();

        // Clear any existing silence check
        if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);

        // Poll every 500ms to check if silence has exceeded the threshold
        silenceCheckRef.current = setInterval(() => {
            const elapsed = Date.now() - lastSpeechTimeRef.current;
            if (elapsed >= silenceMs) {
                // Silence detected! Clear interval immediately
                if (silenceCheckRef.current) {
                    clearInterval(silenceCheckRef.current);
                    silenceCheckRef.current = null;
                }
                const transcript = finalTranscriptRef.current.trim();
                stopListening();
                if (onSilence) onSilence(transcript);
            }
        }, 500);
    }, [startListening, stopListening]);

    /**
     * speakThenListen — AI speaks, then auto-starts mic with silence detection.
     */
    const speakThenListen = useCallback(async (text, onSilence, silenceMs = 4000) => {
        await speak(text);
        startListeningWithSilenceDetection(onSilence, silenceMs);
    }, [speak, startListeningWithSilenceDetection]);

    // Load voices
    useEffect(() => {
        window.speechSynthesis?.getVoices();
        return () => {
            if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
        };
    }, []);

    return {
        isSpeaking, speak, stopSpeaking,
        isListening, startListening, stopListening,
        startListeningWithSilenceDetection,
        speakThenListen,
        getFinalTranscript: () => finalTranscriptRef.current,
    };
}
