import client from './client';

/**
 * Optimized Aggregated Dashboard Summary (BFF Pattern):
 * Replaces 4 separate REST calls with 1 unified, high-speed call.
 */
export const getDashboardSummary = () => client.get('/dashboard/summary');

/**
 * Fetches real-time tech job openings filtered by track:
 * Uses In-Memory Cache (15m TTL) on the backend for sub-millisecond response.
 */
export const getDashboardJobs = (track = 'all') => 
    client.get('/dashboard/jobs', { params: track ? { track } : {} });


