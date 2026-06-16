// Thin wrapper around Splunk's KV Store REST API.
// All boards live in the `nobody` namespace so every user sees the same data.

import { createRESTURL } from '@splunk/splunk-utils/url';
import { createFetchInit } from '@splunk/splunk-utils/fetch';

const APP = 'whiteboard_app';

function endpoint(collection, suffix = '') {
    return createRESTURL(`storage/collections/data/${collection}${suffix}`, {
        app: APP,
        owner: 'nobody',
        sharing: 'app',
    });
}

async function send(url, init = {}, expectedStatus = [200, 201]) {
    const fetchInit = createFetchInit({
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });
    if (init.method && init.method !== 'GET') {
        // eslint-disable-next-line no-console
        console.log(
            `[whiteboard_app] kv ${init.method} ${url} body=${
                init.body ? init.body.length : 0
            } bytes`
        );
    }
    const res = await fetch(url, fetchInit);
    const ok = [].concat(expectedStatus).includes(res.status);
    const text = await res.text();
    if (init.method && init.method !== 'GET') {
        // eslint-disable-next-line no-console
        console.log(
            `[whiteboard_app] kv ${init.method} -> ${res.status} (${text.length} bytes)`
        );
    }
    if (!ok) {
        throw new Error(`KV Store ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        // some endpoints (DELETE) return non-JSON; treat as no payload
        return null;
    }
}

function withOutputModeJson(url) {
    return url + (url.includes('?') ? '&' : '?') + 'output_mode=json';
}

export const kv = {
    list(collection) {
        return send(withOutputModeJson(endpoint(collection)));
    },
    get(collection, key) {
        return send(withOutputModeJson(endpoint(collection, `/${encodeURIComponent(key)}`)));
    },
    insert(collection, doc) {
        return send(
            withOutputModeJson(endpoint(collection)),
            { method: 'POST', body: JSON.stringify(doc) }
        );
    },
    update(collection, key, doc) {
        return send(
            withOutputModeJson(endpoint(collection, `/${encodeURIComponent(key)}`)),
            { method: 'POST', body: JSON.stringify(doc) }
        );
    },
    remove(collection, key) {
        return send(
            withOutputModeJson(endpoint(collection, `/${encodeURIComponent(key)}`)),
            { method: 'DELETE' },
            [200, 204]
        );
    },
    query(collection, params) {
        const qs = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = endpoint(collection) + '?' + qs + '&output_mode=json';
        return send(url);
    },
};

export const COLLECTIONS = {
    boards: 'whiteboards',
    versions: 'whiteboard_versions',
};
