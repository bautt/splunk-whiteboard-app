// Thin wrapper around Splunk's KV Store REST API.
// Shared boards use the app (nobody) namespace; private boards use the user namespace.

import { createRESTURL } from '@splunk/splunk-utils/url';
import { createFetchInit } from '@splunk/splunk-utils/fetch';
import { debug } from './log';
import { resolveKvScope, BOARD_SCOPE } from './boardScope';

const APP = 'whiteboard_app';

function endpoint(collection, suffix = '', scopeKey = BOARD_SCOPE.SHARED) {
    const scope = resolveKvScope(scopeKey);
    return createRESTURL(`storage/collections/data/${collection}${suffix}`, {
        app: APP,
        owner: scope.owner,
        sharing: scope.sharing,
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
        debug(`kv ${init.method} ${url} body=${init.body ? init.body.length : 0} bytes`);
    }
    const res = await fetch(url, fetchInit);
    const ok = [].concat(expectedStatus).includes(res.status);
    const text = await res.text();
    if (init.method && init.method !== 'GET') {
        debug(`kv ${init.method} -> ${res.status} (${text.length} bytes)`);
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
    list(collection, scopeKey = BOARD_SCOPE.SHARED) {
        return send(withOutputModeJson(endpoint(collection, '', scopeKey)));
    },
    get(collection, key, scopeKey = BOARD_SCOPE.SHARED) {
        return send(withOutputModeJson(endpoint(collection, `/${encodeURIComponent(key)}`, scopeKey)));
    },
    insert(collection, doc, scopeKey = BOARD_SCOPE.SHARED) {
        return send(
            withOutputModeJson(endpoint(collection, '', scopeKey)),
            { method: 'POST', body: JSON.stringify(doc) }
        );
    },
    update(collection, key, doc, scopeKey = BOARD_SCOPE.SHARED) {
        return send(
            withOutputModeJson(endpoint(collection, `/${encodeURIComponent(key)}`, scopeKey)),
            { method: 'POST', body: JSON.stringify(doc) }
        );
    },
    // Insert-or-update preserving a caller-supplied _key. Used when promoting a
    // board into a namespace where its key may or may not already exist.
    async upsert(collection, key, doc, scopeKey = BOARD_SCOPE.SHARED) {
        const existing = await this.get(collection, key, scopeKey).catch((e) => {
            if (String(e?.message || '').includes('404')) return null;
            throw e;
        });
        if (existing) {
            return this.update(collection, key, doc, scopeKey);
        }
        return this.insert(collection, { ...doc, _key: key }, scopeKey);
    },
    remove(collection, key, scopeKey = BOARD_SCOPE.SHARED) {
        return send(
            withOutputModeJson(endpoint(collection, `/${encodeURIComponent(key)}`, scopeKey)),
            { method: 'DELETE' },
            [200, 204]
        );
    },
    query(collection, params, scopeKey = BOARD_SCOPE.SHARED) {
        const qs = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = endpoint(collection, '', scopeKey) + '?' + qs + '&output_mode=json';
        return send(url);
    },
};

export const COLLECTIONS = {
    boards: 'whiteboards',
    versions: 'whiteboard_versions',
    revisions: 'whiteboard_revisions',
    templateRevisions: 'whiteboard_template_revisions',
    thumbnails: 'whiteboard_thumbnails',
};
