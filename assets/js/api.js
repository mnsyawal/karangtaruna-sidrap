
const APP_CONFIG = {
    
    API_URL: '/api',
    FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbziOhytTct3Ysyq93SsFgIZxLd9H0bGK6SyU3-OhtSOQAon40TJliSHmd1nqYkkLdMX/exec',
    CACHE_TIME_MINUTES: 10 
};

function getImageUrl(rawUrl) {
    if (!rawUrl || rawUrl.toString().trim() === '') {
        return getPlaceholderImage('No Image');
    }

    const url = rawUrl.toString().trim();

    if (url.includes('drive.google.com/thumbnail')) {
        return url;
    }

    if (url.includes('drive.google.com/uc') && url.includes('id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) {
            return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
        }
    }

    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/([^/]+)/);
        if (match && match[1]) {
            return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
        }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return getPlaceholderImage('Invalid URL');
}

function getPlaceholderImage(text) {
    const encodedText = encodeURIComponent(text || 'No Image');
    return 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" fill="#e2e8f0">' +
        '<rect width="100%" height="100%" fill="#166534"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
        'fill="white" font-size="20" font-family="Arial, sans-serif">' + text + '</text>' +
        '</svg>'
    );
}

function getToken() {
    return localStorage.getItem('KT_TOKEN') || '';
}

function getUser() {
    const u = localStorage.getItem('KT_USER');
    return u ? JSON.parse(u) : null;
}

function formatTanggal(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function cleanExcerpt(textOrHtml, fallbackTitle = '', maxLength = 130) {
    if (!textOrHtml || typeof textOrHtml !== 'string') {
        return fallbackTitle ? `Informasi selengkapnya mengenai "${fallbackTitle}". Klik untuk membaca detailnya.` : 'Klik untuk membaca informasi selengkapnya.';
    }

    let sanitized = textOrHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, ' ')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, ' ');

    sanitized = sanitized.replace(/<[^>]+>/g, ' ');

    sanitized = sanitized.replace(/<[a-z0-9_-]+[^>]*$/gi, ' ');

    let cleanText = sanitized
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&lt;[^&]*&gt;/gi, ' ')
        .replace(/&lt;[a-z0-9_-]+[^&]*$/gi, ' ') 
        .replace(/<[^>]*>/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const textWithoutSymbols = cleanText.replace(/[\.\,\-\_\s]/g, '');
    if (!textWithoutSymbols || textWithoutSymbols.length < 5) {
        if (fallbackTitle) {
            return `Informasi dan kelengkapan terkait "${fallbackTitle}". Silakan klik untuk membuka detail selengkapnya.`;
        }
        return 'Klik untuk melihat detail informasi selengkapnya.';
    }

    if (maxLength && cleanText.length > maxLength) {
        return cleanText.substring(0, maxLength).trim() + '...';
    }

    return cleanText;
}

async function fetchAPI(action, params = {}, useCache = true) {
    
    const token = getToken();
    const allParams = { action: action, ...params };
    if (token) {
        allParams.token = token;
    }

    const urlParams = new URLSearchParams(allParams);
    const fullUrl = `${APP_CONFIG.API_URL}?${urlParams.toString()}`;

    const isPublicRequest = !token;
    const shouldUseCache = useCache && isPublicRequest;
    const cacheKey = `KT_CACHE_${action}_${JSON.stringify(params)}`;

    if (shouldUseCache) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const parsedCache = JSON.parse(cachedData);
            const now = new Date().getTime();
            if (now - parsedCache.timestamp < APP_CONFIG.CACHE_TIME_MINUTES * 60 * 1000) {
                console.log(`[CACHE HIT] Mengambil dari cache: ${action}`);
                return parsedCache.data;
            } else {
                localStorage.removeItem(cacheKey);
            }
        }
    }

    try {
        console.log(`[API FETCH] Memanggil server: ${action}` + (token ? ' (dengan token)' : ' (publik)'));
        let response;
        try {
            response = await fetch(fullUrl);
            if (!response.ok && APP_CONFIG.FALLBACK_GAS_URL) {
                const fallbackUrl = `${APP_CONFIG.FALLBACK_GAS_URL}?${urlParams.toString()}`;
                response = await fetch(fallbackUrl);
            }
        } catch (fetchErr) {
            if (APP_CONFIG.FALLBACK_GAS_URL) {
                const fallbackUrl = `${APP_CONFIG.FALLBACK_GAS_URL}?${urlParams.toString()}`;
                response = await fetch(fallbackUrl);
            } else {
                throw fetchErr;
            }
        }
        const result = await response.json();

        if (result.success) {
            
            if (shouldUseCache) {
                const cacheObject = {
                    timestamp: new Date().getTime(),
                    data: result
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
            }
            return result;
        } else {
            
            if (result.error_code === 'UNAUTHORIZED' && token) {
                console.warn('Token expired, redirect ke login...');
                localStorage.removeItem('KT_TOKEN');
                localStorage.removeItem('KT_USER');
                if (window.location.pathname.includes('/admin/')) {
                    window.location.replace('login.html');
                }
            }
            console.error("API Error:", result.message);
            return result; 
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        
        if (shouldUseCache) {
            const oldCache = localStorage.getItem(cacheKey);
            if (oldCache) {
                console.warn("Fallback to expired cache due to network error.");
                return JSON.parse(oldCache).data;
            }
        }
        return null;
    }
}

async function postAPI(action, dataObj, includeToken = true) {
    const payload = {
        action: action,
        data: dataObj
    };

    if (includeToken) {
        const token = getToken();
        if (token) payload.token = token;
    }

    try {
        let response;
        try {
            response = await fetch(APP_CONFIG.API_URL, {
                method: 'POST',
                
                body: JSON.stringify(payload)
            });
            if (!response.ok && APP_CONFIG.FALLBACK_GAS_URL) {
                response = await fetch(APP_CONFIG.FALLBACK_GAS_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }
        } catch (postErr) {
            if (APP_CONFIG.FALLBACK_GAS_URL) {
                response = await fetch(APP_CONFIG.FALLBACK_GAS_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            } else {
                throw postErr;
            }
        }
        const result = await response.json();
        
        if (!result.success && result.error_code === 'UNAUTHORIZED') {
            localStorage.removeItem('KT_TOKEN');
            localStorage.removeItem('KT_USER');
            if (window.location.pathname.includes('/admin/')) {
                window.location.replace('login.html');
            }
        }
        
        return result;
    } catch (error) {
        console.error('POST Error:', error);
        return { success: false, message: 'Gagal menghubungi server.' };
    }
}

const DEFAULT_THEME = {
    theme_primary: '#203d92',
    theme_secondary: '#f06000',
    theme_dark: '#152556',
    theme_bg: '#F8FAFC'
};

(function initInstantTheme() {
    try {
        const cached = localStorage.getItem('KT_CACHE_getSettings_{}');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.data && parsed.data.data) {
                applyThemeColors(parsed.data.data);
                return;
            }
        }
    } catch (e) {}
    applyThemeColors(DEFAULT_THEME);
})();

async function applyGlobalWebSettings() {
    
    try {
        const cached = localStorage.getItem('KT_CACHE_getSettings_{}');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.data && parsed.data.data) {
                applySettingsToDOM(parsed.data.data);
            }
        }
    } catch (e) {}

    const res = await fetchAPI('getSettings', {}, true); 
    if (res && res.data) {
        applySettingsToDOM(res.data);
    }
}

