import { useState, useCallback } from 'react';
import { executeCode as execApi } from '../api/codeExecution';

export function useCodeExecution() {
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);

    const execute = useCallback(async (language, sourceCode, stdin = '') => {
        setRunning(true);
        setResult(null);
        try {
            const { data } = await execApi({ language, source_code: sourceCode, stdin });
            setResult(data);
            return data;
        } catch (err) {
            const errorResult = { stdout: '', stderr: err.message, exit_code: 1, timed_out: false };
            setResult(errorResult);
            return errorResult;
        } finally {
            setRunning(false);
        }
    }, []);

    return { result, running, execute };
}
