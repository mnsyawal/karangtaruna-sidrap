
const GAS_URL = 'https://script.google.com/macros/s/AKfycbziOhytTct3Ysyq93SsFgIZxLd9H0bGK6SyU3-OhtSOQAon40TJliSHmd1nqYkkLdMX/exec';

const ALLOWED_ORIGINS = [
    'https://karangtaruna-sidrap.pages.dev',
    'https://karangtaruna.example.com',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';
        const method = request.method;

        const path = url.pathname;
        if (!path.startsWith('/api')) {
            
            return env.ASSETS.fetch(request);
        }

        const apiParams = new URLSearchParams(url.search);

        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': origin || '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        if (method !== 'GET' && method !== 'POST') {
            return jsonResponse({ success: false, message: 'Method not allowed', error_code: 'METHOD_NOT_ALLOWED' }, origin, 405);
        }

        try {
            if (method === 'GET') {
                const hasToken = apiParams.has('token') && apiParams.get('token');
                const gasUrl = GAS_URL + '?' + apiParams.toString();

                if (!hasToken && typeof caches !== 'undefined') {
                    const cache = caches.default;
                    const cacheKey = new Request(request.url, request);
                    let cachedResponse = await cache.match(cacheKey);
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    const gasResponse = await fetch(gasUrl, { method: 'GET' });
                    const data = await gasResponse.json();

                    const res = jsonResponse(data, origin, gasResponse.status, 300);
                    if (data && data.success && ctx && typeof ctx.waitUntil === 'function') {
                        ctx.waitUntil(cache.put(cacheKey, res.clone()));
                    }
                    return res;
                } else {
                    const gasResponse = await fetch(gasUrl, { method: 'GET' });
                    const data = await gasResponse.json();
                    return jsonResponse(data, origin, gasResponse.status, 0);
                }
            } else {
                
                const body = await request.text();
                const gasResponse = await fetch(GAS_URL, {
                    method: 'POST',
                    body: body
                });
                const data = await gasResponse.json();
                return jsonResponse(data, origin, gasResponse.status, 0);
            }

        } catch (error) {
            return jsonResponse({
                success: false,
                message: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
                error_code: 'PROXY_ERROR'
            }, origin, 502);
        }
    }
};

function jsonResponse(data, origin, status = 200, maxAgeSeconds = 0) {
    const headers = {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Proxy-By': 'Cloudflare-Worker'
    };

    if (maxAgeSeconds > 0) {
        headers['Cache-Control'] = `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds * 2}`;
    } else {
        headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    }

    if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
        headers['Access-Control-Allow-Origin'] = origin;
    } else if (origin) {
        
        headers['Access-Control-Allow-Origin'] = origin;
    } else {
        headers['Access-Control-Allow-Origin'] = '*';
    }

    return new Response(JSON.stringify(data), { status, headers });
}
