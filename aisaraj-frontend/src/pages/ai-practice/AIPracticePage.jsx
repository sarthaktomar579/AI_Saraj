import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSession, startQuestions, acknowledgeAnswer, getLeetCode, submitAnswer, evaluate } from '../../api/aiPractice';
import { getAIInterview, startAIInterview, saveInterviewReport } from '../../api/aiInterview';
import CodeEditor from '../../components/CodeEditor/CodeEditor';
import { useCodeExecution } from '../../hooks/useCodeExecution';
import { useSpeech } from '../../hooks/useSpeech';
import './AIPracticePage.css';

const PHASE = { SETUP: 'setup', VERBAL: 'verbal', CODING: 'coding', EXPLAIN: 'explain', EVAL: 'eval' };
const SILENCE_MS = 5000;
const VERBAL_ANSWER_SECONDS = 30;
const VERBAL_INTERVIEW_SECONDS = 10 * 60;
const DSA_CODING_SECONDS = 15 * 60;
const MAX_WARNINGS_BEFORE_DISQUALIFY = 3;
const PROCTOR_INTERVAL_MS = 500;
const PROCTOR_MISS_LIMIT = 4;
const PROCTOR_WARNING_COOLDOWN_MS = 6000;

const TRACKS = [
    { key: 'frontend', label: 'Frontend', subs: ['HTML', 'CSS', 'JavaScript', 'React'] },
    { key: 'backend', label: 'Backend', subs: ['Node.js', 'Django', 'Express', 'REST API'] },
    { key: 'dsa', label: 'DSA', subs: ['Arrays', 'Strings', 'Linked List', 'Trees', 'Graphs', 'DP'] },
    { key: 'data_analyst', label: 'Data Analyst', subs: ['SQL', 'MongoDB'] },
];

