(function () {
    const SPA_SHELL_SELECTOR = '#spa-shell';
    const SPA_MAIN_SELECTOR = '#spa-main';
    const SPA_CACHE_TTL_MS = 5 * 60 * 1000;
    const SPA_CACHE_LIMIT = 20;
    const SPA_CACHE_KEY = 'spa-page-cache-v1';
    const GITHUB_CACHE_PREFIX = 'github-fetch-cache-v1:';
    const GITHUB_DEFAULT_TTL_MS = 10 * 60 * 1000;
    const GITHUB_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const pageCache = new Map();
    const pageFetches = new Map();
    const githubRequestCache = new Map();
    const githubMemoryCache = new Map();
    const runtimeConfig = (window.__VMD_CONFIG__ && window.__VMD_CONFIG__.profile) || {};

    function getProfileConfig(key, fallback) {
        const value = runtimeConfig[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
        return fallback;
    }

    function isGitHubResourceUrl(url) {
        try {
            const host = new URL(url, window.location.href).hostname.toLowerCase();
            return host === 'api.github.com' || host === 'raw.githubusercontent.com' || host === 'github.com';
        } catch (error) {
            return false;
        }
    }

    function getGitHubCacheKey(url) {
        return `${GITHUB_CACHE_PREFIX}${normalizeCacheUrl(url)}`;
    }

    function readGitHubCache(url) {
        const key = getGitHubCacheKey(url);
        const inMemory = githubMemoryCache.get(key);
        if (inMemory && typeof inMemory.cachedAt === 'number') {
            return inMemory;
        }

        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.cachedAt !== 'number') return null;
            githubMemoryCache.set(key, parsed);
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function writeGitHubCache(url, value) {
        const key = getGitHubCacheKey(url);
        githubMemoryCache.set(key, value);

        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            // Ignore storage failures (quota/private mode).
        }
    }

    async function fetchGitHubResource(url, options) {
        const opts = options || {};
        const responseType = opts.responseType === 'text' ? 'text' : 'json';
        const ttlMs = Number.isFinite(opts.ttlMs) ? opts.ttlMs : GITHUB_DEFAULT_TTL_MS;
        const normalizedUrl = normalizeCacheUrl(url);
        const now = Date.now();

        const cached = readGitHubCache(normalizedUrl);
        if (cached && cached.type === responseType && now - cached.cachedAt <= ttlMs) {
            return { data: cached.data, source: 'cache' };
        }

        const inflightKey = `${responseType}:${normalizedUrl}`;
        const inflight = githubRequestCache.get(inflightKey);
        if (inflight) return inflight;

        const request = fetch(normalizedUrl)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`GitHub fetch failed (${response.status})`);
                }

                const data = responseType === 'text'
                    ? await response.text()
                    : await response.json();

                writeGitHubCache(normalizedUrl, {
                    type: responseType,
                    cachedAt: Date.now(),
                    data
                });

                return { data, source: 'network' };
            })
            .catch((error) => {
                if (cached && cached.type === responseType && now - cached.cachedAt <= GITHUB_STALE_TTL_MS) {
                    return { data: cached.data, source: 'stale' };
                }
                throw error;
            })
            .finally(() => {
                githubRequestCache.delete(inflightKey);
            });

        githubRequestCache.set(inflightKey, request);
        return request;
    }

    function ensureTransitionStyles() {
        if (document.getElementById('spa-transition-styles')) return;

        const style = document.createElement('style');
        style.id = 'spa-transition-styles';
        style.textContent = `
            #spa-main.spa-main-leave {
                transform: translateY(4px) scale(0.995);
                transition: transform 150ms ease;
            }

            #spa-main.spa-main-enter {
                transform: translateY(10px) scale(0.995);
            }

            #spa-main.spa-main-enter-active {
                transform: translateY(0);
                transition: transform 220ms ease;
            }

            @media (prefers-reduced-motion: reduce) {
                #spa-main.spa-main-leave,
                #spa-main.spa-main-enter,
                #spa-main.spa-main-enter-active {
                    transition: none !important;
                    transform: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function normalizeCacheUrl(url) {
        const normalized = new URL(url, window.location.href);
        normalized.hash = '';
        return normalized.toString();
    }

    function persistPageCache() {
        try {
            const payload = Array.from(pageCache.entries()).map(([url, value]) => ({
                url,
                html: value.html,
                ts: value.ts
            }));
            sessionStorage.setItem(SPA_CACHE_KEY, JSON.stringify(payload));
        } catch (error) {
            // Ignore persistence failures (quota/private mode).
        }
    }

    function prunePageCache() {
        const now = Date.now();
        pageCache.forEach((value, key) => {
            if (now - value.ts > SPA_CACHE_TTL_MS) {
                pageCache.delete(key);
            }
        });

        while (pageCache.size > SPA_CACHE_LIMIT) {
            const oldestKey = pageCache.keys().next().value;
            if (!oldestKey) break;
            pageCache.delete(oldestKey);
        }
    }

    function hydratePageCache() {
        try {
            const raw = sessionStorage.getItem(SPA_CACHE_KEY);
            if (!raw) return;
            const entries = JSON.parse(raw);
            if (!Array.isArray(entries)) return;

            entries.forEach((entry) => {
                if (!entry || typeof entry.url !== 'string' || typeof entry.html !== 'string' || typeof entry.ts !== 'number') {
                    return;
                }
                pageCache.set(entry.url, { html: entry.html, ts: entry.ts });
            });

            prunePageCache();
            persistPageCache();
        } catch (error) {
            // Ignore malformed cache.
        }
    }

    function readCachedPage(url) {
        const key = normalizeCacheUrl(url);
        const entry = pageCache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.ts > SPA_CACHE_TTL_MS) {
            pageCache.delete(key);
            persistPageCache();
            return null;
        }

        // Refresh LRU order.
        pageCache.delete(key);
        pageCache.set(key, entry);
        return entry.html;
    }

    function cachePage(url, html) {
        const key = normalizeCacheUrl(url);
        pageCache.delete(key);
        pageCache.set(key, { html, ts: Date.now() });
        prunePageCache();
        persistPageCache();
    }

    function loadScriptOnce(src, test) {
        if (typeof test === 'function' && test()) {
            return Promise.resolve();
        }

        const existing = document.querySelector(`script[data-runtime-src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') return Promise.resolve();
            return new Promise((resolve, reject) => {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.dataset.runtimeSrc = src;
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            script.addEventListener('error', reject, { once: true });
            document.body.appendChild(script);
        });
    }

    function parseHtml(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    function copyMetaContent(doc, selector) {
        const source = doc.querySelector(selector);
        if (!source) return;

        const target = document.querySelector(selector);
        if (target) {
            target.setAttribute('content', source.getAttribute('content') || '');
        }
    }

    function updateHead(doc) {
        const nextTitle = doc.querySelector('title');
        if (nextTitle) document.title = nextTitle.textContent || document.title;

        const nextCanonical = doc.querySelector('link[rel="canonical"]');
        if (nextCanonical) {
            let canonical = document.querySelector('link[rel="canonical"]');
            if (!canonical) {
                canonical = document.createElement('link');
                canonical.setAttribute('rel', 'canonical');
                document.head.appendChild(canonical);
            }
            canonical.setAttribute('href', nextCanonical.getAttribute('href') || window.location.href);
        }

        copyMetaContent(doc, 'meta[name="description"]');
        copyMetaContent(doc, 'meta[name="keywords"]');
        copyMetaContent(doc, 'meta[property="og:url"]');
        copyMetaContent(doc, 'meta[property="og:title"]');
        copyMetaContent(doc, 'meta[property="og:description"]');
        copyMetaContent(doc, 'meta[property="twitter:url"]');
        copyMetaContent(doc, 'meta[property="twitter:title"]');
        copyMetaContent(doc, 'meta[property="twitter:description"]');
    }

    function shouldHandleLink(link) {
        if (!link || !link.href) return false;
        if (link.target && link.target.toLowerCase() === '_blank') return false;
        if (link.hasAttribute('download')) return false;
        if (link.getAttribute('rel') === 'external') return false;
        if ((link.getAttribute('href') || '').startsWith('mailto:')) return false;
        if ((link.getAttribute('href') || '').startsWith('tel:')) return false;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return false;

        return true;
    }

    async function fetchPageHtml(url, options) {
        const opts = options || {};
        const key = normalizeCacheUrl(url);

        if (opts.preferCache !== false) {
            const cached = readCachedPage(key);
            if (cached) return cached;
        }

        const existing = pageFetches.get(key);
        if (existing) return existing;

        const fetchPromise = fetch(key, {
            headers: { 'X-Requested-With': 'spa' },
            signal: opts.signal
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Navigation fetch failed (${response.status})`);
                }
                const html = await response.text();
                const doc = parseHtml(html);
                if (!doc.querySelector(SPA_MAIN_SELECTOR)) {
                    throw new Error('Missing SPA main container in response');
                }
                cachePage(key, html);
                return html;
            })
            .finally(() => {
                pageFetches.delete(key);
            });

        pageFetches.set(key, fetchPromise);
        return fetchPromise;
    }

    function prefetchPage(url) {
        const key = normalizeCacheUrl(url);
        if (readCachedPage(key)) return;

        fetchPageHtml(key, { preferCache: false }).catch(() => {
            // Prefetch is best-effort only.
        });
    }

    function animateMainEnter(mainContainer) {
        if (!mainContainer) return;

        mainContainer.classList.add('spa-main-enter');
        requestAnimationFrame(() => {
            mainContainer.classList.add('spa-main-enter-active');
            mainContainer.classList.remove('spa-main-enter');
        });

        window.setTimeout(() => {
            mainContainer.classList.remove('spa-main-enter-active');
        }, 240);
    }

    function getNavKeyFromPath(pathname) {
        const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
        if (normalized === '/') return 'home';
        if (normalized === '/posts') return 'posts';
        if (normalized === '/scripts') return 'scripts';
        if (normalized === '/projects') return 'projects';
        return null;
    }

    function syncNavbarState(url) {
        const currentUrl = new URL(url, window.location.href);
        const activeKey = getNavKeyFromPath(currentUrl.pathname);
        const navLinks = document.querySelectorAll('a[data-nav-key]');

        navLinks.forEach((link) => {
            const key = link.dataset.navKey;
            const isActive = Boolean(activeKey) && key === activeKey;

            link.classList.remove('text-gray-100', 'font-bold', 'text-gray-400', 'hover:text-gray-100');
            if (isActive) {
                link.classList.add('text-gray-100', 'font-bold');
            } else {
                link.classList.add('text-gray-400', 'hover:text-gray-100');
            }
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    function scrollAfterNavigation(url, scrollToTop) {
        const next = new URL(url, window.location.href);
        if (next.hash) {
            const target = document.getElementById(next.hash.slice(1));
            if (target) {
                target.scrollIntoView({ behavior: 'auto', block: 'start' });
                return;
            }
        }

        if (scrollToTop) {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
    }

    async function initParticles() {
        if (window.__particlesInitialized) return;
        if (!window.particlesJS) return;

        window.particlesJS('particles-js', {
            particles: {
                number: { value: 130, density: { enable: true, value_area: 900 } },
                color: { value: ['#D8C2FF', '#F5A8E6', '#FFC3D2', '#B7C8FF'] },
                shape: { type: 'circle' },
                opacity: { value: 0.42, random: true },
                size: { value: 2.8, random: true },
                line_linked: {
                    enable: true,
                    distance: 155,
                    color: '#C8A8FF',
                    opacity: 0.28,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 1.5,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out'
                }
            },
            interactivity: {
                detect_on: 'window',
                events: {
                    onhover: { enable: true, mode: 'repulse' },
                    onclick: { enable: true, mode: 'push' },
                    resize: true
                },
                modes: {
                    repulse: {
                        distance: 95,
                        duration: 0.28
                    },
                    push: {
                        particles_nb: 5
                    }
                }
            },
            retina_detect: true
        });

        window.__particlesInitialized = true;
    }

    async function initMermaid(root) {
        const mermaidBlocks = root.querySelectorAll('code.language-mermaid');
        if (!mermaidBlocks.length) return;

        if (!window.__mermaidPromise) {
            window.__mermaidPromise = import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')
                .then((mod) => {
                    mod.default.initialize({ startOnLoad: false, theme: 'dark' });
                    return mod.default;
                });
        }

        const mermaid = await window.__mermaidPromise;

        mermaidBlocks.forEach((block) => {
            const pre = block.parentElement;
            if (!pre || pre.tagName.toLowerCase() !== 'pre') return;

            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = block.textContent;
            pre.replaceWith(div);
        });

        await mermaid.run();
    }

    function initHeaderControls() {
        const searchToggle = document.getElementById('search-toggle');
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('search-input');
        const mobileSocialToggle = document.getElementById('mobile-social-toggle');
        const mobileSocialMenu = document.getElementById('mobile-social-menu');
        const mobileNavOverflowToggle = document.getElementById('mobile-nav-overflow-toggle');
        const mobileNavOverflowMenu = document.getElementById('mobile-nav-overflow-menu');

        if (!searchToggle || !searchContainer || !searchInput) return;

        const openSearch = () => {
            searchContainer.classList.remove('search-hidden');
            searchContainer.classList.add('search-open');
            searchInput.focus();
        };

        const closeSearch = () => {
            searchContainer.classList.remove('search-open');
            searchContainer.classList.add('search-hidden');
        };

        searchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (searchContainer.classList.contains('search-open')) {
                closeSearch();
                return;
            }
            openSearch();
            if (mobileSocialMenu) mobileSocialMenu.classList.add('hidden');
            if (mobileNavOverflowMenu) mobileNavOverflowMenu.classList.add('hidden');
        });

        if (mobileSocialToggle && mobileSocialMenu) {
            mobileSocialToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileSocialMenu.classList.toggle('hidden');
                closeSearch();
                if (mobileNavOverflowMenu) mobileNavOverflowMenu.classList.add('hidden');
            });
        }

        if (mobileNavOverflowToggle && mobileNavOverflowMenu) {
            mobileNavOverflowToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileNavOverflowMenu.classList.toggle('hidden');
                closeSearch();
                if (mobileSocialMenu) mobileSocialMenu.classList.add('hidden');
            });
        }

        if (window.__headerDocumentClickHandler) {
            document.removeEventListener('click', window.__headerDocumentClickHandler);
        }

        window.__headerDocumentClickHandler = (e) => {
            if (!searchToggle.contains(e.target) && !searchContainer.contains(e.target)) {
                closeSearch();
            }
            if (mobileSocialToggle && mobileSocialMenu && !mobileSocialToggle.contains(e.target) && !mobileSocialMenu.contains(e.target)) {
                mobileSocialMenu.classList.add('hidden');
            }
            if (mobileNavOverflowToggle && mobileNavOverflowMenu && !mobileNavOverflowToggle.contains(e.target) && !mobileNavOverflowMenu.contains(e.target)) {
                mobileNavOverflowMenu.classList.add('hidden');
            }
        };

        document.addEventListener('click', window.__headerDocumentClickHandler);

        searchContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        if (mobileNavOverflowMenu) {
            mobileNavOverflowMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        searchInput.addEventListener('keypress', (e) => {
            if (e.key !== 'Enter') return;
            const query = searchInput.value.trim();
            if (!query) return;
            window.spaNavigate(`/search?q=${encodeURIComponent(query)}`);
        });
    }

    function showCommentsReady() {
        const loading = document.getElementById('comments-loading');
        const container = document.getElementById('comments-container');
        if (loading) loading.classList.add('hidden');
        if (container) container.classList.remove('hidden');
    }

    function getGiscusConfig(slot) {
        return {
            repo: slot.dataset.repo || '',
            repoId: slot.dataset.repoId || '',
            category: slot.dataset.category || '',
            categoryId: slot.dataset.categoryId || '',
            mapping: slot.dataset.mapping || 'pathname',
            strict: slot.dataset.strict || '0',
            reactionsEnabled: slot.dataset.reactionsEnabled || '1',
            emitMetadata: slot.dataset.emitMetadata || '0',
            inputPosition: slot.dataset.inputPosition || 'top',
            theme: slot.dataset.theme || '',
            lang: slot.dataset.lang || 'en'
        };
    }

    function updateGiscusRoute(iframe, slot) {
        if (!iframe || !iframe.contentWindow || !slot) return;

        const cfg = getGiscusConfig(slot);
        iframe.contentWindow.postMessage(
            {
                giscus: {
                    setConfig: {
                        repo: cfg.repo,
                        repoId: cfg.repoId,
                        category: cfg.category,
                        categoryId: cfg.categoryId,
                        mapping: cfg.mapping,
                        strict: cfg.strict,
                        reactionsEnabled: cfg.reactionsEnabled,
                        emitMetadata: cfg.emitMetadata,
                        inputPosition: cfg.inputPosition,
                        theme: cfg.theme,
                        lang: cfg.lang,
                        term: window.location.pathname
                    }
                }
            },
            'https://giscus.app'
        );
    }

    function parkGiscusFrame() {
        const iframe = document.querySelector('#comments-container iframe.giscus-frame');
        if (!iframe) return;

        let parking = document.getElementById('giscus-parking');
        if (!parking) {
            parking = document.createElement('div');
            parking.id = 'giscus-parking';
            parking.className = 'hidden';
            document.body.appendChild(parking);
        }

        parking.appendChild(iframe);
        window.__giscusIframe = iframe;
    }

    function initComments() {
        const slot = document.querySelector('.giscus-slot');
        if (!slot) return;

        const loading = document.getElementById('comments-loading');
        const container = document.getElementById('comments-container');
        if (loading) loading.classList.remove('hidden');
        if (container) container.classList.remove('hidden');

        const cachedFrame = window.__giscusIframe;
        if (cachedFrame) {
            slot.innerHTML = '';
            slot.appendChild(cachedFrame);
            updateGiscusRoute(cachedFrame, slot);
            showCommentsReady();
            return;
        }

        slot.innerHTML = '';

        const observer = new MutationObserver(() => {
            const iframe = slot.querySelector('iframe.giscus-frame');
            if (iframe) {
                window.__giscusIframe = iframe;
                iframe.addEventListener('load', () => {
                    showCommentsReady();
                }, { once: true });
                updateGiscusRoute(iframe, slot);
                showCommentsReady();
                observer.disconnect();
            }
        });
        observer.observe(slot, { childList: true, subtree: true });

        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.setAttribute('data-repo', slot.dataset.repo || '');
        script.setAttribute('data-repo-id', slot.dataset.repoId || '');
        script.setAttribute('data-category', slot.dataset.category || '');
        script.setAttribute('data-category-id', slot.dataset.categoryId || '');
        script.setAttribute('data-mapping', slot.dataset.mapping || 'pathname');
        script.setAttribute('data-strict', slot.dataset.strict || '0');
        script.setAttribute('data-reactions-enabled', slot.dataset.reactionsEnabled || '1');
        script.setAttribute('data-emit-metadata', slot.dataset.emitMetadata || '0');
        script.setAttribute('data-input-position', slot.dataset.inputPosition || 'top');
        script.setAttribute('data-theme', slot.dataset.theme || '');
        script.setAttribute('data-lang', slot.dataset.lang || 'en');
        script.setAttribute('data-loading', slot.dataset.loading || 'eager');

        slot.appendChild(script);

        window.setTimeout(() => {
            showCommentsReady();
            observer.disconnect();
        }, 900);
    }

    async function initDowntimeAlert() {
        const alertEl = document.getElementById('downtime-alert');
        const servicesEl = document.getElementById('down-services');
        if (!alertEl || !servicesEl) return;

        const statusPageBaseUrl = getProfileConfig('statusPageBaseUrl', 'https://up.vmd1.dev').replace(/\/$/, '');
        const statusPageSlug = getProfileConfig('statusPageSlug', 'vmd1-dev');
        const statusApi = `${statusPageBaseUrl}/api/status-page/${encodeURIComponent(statusPageSlug)}`;
        const heartbeatApi = `${statusPageBaseUrl}/api/status-page/heartbeat/${encodeURIComponent(statusPageSlug)}`;

        try {
            const [configRes, heartbeatRes] = await Promise.all([
                fetch(statusApi),
                fetch(heartbeatApi)
            ]);

            if (!configRes.ok || !heartbeatRes.ok) return;

            const config = await configRes.json();
            const heartbeats = await heartbeatRes.json();

            const monitorNames = {};
            if (config.publicGroupList) {
                config.publicGroupList.forEach((group) => {
                    if (!group.monitorList) return;
                    group.monitorList.forEach((monitor) => {
                        monitorNames[monitor.id] = monitor.name;
                    });
                });
            }

            const downServices = [];
            if (heartbeats.heartbeatList) {
                Object.keys(heartbeats.heartbeatList).forEach((monitorId) => {
                    const list = heartbeats.heartbeatList[monitorId];
                    if (!list || list.length === 0) return;

                    const latest = list[list.length - 1];
                    if (latest.status === 0 && monitorNames[monitorId]) {
                        downServices.push(monitorNames[monitorId]);
                    }
                });
            }

            if (downServices.length > 0) {
                servicesEl.textContent = downServices.join(', ');
                alertEl.classList.remove('hidden');
                window.setTimeout(() => {
                    alertEl.classList.add('opacity-100');
                }, 10);
            } else {
                alertEl.classList.add('hidden');
            }
        } catch (error) {
            console.error('Uptime Kuma fetch error:', error);
        }
    }

    async function initSearchPage() {
        const resultsContainer = document.getElementById('search-results');
        const template = document.getElementById('search-result-template');
        if (!resultsContainer || !template) return;

        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');

        if (!query) {
            resultsContainer.innerHTML = '<p class="text-gray-400">Please enter a search term.</p>';
            return;
        }

        try {
            await loadScriptOnce('https://cdn.jsdelivr.net/npm/fuse.js@6.6.2', () => typeof window.Fuse !== 'undefined');

            const indexPath = resultsContainer.dataset.searchIndex || '/index.json';
            const response = await fetch(new URL(indexPath, window.location.origin).toString());
            if (!response.ok) throw new Error('Failed to load search index');

            const searchIndex = await response.json();
            const fuse = new window.Fuse(searchIndex, {
                keys: [
                    { name: 'title', weight: 0.7 },
                    { name: 'contents', weight: 0.5 },
                    { name: 'tags', weight: 0.3 },
                    { name: 'categories', weight: 0.3 }
                ],
                threshold: 0.3,
                ignoreLocation: true
            });

            const results = fuse.search(query);
            if (results.length === 0) {
                resultsContainer.innerHTML = `<p class="text-gray-400">No results found for "${query}".</p>`;
                return;
            }

            resultsContainer.innerHTML = '';
            results.forEach((result) => {
                const item = result.item;
                const clone = template.content.cloneNode(true);
                const link = clone.querySelector('a');
                if (link) link.href = item.permalink;

                const titleEl = clone.querySelector('.result-title');
                if (titleEl) titleEl.textContent = item.title;

                if (item.date) {
                    const date = new Date(item.date);
                    const dateEl = clone.querySelector('.result-date');
                    if (dateEl) {
                        dateEl.textContent = date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                }

                const summary = item.summary || `${(item.contents || '').substring(0, 150)}...`;
                const summaryEl = clone.querySelector('.result-summary');
                if (summaryEl) summaryEl.textContent = summary;

                resultsContainer.appendChild(clone);
            });
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<p class="text-red-400">An error occurred while searching. Please try again later.</p>';
        }
    }

    function initScriptsPage() {
        const grid = document.getElementById('scripts-grid');
        const searchInput = document.getElementById('script-search');
        if (!grid || !searchInput) return;
        const scriptsBaseUrl = getProfileConfig('scriptsBaseUrl', 'https://sc.vmd1.dev').replace(/\/$/, '');

        let allScripts = [];
        let currentFilter = 'all';
        const selectedScripts = new Set();

        const renderScripts = (searchTerm) => {
            const term = (searchTerm || '').toLowerCase();

            let selectionOS = null;
            if (selectedScripts.size > 0) {
                const firstCode = selectedScripts.values().next().value;
                const firstScript = allScripts.find((s) => s['short-code'] === firstCode);
                if (firstScript) {
                    selectionOS = firstScript.oses.includes('windows') ? 'windows' : 'linux';
                }
            }

            const filteredScripts = allScripts.filter((script) => {
                const matchesSearch = script.name.toLowerCase().includes(term) || script['short-code'].toLowerCase().includes(term);
                let matchesOS = currentFilter === 'all' || script.oses.includes(currentFilter);
                if (selectionOS) matchesOS = script.oses.includes(selectionOS);
                return matchesSearch && matchesOS;
            });

            if (filteredScripts.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><p>No scripts found matching your criteria.</p></div>';
                return;
            }

            grid.innerHTML = filteredScripts.map((script) => {
                const isWindows = script.oses.includes('windows');
                const osColor = 'text-gray-300 bg-white/5';
                const osIcon = isWindows ? 'ri-windows-fill' : 'ri-qq-fill';
                const osName = isWindows ? 'Windows' : 'Linux';
                const isSelected = selectedScripts.has(script['short-code']);
                const scriptCommand = isWindows
                    ? `irm ${scriptsBaseUrl}/w -OutFile $env:TEMP\\w.ps1; & $env:TEMP\\w.ps1 ${script['short-code']}`
                    : `curl ${scriptsBaseUrl}/l -o /tmp/l && bash /tmp/l ${script['short-code']}`;
                const escapedCommand = scriptCommand.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

                return `
                    <div class="block card p-6 rounded-2xl bg-zinc-950/55 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/65 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 h-full group relative ${isSelected ? 'ring-2 ring-white/20' : ''}" onclick="toggleSelection('${script['short-code']}', '${isWindows ? 'windows' : 'linux'}')">
                        <div class="absolute bottom-4 right-4 z-10">
                            <div class="w-6 h-6 rounded border ${isSelected ? 'bg-white border-white' : 'border-zinc-700 bg-zinc-900'} flex items-center justify-center transition-colors">
                                ${isSelected ? '<i class="ri-check-line text-black text-sm"></i>' : ''}
                            </div>
                        </div>

                        <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${osColor}">
                                    <i class="${osIcon}"></i>
                                    ${osName}
                                </span>
                            </div>
                            <a href="${script.url}" target="_blank" class="text-gray-400 hover:text-gray-100 transition-colors z-20 relative" title="View Source" onclick="event.stopPropagation()">
                                <i class="ri-external-link-line"></i>
                            </a>
                        </div>

                        <h3 class="text-xl font-bold text-gray-100 mb-2">${script.name}</h3>
                        <div class="flex items-center gap-2 text-sm text-gray-400 mb-4 font-mono bg-zinc-950/50 px-2 py-1 rounded w-fit">
                            <i class="ri-terminal-box-line"></i>
                            ${script['short-code']}
                        </div>

                        <div class="relative" onclick="event.stopPropagation()">
                            <div class="bg-zinc-950/70 rounded-lg p-3 font-mono text-xs text-gray-300 break-all pr-10 h-20 overflow-y-auto custom-scrollbar border border-white/5">
                                ${scriptCommand}
                            </div>
                            <button onclick="copyToClipboard(this, '${escapedCommand}')"
                                class="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800"
                                title="Copy command">
                                <i class="ri-file-copy-line"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        };

        const updateBatchBar = () => {
            const bar = document.getElementById('batch-bar');
            const count = document.getElementById('batch-count');
            const commandInput = document.getElementById('batch-command');
            if (!bar || !count || !commandInput) return;

            if (selectedScripts.size > 0) {
                bar.classList.remove('translate-y-full');
                count.textContent = `${selectedScripts.size}`;

                const codes = Array.from(selectedScripts).join(' ');
                const firstScriptCode = selectedScripts.values().next().value;
                const firstScript = allScripts.find((s) => s['short-code'] === firstScriptCode);
                const isWindows = firstScript && firstScript.oses.includes('windows');

                commandInput.value = isWindows
                    ? `irm ${scriptsBaseUrl}/w -OutFile $env:TEMP\\w.ps1; & $env:TEMP\\w.ps1 ${codes}`
                    : `curl ${scriptsBaseUrl}/l -o /tmp/l && bash /tmp/l ${codes}`;
            } else {
                bar.classList.add('translate-y-full');
            }
        };

        window.toggleSelection = (shortCode, os) => {
            if (selectedScripts.size > 0) {
                const firstScriptCode = selectedScripts.values().next().value;
                const firstScript = allScripts.find((s) => s['short-code'] === firstScriptCode);
                const firstScriptOS = firstScript && firstScript.oses.includes('windows') ? 'windows' : 'linux';

                if (firstScriptOS !== os && !selectedScripts.has(shortCode)) {
                    alert('Cannot mix Windows and Linux scripts in one command.\nPlease clear your selection first.');
                    return;
                }
            }

            if (selectedScripts.has(shortCode)) selectedScripts.delete(shortCode);
            else selectedScripts.add(shortCode);

            renderScripts(searchInput.value);
            updateBatchBar();
        };

        window.clearBatch = () => {
            selectedScripts.clear();
            renderScripts(searchInput.value);
            updateBatchBar();
        };

        window.copyBatchCommand = (btn) => {
            const command = (document.getElementById('batch-command') || {}).value || '';
            navigator.clipboard.writeText(command).then(() => {
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="ri-check-line"></i><span>Copied!</span>';
                btn.classList.remove('bg-zinc-950', 'hover:bg-zinc-800');
                btn.classList.add('bg-green-600', 'hover:bg-green-700');

                window.setTimeout(() => {
                    btn.innerHTML = originalContent;
                    btn.classList.add('bg-zinc-950', 'hover:bg-zinc-800');
                    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                }, 2000);
            });
        };

        window.copyToClipboard = (btn, text) => {
            navigator.clipboard.writeText(text).then(() => {
                const icon = btn.querySelector('i');
                if (!icon) return;
                const originalClass = icon.className;

                icon.className = 'ri-check-line text-green-400';
                btn.classList.add('border-green-500/50');

                window.setTimeout(() => {
                    icon.className = originalClass;
                    btn.classList.remove('border-green-500/50');
                }, 2000);
            });
        };

        searchInput.addEventListener('input', (e) => {
            renderScripts(e.target.value);
        });

        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach((b) => {
                    b.classList.remove('bg-zinc-950', 'text-white');
                    b.classList.add('text-gray-400');
                });
                btn.classList.remove('text-gray-400');
                btn.classList.add('bg-zinc-950', 'text-white');

                currentFilter = btn.dataset.os || 'all';
                renderScripts(searchInput.value);
            });
        });

        fetch(`${scriptsBaseUrl}/scripts.json`)
            .then((response) => response.json())
            .then((data) => {
                allScripts = data;
                renderScripts(searchInput.value);
                updateBatchBar();
            })
            .catch((error) => {
                console.error('Error fetching scripts:', error);
                grid.innerHTML = '<div class="col-span-full text-center py-12 text-red-400"><i class="ri-error-warning-line text-3xl mb-2 inline-block"></i><p>Failed to load scripts. Please try again later.</p></div>';
            });
    }

    async function initProjectsPage() {
        const statusEl = document.getElementById('projects-status');
        const gridEl = document.getElementById('projects-grid');
        if (!gridEl) return;

        const username = getProfileConfig('githubUsername', 'vmd1');

        const formatDate = (value) => {
            const date = new Date(value);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).format(date);
        };

        const renderError = (message) => {
            if (!statusEl) return;
            statusEl.textContent = message;
            statusEl.classList.add('text-red-300', 'border-red-500/30', 'bg-red-500/10');
        };

        try {
            const { data: reposData } = await fetchGitHubResource(
                `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`,
                { responseType: 'json', ttlMs: 20 * 60 * 1000 }
            );
            const repos = reposData.filter((repo) => !repo.fork);
            if (statusEl) statusEl.remove();

            if (!repos.length) {
                gridEl.innerHTML = '<p class="text-gray-400">No repositories found.</p>';
                return;
            }

            gridEl.innerHTML = repos.map((repo) => {
                const description = repo.description || 'No description available.';
                const language = repo.language
                    ? `<span class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">${repo.language}</span>`
                    : '';

                return `
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="group block rounded-2xl border border-white/10 bg-zinc-950/55 p-6 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-900/70 hover:shadow-2xl hover:shadow-black/40">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h2 class="text-xl font-semibold text-gray-100 transition-colors group-hover:text-gray-100">${repo.name}</h2>
                                <p class="mt-1 text-sm text-gray-500">${repo.full_name}</p>
                            </div>
                            <i class="ri-external-link-line text-lg text-gray-500 transition-colors group-hover:text-gray-100"></i>
                        </div>
                        <p class="mt-4 text-sm leading-relaxed text-gray-300/90">${description}</p>
                        <div class="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            ${language}
                            <span class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1">
                                <i class="ri-star-line"></i>
                                ${repo.stargazers_count}
                            </span>
                            <span class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1">
                                <i class="ri-git-repository-commits-line"></i>
                                ${repo.forks_count}
                            </span>
                            <span class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1">
                                <i class="ri-time-line"></i>
                                Updated ${formatDate(repo.pushed_at)}
                            </span>
                        </div>
                    </a>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading projects:', error);
            renderError('Failed to load projects from GitHub. Please try again later.');
            gridEl.innerHTML = '';
        }
    }

    async function initWhatsOn() {
        const username = getProfileConfig('githubUsername', 'vmd1');
        const whatsOnMarkdownUrl = getProfileConfig('whatsOnMarkdownUrl', 'https://raw.githubusercontent.com/vmd1/vmd1/refs/heads/main/whats-on.md');
        const excludedRepoFullName = getProfileConfig('excludedRepoFullName', 'vmd1/vmd1.dev');
        const contributionGraphLabel = getProfileConfig('contributionGraphLabel', "Vivaan's contribution graph");
        const whatsOnContentEl = document.getElementById('whats-on-content');
        const activityTodayEl = document.getElementById('activity-today');
        const recentCommitsEl = document.getElementById('recent-commits');
        const contributionGraphEl = document.getElementById('contribution-graph');
        const randomProjectLinkEl = document.getElementById('random-project-link');
        const randomProjectDiceEl = document.getElementById('random-project-dice');

        if (!whatsOnContentEl && !activityTodayEl && !recentCommitsEl) return;

        let candidateRepos = [];
        let currentRandomRepoUrl = '';
        let randomHoverTimeoutId = null;
        let randomHoverIntervalId = null;

        const pickRandomProject = () => {
            if (!randomProjectLinkEl || candidateRepos.length === 0) return;

            let randomRepo = candidateRepos[Math.floor(Math.random() * candidateRepos.length)];
            if (candidateRepos.length > 1) {
                while (randomRepo.html_url === currentRandomRepoUrl) {
                    randomRepo = candidateRepos[Math.floor(Math.random() * candidateRepos.length)];
                }
            }

            currentRandomRepoUrl = randomRepo.html_url;
            randomProjectLinkEl.href = randomRepo.html_url;
            randomProjectLinkEl.setAttribute('data-repo', randomRepo.full_name || '');
        };

        const rollDiceAndShuffle = () => {
            if (randomProjectDiceEl) {
                randomProjectDiceEl.classList.remove('rolling');
                void randomProjectDiceEl.offsetWidth;
                randomProjectDiceEl.classList.add('rolling');
            }
            pickRandomProject();
        };

        const clearRandomHoverTimers = () => {
            if (randomHoverTimeoutId) {
                clearTimeout(randomHoverTimeoutId);
                randomHoverTimeoutId = null;
            }
            if (randomHoverIntervalId) {
                clearInterval(randomHoverIntervalId);
                randomHoverIntervalId = null;
            }
        };

        if (randomProjectLinkEl) {
            randomProjectLinkEl.addEventListener('mouseenter', () => {
                clearRandomHoverTimers();
                randomHoverTimeoutId = window.setTimeout(() => {
                    rollDiceAndShuffle();
                    randomHoverIntervalId = window.setInterval(rollDiceAndShuffle, 1500);
                }, 1500);
            });

            randomProjectLinkEl.addEventListener('mouseleave', () => {
                clearRandomHoverTimers();
            });
        }

        if (whatsOnContentEl) {
            try {
                await loadScriptOnce('https://cdn.jsdelivr.net/npm/marked/marked.min.js', () => typeof window.marked !== 'undefined');
                let markdown = '';
                if (isGitHubResourceUrl(whatsOnMarkdownUrl)) {
                    const result = await fetchGitHubResource(whatsOnMarkdownUrl, { responseType: 'text', ttlMs: 5 * 60 * 1000 });
                    markdown = result.data || '';
                } else {
                    const markdownResponse = await fetch(whatsOnMarkdownUrl);
                    if (!markdownResponse.ok) throw new Error('Could not load markdown');
                    markdown = await markdownResponse.text();
                }
                whatsOnContentEl.innerHTML = window.marked.parse(markdown || 'No updates yet.');
            } catch (error) {
                whatsOnContentEl.innerHTML = '<p class="text-gray-500">Couldn\'t load status updates right now.</p>';
            }
        }

        if (!activityTodayEl || !recentCommitsEl) return;

        const escapeHtml = (value) => String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const renderContributionGraph = (events) => {
            if (!contributionGraphEl) return;

            const days = 30;
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - (days - 1));

            const byDay = new Map();
            for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
                const date = new Date(start);
                date.setDate(start.getDate() + dayIndex);
                const key = date.toISOString().slice(0, 10);
                byDay.set(key, 0);
            }

            events.forEach((event) => {
                if (!event || !event.created_at) return;
                const key = String(event.created_at).slice(0, 10);
                if (!byDay.has(key)) return;

                const current = byDay.get(key) || 0;
                if (event.type === 'PushEvent' && event.payload && Array.isArray(event.payload.commits)) {
                    byDay.set(key, current + Math.max(event.payload.commits.length, 1));
                } else {
                    byDay.set(key, current + 1);
                }
            });

            const data = Array.from(byDay.values());
            const maxValue = Math.max(...data, 5);

            const width = 760;
            const height = 250;
            const left = 42;
            const right = 18;
            const top = 26;
            const bottom = 34;
            const plotWidth = width - left - right;
            const plotHeight = height - top - bottom;

            const x = (index) => left + (index / (days - 1)) * plotWidth;
            const y = (value) => top + plotHeight - (value / maxValue) * plotHeight;
            const points = data.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(' ');

            const horizontalGrid = Array.from({ length: 6 }, (_, index) => {
                const value = (maxValue / 5) * index;
                const yPos = y(value);
                return `<line x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" stroke="rgba(161,161,161,0.14)" stroke-width="1" />`;
            }).join('');

            const verticalGrid = Array.from({ length: 15 }, (_, index) => {
                const xPos = left + (index / 14) * plotWidth;
                return `<line x1="${xPos}" y1="${top}" x2="${xPos}" y2="${height - bottom}" stroke="rgba(161,161,161,0.1)" stroke-width="1" />`;
            }).join('');

            const circles = data.map((value, index) => {
                const cx = x(index).toFixed(2);
                const cy = y(value).toFixed(2);
                return `<circle cx="${cx}" cy="${cy}" r="2.5" fill="#d4d4d8" />`;
            }).join('');

            const xLabels = Array.from({ length: days }, (_, index) => {
                if (index % 2 !== 0 && index !== days - 1) return '';
                const labelDate = new Date(start);
                labelDate.setDate(start.getDate() + index);
                return `<text x="${x(index)}" y="${height - 10}" text-anchor="middle" fill="rgba(161,161,161,0.72)" font-size="9">${labelDate.getDate()}</text>`;
            }).join('');

            const yLabels = Array.from({ length: 6 }, (_, index) => {
                const value = Math.round((maxValue / 5) * (5 - index));
                const yPos = top + (plotHeight / 5) * index + 3;
                return `<text x="${left - 8}" y="${yPos}" text-anchor="end" fill="rgba(161,161,161,0.72)" font-size="9">${value}</text>`;
            }).join('');

            contributionGraphEl.innerHTML = `
                <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(contributionGraphLabel)}" class="w-full h-auto">
                    ${horizontalGrid}
                    ${verticalGrid}
                    <polyline points="${points}" fill="none" stroke="#a1a1a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    ${circles}
                    ${xLabels}
                    ${yLabels}
                </svg>
            `;
        };

        try {
            const { data: events } = await fetchGitHubResource(
                `https://api.github.com/users/${username}/events?per_page=100`,
                { responseType: 'json', ttlMs: 5 * 60 * 1000 }
            );
            const todayUtc = new Date().toISOString().slice(0, 10);
            const todayActivityCount = events.filter((event) => typeof event.created_at === 'string' && event.created_at.startsWith(todayUtc)).length;

            renderContributionGraph(events);
            activityTodayEl.textContent = `Activity today: ${todayActivityCount} events`;

            const { data: repos } = await fetchGitHubResource(
                `https://api.github.com/users/${username}/repos?sort=pushed&per_page=6`,
                { responseType: 'json', ttlMs: 10 * 60 * 1000 }
            );

            if (randomProjectLinkEl) {
                candidateRepos = repos.filter((repo) => repo && repo.full_name && !repo.fork && repo.full_name !== excludedRepoFullName);
                if (candidateRepos.length > 0) pickRandomProject();
            }

            const commitResponses = await Promise.all(
                repos.map((repo) =>
                    fetchGitHubResource(
                        `https://api.github.com/repos/${repo.full_name}/commits?author=${username}&per_page=3`,
                        { responseType: 'json', ttlMs: 5 * 60 * 1000 }
                    )
                        .then((result) => result.data)
                        .catch(() => [])
                )
            );

            const commits = commitResponses
                .flat()
                .filter((commit) => commit && commit.sha && commit.commit && commit.commit.author)
                .map((commit) => ({
                    sha: commit.sha,
                    message: (commit.commit.message || 'Commit').split('\n')[0],
                    url: commit.html_url || `https://github.com/${commit.repository?.full_name || ''}/commit/${commit.sha}`,
                    repo: commit.repository && commit.repository.full_name
                        ? commit.repository.full_name
                        : (commit.url && commit.url.match(/repos\/(.+?)\/commits/) ? commit.url.match(/repos\/(.+?)\/commits/)[1] : 'Unknown repo'),
                    date: commit.commit.author.date
                }))
                .filter((commit) => commit.repo !== excludedRepoFullName)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            const seen = new Set();
            const latestThree = commits.filter((commit) => {
                if (seen.has(commit.sha)) return false;
                seen.add(commit.sha);
                return true;
            }).slice(0, 3);

            if (latestThree.length === 0) {
                recentCommitsEl.innerHTML = '<li class="text-gray-500">No recent public commits found.</li>';
                return;
            }

            recentCommitsEl.innerHTML = latestThree.map((commit) => (
                `<li class="leading-relaxed">` +
                `<a href="${escapeHtml(commit.url)}" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-gray-100">${escapeHtml(commit.message)}</a>` +
                `<span class="text-gray-500"> · ${escapeHtml(commit.repo)}</span>` +
                '</li>'
            )).join('');
        } catch (error) {
            activityTodayEl.textContent = 'Activity today: unavailable';
            recentCommitsEl.innerHTML = '<li class="text-gray-500">Couldn\'t load commit activity right now.</li>';
            if (contributionGraphEl) {
                contributionGraphEl.innerHTML = '<p class="text-gray-500 text-sm">Couldn\'t render contribution graph right now.</p>';
            }
        }
    }

    async function initRecentWork() {
        const container = document.getElementById('timeline-container');
        const noticeContainer = document.getElementById('timeline-notice');
        if (!container) return;

        const username = getProfileConfig('githubUsername', 'vmd1');
        if (noticeContainer) noticeContainer.innerHTML = '';

        try {
            const postsResponse = await fetch('/index.xml');
            if (!postsResponse.ok) throw new Error('Could not load posts feed');

            let ownedRepos = [];
            let starredRepoIds = new Set();
            let githubNotice = '';

            try {
                const ownedResult = await fetchGitHubResource(
                    `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`,
                    { responseType: 'json', ttlMs: 20 * 60 * 1000 }
                );
                ownedRepos = ownedResult.data;

                const starredResult = await fetchGitHubResource(
                    `https://api.github.com/users/${username}/starred?per_page=100`,
                    { responseType: 'json', ttlMs: 20 * 60 * 1000 }
                );
                const starredRepos = starredResult.data;
                starredRepoIds = new Set(starredRepos.map((repo) => repo.id));

                if (ownedResult.source !== 'network' || starredResult.source !== 'network') {
                    githubNotice = '';
                }
            } catch (githubError) {
                githubNotice = 'GitHub API is unavailable, showing posts only (project data unavailable).';
            }

            const postsText = await postsResponse.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(postsText, 'text/xml');
            const postItems = Array.from(xmlDoc.querySelectorAll('item'));

            const posts = postItems.map((item) => {
                const link = item.querySelector('link').textContent;
                let section = 'Post';
                try {
                    const urlObj = new URL(link);
                    const parts = urlObj.pathname.split('/').filter(Boolean);
                    if (parts.length > 0) {
                        const rawSection = parts[0];
                        section = rawSection.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                    }
                } catch (e) {
                    // Keep fallback section name.
                }

                return {
                    title: item.querySelector('title').textContent,
                    link: link,
                    date: new Date(item.querySelector('pubDate').textContent),
                    summary: item.querySelector('description').textContent,
                    tags: Array.from(item.querySelectorAll('category')).map((c) => c.textContent),
                    section: section
                };
            });

            const projects = ownedRepos.filter((repo) => !repo.fork && starredRepoIds.has(repo.id));

            const techMap = {
                python: 'devicon-python-plain',
                javascript: 'devicon-javascript-plain',
                typescript: 'devicon-typescript-plain',
                html: 'devicon-html5-plain',
                css: 'devicon-css3-plain',
                scss: 'devicon-sass-original',
                sass: 'devicon-sass-original',
                docker: 'devicon-docker-plain',
                go: 'devicon-go-original-wordmark',
                golang: 'devicon-go-original-wordmark',
                'c++': 'devicon-cplusplus-plain',
                cpp: 'devicon-cplusplus-plain',
                c: 'devicon-c-plain',
                'c#': 'devicon-csharp-plain',
                csharp: 'devicon-csharp-plain',
                java: 'devicon-java-plain',
                rust: 'devicon-rust-plain',
                vue: 'devicon-vuejs-plain',
                react: 'devicon-react-original',
                angular: 'devicon-angularjs-plain',
                svelte: 'devicon-svelte-plain',
                node: 'devicon-nodejs-plain',
                nodejs: 'devicon-nodejs-plain',
                hugo: 'devicon-hugo-plain',
                git: 'devicon-git-plain',
                github: 'devicon-github-original',
                linux: 'devicon-linux-plain',
                bash: 'devicon-bash-plain',
                shell: 'devicon-bash-plain',
                powershell: 'devicon-powershell-plain',
                windows: 'devicon-windows8-original',
                azure: 'devicon-azure-plain',
                aws: 'devicon-amazonwebservices-original',
                gcp: 'devicon-googlecloud-plain',
                markdown: 'devicon-markdown-original'
            };

            const getTechHTML = (tech, allowText) => {
                const key = tech.toLowerCase().trim();
                if (techMap[key]) {
                    return `<i class="${techMap[key]} text-lg" title="${tech}"></i>`;
                }
                if (allowText) {
                    return `<span class="bg-zinc-800/50 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">${tech}</span>`;
                }
                return '';
            };

            const items = [
                ...projects.map((repo) => ({
                    type: 'project',
                    isProject: true,
                    title: repo.full_name,
                    date: new Date(repo.created_at),
                    desc: repo.description || 'No description available.',
                    link: repo.html_url,
                    icon: 'ri-github-line',
                    technologies: [repo.language, ...(repo.topics || [])].filter(Boolean),
                    stars: repo.stargazers_count
                })),
                ...posts.map((post) => ({
                    type: post.section,
                    isProject: false,
                    title: post.title,
                    date: post.date,
                    desc: post.summary,
                    link: post.link,
                    icon: 'ri-article-line',
                    technologies: post.tags,
                    stars: null
                }))
            ].sort((a, b) => b.date - a.date);

            container.innerHTML = '';

            if (githubNotice && noticeContainer) {
                const noticeEl = document.createElement('div');
                noticeEl.className = 'mb-6 flex items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200';
                noticeEl.innerHTML = `<i class="ri-error-warning-line text-base text-yellow-300"></i><span>${githubNotice}</span>`;
                noticeContainer.innerHTML = '';
                noticeContainer.appendChild(noticeEl);
            }

            const line = document.getElementById('timeline-line');
            if (line) line.classList.remove('hidden');

            const truncateChars = (str, n) => {
                if (!str) return '';
                if (str.length <= n) return str;
                return `${str.slice(0, n)}...`;
            };

            items.forEach((item, index) => {
                const isLeft = index % 2 === 0;
                const truncatedDesc = truncateChars(item.desc, 150);

                let techStackHTML = '';
                if (item.technologies && item.technologies.length > 0) {
                    const techs = item.technologies
                        .map((t) => getTechHTML(t, item.isProject))
                        .filter((t) => t !== '');

                    if (techs.length > 0) {
                        techStackHTML = `<div class="flex flex-wrap gap-2 mt-2">${techs.slice(0, 6).join('')}</div>`;
                    }
                }

                const metaInfo = item.stars !== null
                    ? `<span class="flex items-center gap-1 mr-2 text-yellow-500"><i class="ri-star-fill"></i> ${item.stars}</span>`
                    : '';

                const rowEl = document.createElement('div');
                rowEl.className = `timeline-row relative flex flex-col md:flex-row w-full ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center mb-12 md:mb-0`;

                rowEl.innerHTML = `
                    <div class="w-full md:w-[45%] ${isLeft ? 'md:pr-12' : 'md:pl-12'}">
                        <a href="${item.link}" ${item.type === 'project' ? 'target="_blank"' : ''} class="block card p-6 rounded-2xl bg-zinc-950/55 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/65 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 group decoration-0">
                            <span class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-200 mb-3">
                                ${item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${item.type}
                            </span>
                            <h3 class="text-xl font-semibold text-gray-100 mb-3 group-hover:text-gray-100 transition-colors">
                                ${item.title}
                            </h3>
                            <p class="text-gray-300/90 text-sm text-truncate-3 leading-relaxed mb-4" title="${item.desc}">${truncatedDesc}</p>
                            <div class="flex items-end justify-between">
                                <div class="flex flex-col">${techStackHTML}</div>
                                <div class="flex items-center text-gray-400 text-[11px] font-mono shrink-0 ml-2">
                                    ${metaInfo}
                                    <i class="${item.icon} text-lg text-gray-300/70"></i>
                                </div>
                            </div>
                        </a>
                    </div>

                    <div class="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center w-10 h-10 z-20">
                        <div class="w-3.5 h-3.5 rounded-full bg-zinc-300 ring-4 ring-zinc-950/90"></div>
                        <div class="absolute ${isLeft ? 'right-full' : 'left-full'} h-px w-14 bg-gradient-to-r ${isLeft ? 'from-transparent to-zinc-400/60' : 'from-zinc-400/60 to-transparent'}"></div>
                    </div>

                    <div class="hidden md:block w-full md:w-[45%]"></div>
                `;

                container.appendChild(rowEl);
            });

            if (window.initSpotlight) window.initSpotlight(container);
        } catch (err) {
            console.error(err);
            container.innerHTML = `<p class="text-center text-red-400 py-10">Sync failed: ${err.message}</p>`;
        }
    }

    async function initAll(root) {
        try {
            await initParticles();
            await initMermaid(root);
        } catch (error) {
            console.error('Enhancement initialization error:', error);
        }

        if (window.initSpotlight) window.initSpotlight(root);
        if (window.initCodeCopy) window.initCodeCopy(root);
        if (window.initLightbox) window.initLightbox(root);
        if (window.initProgressBar) window.initProgressBar();

        initHeaderControls();
        initComments();
        initDowntimeAlert();
        initSearchPage();
        initScriptsPage();
        initProjectsPage();
        initWhatsOn();
        initRecentWork();
    }

    async function spaNavigate(url, options) {
        const opts = options || {};
        const push = opts.push !== false;
        const scrollToTop = opts.scrollToTop !== false;

        if (window.__spaAbortController) {
            window.__spaAbortController.abort();
        }

        const controller = new AbortController();
        window.__spaAbortController = controller;

        try {
            const currentMain = document.querySelector(SPA_MAIN_SELECTOR);
            if (currentMain) {
                currentMain.classList.add('spa-main-leave');
            }

            const html = await fetchPageHtml(url, {
                signal: controller.signal,
                preferCache: true
            });
            const nextDoc = parseHtml(html);
            const nextMain = nextDoc.querySelector(SPA_MAIN_SELECTOR);
            const liveMain = document.querySelector(SPA_MAIN_SELECTOR);

            if (!nextMain || !liveMain) {
                window.location.href = url;
                return;
            }

            parkGiscusFrame();
            liveMain.replaceWith(nextMain);
            updateHead(nextDoc);
            animateMainEnter(nextMain);
            syncNavbarState(url);

            if (push) {
                window.history.pushState({}, '', url);
            }

            scrollAfterNavigation(url, scrollToTop);
            await initAll(document);
            document.dispatchEvent(new CustomEvent('spa:navigated'));
        } catch (error) {
            if (error.name === 'AbortError') {
                const mainContainer = document.querySelector(SPA_MAIN_SELECTOR);
                if (mainContainer) mainContainer.classList.remove('spa-main-leave');
                return;
            }
            window.location.href = url;
        }
    }

    function bindSpaNavigation() {
        if (window.__spaBound) return;

        const maybePrefetchFromEvent = (event) => {
            const link = event.target && event.target.closest ? event.target.closest('a') : null;
            if (!shouldHandleLink(link)) return;

            const href = link.href;
            const next = new URL(href, window.location.href);
            const samePath = next.pathname === window.location.pathname && next.search === window.location.search;
            if (samePath) return;

            prefetchPage(href);
        };

        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (!shouldHandleLink(link)) return;

            const url = new URL(link.href, window.location.href);
            const samePath = url.pathname === window.location.pathname && url.search === window.location.search;
            if (samePath && url.hash) return;

            event.preventDefault();
            spaNavigate(url.toString());
        });

        document.addEventListener('pointerenter', maybePrefetchFromEvent, { passive: true, capture: true });
        document.addEventListener('focusin', maybePrefetchFromEvent);
        document.addEventListener('touchstart', maybePrefetchFromEvent, { passive: true });

        window.addEventListener('popstate', () => {
            spaNavigate(window.location.href, { push: false, scrollToTop: false });
        });

        window.__spaBound = true;
    }

    function bootstrap() {
        ensureTransitionStyles();
        hydratePageCache();
        cachePage(window.location.href, document.documentElement.outerHTML);
        syncNavbarState(window.location.href);

        window.spaNavigate = spaNavigate;
        bindSpaNavigation();
        initAll(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
})();