function applySettingsToDOM(s) {
    if (!s) return;
    applyThemeColors(s);
    
    document.querySelectorAll('.cms-org-name').forEach(el => el.innerText = s.org_name || 'Karang Taruna Kabupaten Sidenreng Rappang');
    document.querySelectorAll('.cms-org-shortname').forEach(el => el.innerText = s.org_shortname || 'KT Sidrap');
    document.querySelectorAll('.cms-org-desc').forEach(el => el.innerText = s.org_description || '');
    
    document.querySelectorAll('.cms-address').forEach(el => el.innerText = s.org_address || '');
    document.querySelectorAll('.cms-phone').forEach(el => el.innerText = s.phone || '');
    document.querySelectorAll('.cms-email').forEach(el => el.innerText = s.email || '');
    document.querySelectorAll('.cms-footer-text').forEach(el => el.innerText = s.footer_text || '');
    
    document.querySelectorAll('.cms-link-fb').forEach(a => {
        if (s.facebook_url) a.href = s.facebook_url;
    });
    document.querySelectorAll('.cms-link-ig').forEach(a => {
        if (s.instagram_url) a.href = s.instagram_url;
    });
    
    if (s.logo_url) {
        
        const isDefaultSidrapLogo = s.logo_url.includes('1M3hfGRqMw1a_GBN5OSk3iM0XiIUTiNtQ');
        const targetLogo = isDefaultSidrapLogo ? 'assets/img/logo.png' : getImageUrl(s.logo_url);
        
        document.querySelectorAll('.cms-logo').forEach(img => {
            const currentSrc = img.getAttribute('src');
            if (currentSrc !== targetLogo) {
                img.src = targetLogo;
            }
        });
    }

    if (s.hero_bg_image) {
        document.querySelectorAll('.hero-section').forEach(hero => {
            hero.classList.add('has-bg-image');
            hero.style.setProperty('--hero-bg', 'url(' + getImageUrl(s.hero_bg_image) + ')');
            hero.style.setProperty('background-image', 'url(' + getImageUrl(s.hero_bg_image) + ')');
        });
    }
}

function applyThemeColors(s) {
    if (!s) return;
    const root = document.documentElement;
    
    const primary = s.theme_primary || '#203d92';
    const secondary = s.theme_secondary || '#f06000';
    const dark = s.theme_dark || '#152556';
    const bg = s.theme_bg || '#F8FAFC';
    
    const light = hexToLight(primary);
    
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--dark', dark);
    root.style.setProperty('--bg-color', bg);
    root.style.setProperty('--light', light);
    
    root.style.setProperty('--text-main', '#1F2937');
    root.style.setProperty('--text-muted', '#6B7280');
    root.style.setProperty('--white', '#FFFFFF');
}

function hexToLight(hex, factor = 0.9) {
    let r, g, b;
    const h = (hex || '#203d92').replace('#', '');
    if (h.length === 3) {
        r = parseInt(h[0] + h[0], 16);
        g = parseInt(h[1] + h[1], 16);
        b = parseInt(h[2] + h[2], 16);
    } else {
        r = parseInt(h.substring(0, 2), 16);
        g = parseInt(h.substring(2, 4), 16);
        b = parseInt(h.substring(4, 6), 16);
    }
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGlobalWebSettings);
} else {
    applyGlobalWebSettings();
}
