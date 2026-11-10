import client from './client';

/**
 * Optimized Aggregated Dashboard Summary (BFF Pattern):
 * Replaces 4 separate REST calls with 1 unified, high-speed call.
 */
export const getDashboardSummary = () => client.get('/dashboard/summary');

