import { useState, useCallback } from 'react';
import { getVideoToken } from '../api/interviews';

export function useVideoCall() {
    const [token, setToken] = useState(null);
    const [callId, setCallId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const joinCall = useCallback(async (interviewId) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await getVideoToken(interviewId);
            setToken(data.token);
            setCallId(data.call_id);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to get video token');
        } finally {
            setLoading(false);
        }
    }, []);

    const leaveCall = useCallback(() => {
        setToken(null);
        setCallId(null);
    }, []);

    return { token, callId, loading, error, joinCall, leaveCall };
}
