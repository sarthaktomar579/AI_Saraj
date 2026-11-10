import client from './client';

/**
 * Optimized Aggregated Dashboard Summary (BFF Pattern):
 * Replaces 4 separate REST calls with 1 unified, high-speed call.
 */
export const getDashboardSummary = () => client.get('/dashboard/summary');

/**
 * Fetches real-time Indian tech job openings filtered by track with server-side pagination:
 * Uses In-Memory Cache (15m TTL) on the backend for sub-millisecond response.
 */
export const getDashboardJobs = (track = 'all', page = 1, limit = 4) => 
    client.get('/dashboard/jobs', { 
        params: { 
            ...(track ? { track } : {}),
            page,
            limit
        } 
    });