export default function AIPracticePage({ scheduled = false }) {
    const navigate = useNavigate();
    const { id: scheduledInterviewId } = useParams();
    const isScheduled = scheduled && !!scheduledInterviewId;
    const [scheduledInterview, setScheduledInterview] = useState(null);
    const [scheduledLoading, setScheduledLoading] = useState(isScheduled);
    const scheduledInterviewIdRef = useRef(scheduledInterviewId);
    const [phase, setPhase] = useState(PHASE.SETUP);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [selectedTracks, setSelectedTracks] = useState([]);
    const [selectedSubcategories, setSelectedSubcategories] = useState({});
    const [currentPrompt, setCurrentPrompt] = useState('');
    const [verbalQuestions, setVerbalQuestions] = useState([]);
    const [currentVQIndex, setCurrentVQIndex] = useState(0);
    const [verbalTimer, setVerbalTimer] = useState(VERBAL_INTERVIEW_SECONDS);
    const [verbalTimerActive, setVerbalTimerActive] = useState(false);
    const [answerTimer, setAnswerTimer] = useState(VERBAL_ANSWER_SECONDS);
    const [answerTimerActive, setAnswerTimerActive] = useState(false);
    const [codingQuestion, setCodingQuestion] = useState(null);
    const [codeAnswer, setCodeAnswer] = useState('');
    const [language, setLanguage] = useState('python');
    const [stdin, setStdin] = useState('');
    const [timer, setTimer] = useState(DSA_CODING_SECONDS);
    const [timerActive, setTimerActive] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);
    const [explanationTimer, setExplanationTimer] = useState(60);
    const [codeExplanation, setCodeExplanation] = useState('');
    const [warningCount, setWarningCount] = useState(0);
    const [disqualified, setDisqualified] = useState(false);
    const [disqualifyReason, setDisqualifyReason] = useState('');
    const [evaluation, setEvaluation] = useState(null);
    const [aiState, setAiState] = useState('idle');
    const [cameraStream, setCameraStream] = useState(null);
    const [showWarning, setShowWarning] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const verbalQuestionsRef = useRef([]);
    const currentVQIndexRef = useRef(0);
    const sessionRef = useRef(null);
    const verbalTimerExpiredRef = useRef(false);
    const answerTimeoutRef = useRef(null);
    const disqualifiedRef = useRef(false);
    const proctorIntervalRef = useRef(null);
    const proctorMissCountRef = useRef(0);
    const lastProctorWarningAtRef = useRef(0);
    const warningCountRef = useRef(0);
    const warningHideTimeoutRef = useRef(null);
    const isFinishingRef = useRef(false);
    const faceApiRef = useRef(null);

    const { result, running, execute } = useCodeExecution();
    const speech = useSpeech();
    const { isSpeaking, isListening, speak, stopListening, getFinalTranscript } = speech;
    const hasDSA = selectedTracks.includes('dsa');

    const ensureFaceApiLoaded = useCallback(async () => {
        if (faceApiRef.current) return faceApiRef.current;
        if (window.faceapi) {
            faceApiRef.current = window.faceapi;
            return faceApiRef.current;
        }

        const existing = document.getElementById('faceapi-script');
        if (existing) {
            await new Promise((resolve, reject) => {
                if (window.faceapi) return resolve();
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('Failed to load face-api script')), { once: true });
            });
        } else {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.id = 'faceapi-script';
                script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load face-api script'));
                document.body.appendChild(script);
            });
        }

        if (!window.faceapi) throw new Error('face-api global not available');
        faceApiRef.current = window.faceapi;
        return faceApiRef.current;
    }, []);

    useEffect(() => {
        if (!isScheduled) return;
        getAIInterview(scheduledInterviewId).then(({ data }) => {
            setScheduledInterview(data);
            setSelectedTracks(data.selected_tracks || []);
            setSelectedSubcategories(data.selected_subcategories || {});
            setDifficulty(data.difficulty || 'medium');
            setScheduledLoading(false);
        }).catch(() => {
            setError('Failed to load scheduled interview.');
            setScheduledLoading(false);
        });
    }, [isScheduled, scheduledInterviewId]);

    useEffect(() => { verbalQuestionsRef.current = verbalQuestions; }, [verbalQuestions]);
    useEffect(() => { currentVQIndexRef.current = currentVQIndex; }, [currentVQIndex]);
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { disqualifiedRef.current = disqualified; }, [disqualified]);

    useEffect(() => {
        if (isSpeaking) setAiState('speaking');
        else if (isListening) setAiState('listening');
        else if (loading) setAiState('thinking');
        else setAiState('idle');
    }, [isSpeaking, isListening, loading]);

    useEffect(() => {
        if (cameraStream && videoRef.current) videoRef.current.srcObject = cameraStream;
    }, [cameraStream, phase]);

    useEffect(() => {
        if (!timerActive || timer <= 0) return;
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    setTimerActive(false);
                    setShowSubmit(true);
                    speak('Time is up for the coding round. Please submit now.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timerActive, timer, speak]);

    useEffect(() => {
        if (!verbalTimerActive || verbalTimer <= 0 || phase !== PHASE.VERBAL) return;
        const interval = setInterval(() => {
            setVerbalTimer((prev) => {
                if (prev <= 1) {
                    verbalTimerExpiredRef.current = true;
                    setVerbalTimerActive(false);
                    stopListening();
                    setCurrentPrompt('Your 10 minute interview round is complete.');
                    moveAfterVerbal();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [verbalTimerActive, verbalTimer, phase]);

    useEffect(() => {
        if (!answerTimerActive || phase !== PHASE.VERBAL || answerTimer <= 0) return;
        const interval = setInterval(() => {
            setAnswerTimer((prev) => {
                if (prev <= 1) {
                    setAnswerTimerActive(false);
                    stopListening();
                    if (answerTimeoutRef.current) {
                        clearTimeout(answerTimeoutRef.current);
                        answerTimeoutRef.current = null;
                    }
                    handleVerbalSilence(getFinalTranscript().trim());
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [answerTimerActive, phase, answerTimer, stopListening, getFinalTranscript]);

    useEffect(() => {
        if (phase !== PHASE.EXPLAIN || explanationTimer <= 0) return;
        const interval = setInterval(() => {
            setExplanationTimer((prev) => {
                if (prev <= 1) {
                    stopListening();
                    const explanation = getFinalTranscript();
                    setCodeExplanation(explanation);
                    finishInterview(explanation);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase, explanationTimer, stopListening, getFinalTranscript]);

    useEffect(() => () => cameraStream?.getTracks().forEach((t) => t.stop()), [cameraStream]);
    useEffect(() => () => {
        if (answerTimeoutRef.current) clearTimeout(answerTimeoutRef.current);
    }, []);
    useEffect(() => () => {
        if (proctorIntervalRef.current) {
            clearInterval(proctorIntervalRef.current);
            proctorIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!isScheduled || !scheduledInterviewIdRef.current) return undefined;

        const flushAbandonedAttempt = () => {
            const inActivePhase = [PHASE.VERBAL, PHASE.CODING, PHASE.EXPLAIN].includes(phase);
            if (!inActivePhase || phase === PHASE.EVAL || isFinishingRef.current) return;

            const token = localStorage.getItem('access_token');
            const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
            if (!token) return;

            const payload = abandonedScheduledReport();
            const url = `${baseUrl}/ai-interviews/${scheduledInterviewIdRef.current}/save-report/`;
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => {});
            localStorage.removeItem('active_scheduled_interview_id');
        };

        const onPageHide = () => flushAbandonedAttempt();
        window.addEventListener('pagehide', onPageHide);
        return () => {
            flushAbandonedAttempt();
            window.removeEventListener('pagehide', onPageHide);
        };
    }, [isScheduled, phase]);

    useEffect(() => {
        if (![PHASE.VERBAL, PHASE.CODING, PHASE.EXPLAIN].includes(phase)) return undefined;
        const onVisibility = () => {
            if (!document.hidden || disqualifiedRef.current) return;
            setWarningCount((prev) => prev + 1);
            setDisqualified(true);
            setDisqualifyReason('Tab switch detected');
            setCurrentPrompt('You are disqualified due to tab switch.');
            stopListening();
            setTimerActive(false);
            setVerbalTimerActive(false);
            setAnswerTimerActive(false);
            setTimeout(() => finishInterview(''), 0);
        };
        // Do not use window 'blur': OS screenshot tools and alt-tab previews fire it without leaving the tab.
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [phase, stopListening, speak]);

    useEffect(() => {
        const active = [PHASE.VERBAL, PHASE.CODING, PHASE.EXPLAIN].includes(phase);
        if (!active || !cameraStream || !videoRef.current) {
            if (proctorIntervalRef.current) {
                clearInterval(proctorIntervalRef.current);
                proctorIntervalRef.current = null;
            }
            return undefined;
        }

        let checking = false;
        let modelReady = false;
        let cancelled = false;
        let faceapiLib = null;
        let detectorOptions = null;

        const loadModel = async () => {
            try {
                faceapiLib = await ensureFaceApiLoaded();
            } catch (err) {
                console.error('[Proctor] Failed to load face-api script:', err);
                return;
            }

            if (faceapiLib.nets.tinyFaceDetector.isLoaded) {
                modelReady = true;
                detectorOptions = new faceapiLib.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
                console.log('[Proctor] face-api model already loaded');
                return;
            }
            try {
                await faceapiLib.nets.tinyFaceDetector.loadFromUri('/models');
                modelReady = true;
                detectorOptions = new faceapiLib.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
                console.log('[Proctor] face-api model loaded successfully');
            } catch (err) {
                console.error('[Proctor] Failed to load face-api model:', err);
            }
        };

        const fireWarning = () => {
            if (disqualifiedRef.current) return;
            const now = Date.now();
            if (now - lastProctorWarningAtRef.current <= PROCTOR_WARNING_COOLDOWN_MS) return;
            lastProctorWarningAtRef.current = now;
            proctorMissCountRef.current = 0;

            warningCountRef.current += 1;
            const count = warningCountRef.current;
            setWarningCount(count);
            if (warningHideTimeoutRef.current) clearTimeout(warningHideTimeoutRef.current);
            setShowWarning(Date.now());
            warningHideTimeoutRef.current = setTimeout(() => {
                setShowWarning(0);
                warningHideTimeoutRef.current = null;
            }, 4000);
            setCurrentPrompt('⚠️ Look at screen immediately.');
            speak('Warning! Please look at your screen.');

            if (count >= MAX_WARNINGS_BEFORE_DISQUALIFY) {
                disqualifiedRef.current = true;
                setDisqualified(true);
                setDisqualifyReason('Not looking at screen repeatedly');
                setCurrentPrompt('You are disqualified due to repeated off-screen behavior.');
                stopListening();
                setTimerActive(false);
                setVerbalTimerActive(false);
                setAnswerTimerActive(false);
                setTimeout(() => finishInterview(''), 0);
            }
        };

        const checkFace = async () => {
            if (checking || !modelReady || !faceapiLib || !detectorOptions || disqualifiedRef.current || !videoRef.current || cancelled) return;
            const video = videoRef.current;
            if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
            checking = true;
            try {
                const detection = await faceapiLib.detectSingleFace(video, detectorOptions);
                const offscreen = !detection;
                proctorMissCountRef.current = offscreen ? proctorMissCountRef.current + 1 : 0;
                if (proctorMissCountRef.current >= PROCTOR_MISS_LIMIT) {
                    fireWarning();
                }
            } catch (_) { /* ignore transient errors */ } finally {
                checking = false;
            }
        };

        loadModel().then(() => {
            if (!cancelled) {
                proctorIntervalRef.current = setInterval(checkFace, PROCTOR_INTERVAL_MS);
            }
        });

        return () => {
            cancelled = true;
            if (proctorIntervalRef.current) {
                clearInterval(proctorIntervalRef.current);
                proctorIntervalRef.current = null;
            }
        };
    }, [phase, cameraStream, stopListening, speak, ensureFaceApiLoaded]);

    const requestCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setCameraStream(stream);
            return true;
        } catch (err) {
            setError('Camera/audio permission denied.');
            return false;
        }
    };

    const toggleTrack = (trackKey) => {
        setSelectedTracks((prev) => (prev.includes(trackKey) ? prev.filter((t) => t !== trackKey) : [...prev, trackKey]));
    };

    const toggleSub = (trackKey, subLabel) => {
        const value = subLabel.toLowerCase();
        setSelectedSubcategories((prev) => {
            const current = prev[trackKey] || [];
            const next = current.includes(value) ? current.filter((s) => s !== value) : [...current, value];
            return { ...prev, [trackKey]: next };
        });
    };

    const moveAfterVerbal = async () => {
        setVerbalTimerActive(false);
        setAnswerTimerActive(false);
        stopListening();
        if (hasDSA) await startCodingRound();
        else await finishInterview('');
    };

    const abandonedScheduledReport = () => ({
        total_score: 0,
        communication: 0,
        technical_depth: 0,
        code_quality: 0,
        optimization: 0,
        problem_solving: 0,
        warning_count: warningCountRef.current || 0,
        disqualified: false,
        disqualify_reason: 'Interview ended before completion',
        strengths: [],
        weaknesses: ['Interview was terminated before completion'],
        improvement_plan: ['Complete the full interview flow'],
        recommended_topics: [],
        hiring_signal: 'No Hire',
        skill_gap_analysis: {},
        raw_ai_response: { note: 'Interview ended before completion' },
    });

    const askQuestionWithConstraints = async (questionText) => {
        if (disqualifiedRef.current) return;
        setCurrentPrompt(questionText);
        setAnswerTimer(VERBAL_ANSWER_SECONDS);
        setAnswerTimerActive(false);
        await speak(questionText);
        setAnswerTimerActive(true);
        speech.startListeningWithSilenceDetection((spokenText) => {
            setAnswerTimerActive(false);
            handleVerbalSilence(spokenText);
        }, SILENCE_MS);
    };

    const handleVerbalSilence = useCallback(async (spokenText) => {
        if (disqualifiedRef.current) return;
        if (verbalTimerExpiredRef.current) return;
        const questions = verbalQuestionsRef.current;
        const idx = currentVQIndexRef.current;
        const sess = sessionRef.current;
        if (!sess || questions.length === 0 || idx >= questions.length) return;

        const currentQ = questions[idx];

        let ackText = 'Noted, thank you.';
        try {
            const { data } = await acknowledgeAnswer(sess.id, currentQ.id, spokenText || '');
            ackText = data.response || ackText;
            if (data.candidate_asked_question) {
                await speak(ackText);
                setAnswerTimer(VERBAL_ANSWER_SECONDS);
                setAnswerTimerActive(true);
                speech.startListeningWithSilenceDetection((nextSpokenText) => {
                    setAnswerTimerActive(false);
                    handleVerbalSilence(nextSpokenText);
                }, SILENCE_MS);
                return;
            }
        } catch (e) { }

        if (idx < questions.length - 1 && verbalTimer > 0) {
            const nextIdx = idx + 1;
            setCurrentVQIndex(nextIdx);
            currentVQIndexRef.current = nextIdx;
            const nextQ = questions[nextIdx];
            await askQuestionWithConstraints(nextQ.question_text);
            return;
        }
        await moveAfterVerbal();
    }, [speech, verbalTimer, askQuestionWithConstraints, moveAfterVerbal]);

    const startInterview = async () => {
        if (selectedTracks.length === 0) {
            setError('Please select at least one interview type.');
            return;
        }
        setLoading(true);
        setError('');
        setDisqualified(false);
        setDisqualifyReason('');
        setWarningCount(0);
        try {
            if (isScheduled && scheduledInterviewIdRef.current) {
                await startAIInterview(scheduledInterviewIdRef.current);
                localStorage.setItem('active_scheduled_interview_id', String(scheduledInterviewIdRef.current));
            }
            const cameraOk = await requestCamera();
            if (!cameraOk) {
                setLoading(false);
                return;
            }
            const topic = selectedTracks.join(', ');
            const { data: sessionData } = await createSession({
                topic,
                difficulty,
                selected_tracks: selectedTracks,
                selected_subcategories: selectedSubcategories,
                session_type: isScheduled ? 'scheduled' : 'practice',
                scheduled_interview_id: isScheduled ? Number(scheduledInterviewIdRef.current) : null,
            });
            setSession(sessionData);
            sessionRef.current = sessionData;

            const { data } = await startQuestions(sessionData.id);
            const questions = data.questions || [];
            if (questions.length === 0) {
                if (selectedTracks.length === 1 && selectedTracks.includes('dsa')) {
                    setVerbalQuestions([]);
                    verbalQuestionsRef.current = [];
                    setCurrentVQIndex(0);
                    currentVQIndexRef.current = 0;
                    setPhase(PHASE.CODING);
                    await speak('Starting directly with DSA coding round.');
                    await startCodingRound();
                    return;
                }
                throw new Error('No questions generated.');
            }

            setVerbalQuestions(questions);
            verbalQuestionsRef.current = questions;
            setCurrentVQIndex(0);
            currentVQIndexRef.current = 0;
            setVerbalTimer(VERBAL_INTERVIEW_SECONDS);
            verbalTimerExpiredRef.current = false;
            setPhase(PHASE.VERBAL);
            setVerbalTimerActive(true);
            setCurrentPrompt(questions[0].question_text);
            await speak('Welcome. I will conduct a ten minute interview based on your selected topics.');
            await askQuestionWithConstraints(questions[0].question_text);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to start interview.');
        } finally {
            setLoading(false);
        }
    };

    const startCodingRound = async () => {
        if (disqualifiedRef.current) return;
        setLoading(true);
        try {
            const sess = sessionRef.current;
            const { data: leetcode } = await getLeetCode(sess.id);
            setCodingQuestion(leetcode);
            setTimer(DSA_CODING_SECONDS);
            setShowSubmit(false);
            setPhase(PHASE.CODING);
            setTimerActive(true);
            setCurrentPrompt(`DSA Coding Round: ${leetcode.question_text?.split('\n')[0]}`);
            await speak('Now your DSA coding round begins. You have fifteen minutes.');
        } catch (err) {
            setError('Failed to generate DSA coding question.');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async () => {
        if (disqualifiedRef.current) return;
        setTimerActive(false);
        setShowSubmit(false);
        try {
            const sess = sessionRef.current;
            await submitAnswer(sess.id, { question_id: codingQuestion.id, code_answer: codeAnswer, language });
        } catch (e) { }

        setPhase(PHASE.EXPLAIN);
        setExplanationTimer(60);
        setCurrentPrompt('Code submitted. Explain your solution in one minute.');
        await speech.speakThenListen(
            'Code submitted. Please explain your solution including complexity.',
            (explanation) => { setCodeExplanation(explanation); finishInterview(explanation); },
            SILENCE_MS,
        );
    };

    const finishInterview = async (explanation = '') => {
        if (isFinishingRef.current) return;
        isFinishingRef.current = true;
        setLoading(true);
        stopListening();
        try {
            const sess = sessionRef.current;
            setCurrentPrompt('Thank you. Evaluating your interview...');
            const { data } = await evaluate(sess.id, {
                code_explanation: explanation || codeExplanation,
                warning_count: warningCount,
                disqualified,
                disqualify_reason: disqualifyReason,
            });

            if (isScheduled && scheduledInterviewIdRef.current) {
                try {
                    await saveInterviewReport(scheduledInterviewIdRef.current, {
                        total_score: data.total_score,
                        communication: data.communication,
                        technical_depth: data.technical_depth,
                        code_quality: data.code_quality,
                        optimization: data.optimization,
                        problem_solving: data.problem_solving,
                        warning_count: warningCountRef.current,
                        disqualified: disqualifiedRef.current,
                        disqualify_reason: disqualifyReason,
                        strengths: data.strengths || [],
                        weaknesses: data.weaknesses || [],
                        improvement_plan: data.improvement_plan || [],
                        recommended_topics: data.recommended_topics || [],
                        hiring_signal: data.hiring_signal || 'uncertain',
                        skill_gap_analysis: data.skill_gap_analysis || {},
                        raw_ai_response: data.raw_ai_response || {},
                    });
                } catch (reportErr) {
                    console.error('Failed to save interview report:', reportErr);
                }
            }

            setEvaluation(data);
            setPhase(PHASE.EVAL);
            localStorage.removeItem('active_scheduled_interview_id');
            if (isScheduled) {
                speak('Thank you for completing this interview. Your results have been sent to the interviewer.');
            } else {
                speak(`Your score is ${data.total_score} out of 100.`);
            }
        } catch (err) {
            setError('Failed to evaluate.');
            if (isScheduled && scheduledInterviewIdRef.current) {
                try {
                    await saveInterviewReport(scheduledInterviewIdRef.current, abandonedScheduledReport());
                    localStorage.removeItem('active_scheduled_interview_id');
                } catch (_) { /* no-op */ }
            }
        } finally {
            isFinishingRef.current = false;
            setLoading(false);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    const interviewTimer = phase === PHASE.VERBAL ? verbalTimer : timer;
    const isCoding = phase === PHASE.CODING || phase === PHASE.EXPLAIN;
    const raw = evaluation?.raw_ai_response || {};

    if (phase === PHASE.EVAL && evaluation && isScheduled) {
        return (
            <div className="eval-page">
                <div className="eval-header">
                    <img src="/ai-saraj-avatar.png" alt="AI Saraj" className="eval-avatar" />
                    <div><h1>Interview Complete</h1><p className="eval-subtitle">Thank you for your time!</p></div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '40px 32px', maxWidth: 520, margin: '0 auto' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                    <h2 style={{ marginBottom: 12 }}>Your interview has been submitted</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Your results have been sent to the interviewer.
                    </p>
                    {scheduledInterview?.company_name && (
                        <p style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 8 }}>
                            {scheduledInterview.company_name}
                        </p>
                    )}
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
                        You will not be able to view detailed results for scheduled interviews.
                        The interviewer will review your performance.
                    </p>
                    <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                </div>
            </div>
        );
    }

    if (phase === PHASE.EVAL && evaluation) {
        const dims = [
            { key: 'communication', label: 'Communication', max: 20, icon: '🗣️' },
            { key: 'technical_depth', label: 'Technical Depth', max: 25, icon: '🧠' },
            { key: 'code_quality', label: 'Code Quality', max: 20, icon: '💻' },
            { key: 'optimization', label: 'Optimization', max: 15, icon: '⚡' },
            { key: 'problem_solving', label: 'Problem Solving', max: 20, icon: '🧩' },
        ];
        return (
            <div className="eval-page">
                <div className="eval-header">
                    <img src="/ai-saraj-avatar.png" alt="AI Saraj" className="eval-avatar" />
                    <div><h1>Interview Complete</h1><p className="eval-subtitle">AI Saraj's Evaluation</p></div>
                </div>
                <div className="card eval-score-card">
                    <div className="eval-score-row">
                        <h2 className="eval-total">Score: {evaluation.total_score}/100</h2>
                        <span className={`badge badge-lg ${evaluation.hiring_signal.includes('Hire') ? 'badge-success' : evaluation.hiring_signal === 'Consider' ? 'badge-warning' : 'badge-danger'}`}>
                            {evaluation.hiring_signal}
                        </span>
                    </div>
                    {dims.map(({ key, label, max, icon }) => (
                        <div key={key} className="score-dim">
                            <div className="score-dim-header"><span>{icon} {label}</span><span>{evaluation[key]}/{max}</span></div>
                            <div className="score-bar"><div className="score-bar-fill" style={{ width: `${(evaluation[key] / max) * 100}%` }} /></div>
                        </div>
                    ))}
                </div>
                <div className="eval-grid-3">
                    <div className="card metric-card"><h3>🎯 Topic Relevance</h3><p className="eval-metric">{raw.topic_relevance || 0}/10</p></div>
                    <div className="card metric-card"><h3>👁️ Proctor</h3><p className="eval-metric">{raw.proctoring_score || 0}/10</p></div>
                    <div className="card metric-card"><h3>⚠️ Warnings</h3><p className="eval-metric warn-count">{warningCount}</p></div>
                </div>
                {raw.detailed_feedback && <div className="card feedback-card"><h3>📝 Feedback</h3><p>{raw.detailed_feedback}</p></div>}
                {raw.disqualified && <div className="card feedback-card"><h3>🚫 Disqualified</h3><p>{raw.disqualify_reason || 'Policy violation'}</p></div>}
                <div className="eval-grid">
                    <div className="card"><h3>💪 Strengths</h3><ul>{(evaluation.strengths || []).map((s, i) => <li key={i} className="text-success">{s}</li>)}</ul></div>
                    <div className="card"><h3>⚠️ Weaknesses</h3><ul>{(evaluation.weaknesses || []).map((w, i) => <li key={i} className="text-warning">{w}</li>)}</ul></div>
                </div>
                <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            </div>
        );
    }

    if (phase === PHASE.SETUP && isScheduled) {
        if (scheduledLoading) return <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>Loading interview details...</div>;
        const si = scheduledInterview;
        const expired = si?.deadline && new Date(si.deadline) < new Date();
        return (
            <div className="start-screen">
                <div className="start-card card">
                    <img src="/ai-saraj-avatar.png" alt="AI Saraj" className="start-avatar" />
                    <h1 className="start-title">Scheduled AI Interview</h1>
                    <p className="start-subtitle">Conducted by AI Saraj</p>
                    {si?.company_name && <p style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '1.1rem', margin: '8px 0' }}>{si.company_name}</p>}
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Topic: <strong>{si?.topic}</strong></p>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Difficulty: <strong>{si?.difficulty}</strong></p>
                    {si?.deadline && (
                        <p style={{ color: expired ? '#f87171' : 'var(--text-secondary)', marginBottom: 4 }}>
                            Deadline: <strong>{new Date(si.deadline).toLocaleString()}</strong>
                            {expired && ' (Expired)'}
                        </p>
                    )}
                    {si?.interviewer && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
                            Scheduled by: {si.interviewer.first_name || si.interviewer.username}
                        </p>
                    )}
                    <p className="start-desc">
                        AI will run a 10-minute verbal interview on the selected topics.
                        {selectedTracks.includes('dsa') && ' You will also get a 15-minute DSA coding round.'}
                        {' '}Results will be sent to the interviewer.
                    </p>
                    {error && <p className="text-danger" style={{ marginBottom: 12 }}>{error}</p>}
                    {si?.status === 'completed' ? (
                        <p style={{ color: '#10b981', fontWeight: 600, marginTop: 16 }}>This interview has already been completed. Results were sent to the interviewer.</p>
                    ) : expired ? (
                        <p style={{ color: '#f87171', fontWeight: 600, marginTop: 16 }}>This interview has expired. Contact your interviewer.</p>
                    ) : (
                        <button className="btn-primary start-btn" onClick={startInterview} disabled={loading || selectedTracks.length === 0}>
                            {loading ? '⏳ Preparing Interview...' : '🎤 Begin Interview'}
                        </button>
                    )}
                    <p className="start-note">Chrome recommended. Camera and mic required. 30 seconds per answer, auto-next on 5 seconds silence.</p>
                </div>
            </div>
        );
    }

    if (phase === PHASE.SETUP) {
        return (
            <div className="start-screen">
                <div className="start-card card">
                    <img src="/ai-saraj-avatar.png" alt="AI Saraj" className="start-avatar" />
                    <h1 className="start-title">Meet AI Saraj</h1>
                    <p className="start-subtitle">Your AI Technical Interviewer</p>
                    <p className="start-desc">Select one or more interview types. AI will run a 10-minute interview. If DSA is selected, you will also get a 15-minute coding round.</p>
                    {error && <p className="text-danger" style={{ marginBottom: 12 }}>{error}</p>}
                    <div className="start-field">
                        <label>Interview Types (select multiple)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {TRACKS.map((t) => (
                                <button
                                    type="button"
                                    key={t.key}
                                    className={selectedTracks.includes(t.key) ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                                    onClick={() => toggleTrack(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {TRACKS.filter((t) => selectedTracks.includes(t.key)).map((track) => (
                        <div className="start-field" key={track.key}>
                            <label>{track.label} subcategories (multi-select)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {track.subs.map((sub) => {
                                    const selected = (selectedSubcategories[track.key] || []).includes(sub.toLowerCase());
                                    return (
                                        <button
                                            type="button"
                                            key={sub}
                                            className={selected ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                                            onClick={() => toggleSub(track.key, sub)}
                                        >
                                            {sub}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div className="start-field">
                        <label>Difficulty</label>
                        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    <button className="btn-primary start-btn" onClick={startInterview} disabled={loading || selectedTracks.length === 0}>
                        {loading ? '⏳ Preparing Interview...' : '🎤 Start Interview'}
                    </button>
                    <p className="start-note">Chrome recommended. Camera and mic required. 30 seconds per answer, auto-next on 5 seconds silence.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-layout">
            <div className="interview-left">
                <div className="top-row">
                    <div className={`avatar-box ${aiState}`}>
                        <img src="/ai-saraj-avatar.png" alt="AI Saraj" className="ai-avatar-img" />
                        <div className="avatar-ring-glow" />
                        <p className="avatar-label">
                            {aiState === 'speaking' && '🔊 Speaking...'}
                            {aiState === 'listening' && '🎤 Listening...'}
                            {aiState === 'thinking' && '🧠 Thinking...'}
                            {aiState === 'idle' && '💬 AI Saraj'}
                        </p>
                    </div>
                    <div className="webcam-box">
                        <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <p className="webcam-label">📹 You</p>
                    </div>
                </div>

                <div className="phase-bar">
                    <span className={phase === PHASE.VERBAL ? 'phase-active' : 'phase-done'}>1. Interview (10 min)</span>
                    <span className="phase-sep">→</span>
                    <span className={phase === PHASE.CODING ? 'phase-active' : (phase === PHASE.EXPLAIN || phase === PHASE.EVAL ? 'phase-done' : '')}>2. DSA Coding (15 min)</span>
                    <span className="phase-sep">→</span>
                    <span className={phase === PHASE.EXPLAIN ? 'phase-active' : (phase === PHASE.EVAL ? 'phase-done' : '')}>3. Explain + Score</span>
                </div>

                {(phase === PHASE.VERBAL || phase === PHASE.CODING) && (
                    <div className="timer-row" style={{ marginBottom: 8 }}>
                        <span className={`timer-display ${interviewTimer < 60 ? 'danger' : interviewTimer < 300 ? 'warning' : ''}`}>⏱️ {formatTime(interviewTimer)}</span>
                        {phase === PHASE.VERBAL && (
                            <span className={`timer-display ${answerTimer < 6 ? 'danger' : 'warning'}`} style={{ fontSize: '1rem' }}>
                                Answer: {answerTimer}s
                            </span>
                        )}
                        <span className={`timer-display ${warningCount >= MAX_WARNINGS_BEFORE_DISQUALIFY ? 'danger' : 'warning'}`} style={{ fontSize: '1rem' }}>
                            Warnings: {warningCount}/{MAX_WARNINGS_BEFORE_DISQUALIFY}
                        </span>
                    </div>
                )}

                <div className="chat-log">
                    <div className="chat-msg ai" style={{ maxWidth: '100%' }}>
                        <span className="msg-who">🤖 AI Saraj</span>
                        <p>{currentPrompt || 'Preparing your question...'}</p>
                    </div>
                </div>

                <div className="status-bar">
                    {isListening && <div className="listening-badge"><span className="pulse-dot" /><span>Listening... next question after 5 seconds silence or 30 seconds max.</span></div>}
                    {isSpeaking && <div className="listening-badge" style={{ color: '#4ade80' }}><span className="pulse-dot" style={{ background: '#4ade80' }} /><span>AI is speaking...</span></div>}
                    <p className="status-hint">Live warnings: {warningCount} (tab switch = disqualification)</p>
                    {phase === PHASE.VERBAL && !isListening && !isSpeaking && (
                        <p className="status-hint">Question {Math.min(currentVQIndex + 1, verbalQuestions.length)} of {verbalQuestions.length}</p>
                    )}
                </div>
            </div>

            <div className={`interview-right ${isCoding ? 'active' : ''}`}>
                {phase === PHASE.CODING && codingQuestion ? (
                    <>
                        <div className="timer-row">
                            <span className={`timer-display ${timer < 60 ? 'danger' : timer < 300 ? 'warning' : ''}`}>⏱️ {formatTime(timer)}</span>
                            {showSubmit
                                ? <button className="btn-primary submit-glow" onClick={handleCodeSubmit}>📤 Submit Code</button>
                                : <button className="btn-secondary btn-sm" onClick={() => { setShowSubmit(true); setTimerActive(false); }}>Submit Early</button>}
                        </div>
                        <div className="problem-box card">
                            <h3>💻 DSA Problem</h3>
                            <pre className="problem-content">{codingQuestion.question_text}</pre>
                        </div>
                        <div className="editor-toolbar">
                            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-picker">
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                            </select>
                            <button className="btn-secondary btn-sm" onClick={() => execute(language, codeAnswer, stdin)} disabled={running}>
                                {running ? '⏳' : '▶'} Run Test Case
                            </button>
                        </div>
                        <textarea
                            placeholder="Optional stdin / custom test case input"
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            style={{ minHeight: 90, marginBottom: 8 }}
                        />
                        <CodeEditor language={language} value={codeAnswer} onChange={setCodeAnswer} height="320px" />
                        {result && <pre className={`run-output ${result.exit_code === 0 ? 'ok' : 'err'}`}>{result.stdout || result.stderr || '(no output)'}</pre>}
                    </>
                ) : phase === PHASE.EXPLAIN ? (
                    <div className="explain-section">
                        <div className="explain-timer-bar">
                            <span className={`timer-display ${explanationTimer < 15 ? 'danger' : ''}`}>🎤 {formatTime(explanationTimer)}</span>
                        </div>
                        <div className="card explain-card">
                            <div style={{ fontSize: 48 }}>🗣️</div>
                            <h3>Explain Your Solution</h3>
                            <p>Explain approach, complexity, and trade-offs.</p>
                            {isListening && <div className="listening-badge" style={{ marginTop: 12, justifyContent: 'center' }}><span className="pulse-dot" /> Recording...</div>}
                        </div>
                    </div>
                ) : (
                    <div className="right-placeholder">
                        <div style={{ fontSize: 80 }}>🎯</div>
                        <h3>Technical Interview Round</h3>
                        <p>AI asks questions from selected tracks and subcategories, then evaluates you out of 100.</p>
                    </div>
                )}
            </div>

            {showWarning ? (
                <div className="warning-screen" key={showWarning}>
                    <div className="warning-box">
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚠️</div>
                        <div>LOOK AT YOUR SCREEN!</div>
                        <div style={{ fontSize: '1rem', marginTop: 8 }}>Warning {warningCount} of {MAX_WARNINGS_BEFORE_DISQUALIFY}</div>
                    </div>
                </div>
            ) : null}
            {error && <div className="error-bar">{error}</div>}
        </div>
    );
}
