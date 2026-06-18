/** Splunk Web username for audit fields (owner, created_by, etc.). */
export function getCurrentUser() {
    try {
        return window.Splunk?.util?.getCurrentUser?.() || window.$C?.USERNAME || 'unknown';
    } catch {
        return 'unknown';
    }
}
