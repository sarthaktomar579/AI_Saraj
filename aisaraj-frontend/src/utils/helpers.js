/**
 * Format a Date object or ISO string to readable format.
 */
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Get hiring signal badge type.
 */
export function getSignalBadgeType(signal) {
    if (signal.includes('Strong Hire')) return 'success';
    if (signal.includes('Hire')) return 'success';
    if (signal === 'Consider') return 'warning';
    return 'danger';
}

/**
 * Truncate string to max length.
 */
export function truncate(str, maxLen = 100) {
    if (!str || str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
}

/**
 * Score dimension configuration used across evaluation displays.
 */
export const SCORE_DIMENSIONS = [
    { key: 'communication', label: 'Communication', max: 20 },
    { key: 'technical_depth', label: 'Technical Depth', max: 25 },
    { key: 'code_quality', label: 'Code Quality', max: 20 },
    { key: 'optimization', label: 'Optimization', max: 15 },
    { key: 'problem_solving', label: 'Problem Solving', max: 20 },
];
