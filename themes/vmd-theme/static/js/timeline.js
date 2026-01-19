async function buildTimeline() {
    const container = document.getElementById('timeline-container');
    // If container is not present on this page, do nothing
    if (!container) return;

    // Avoid multiple fetches if already populated
    if (container.dataset.loaded === 'true') return;

    const username = 'vmd1';

    function applyTilt(card) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const { width, height } = rect;
            const rotateX = (y / height - 0.5) * -10;
            const rotateY = (x / width - 0.5) * 10;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    }

    try {
        const [ownedResponse, starredResponse, postsResponse] = await Promise.all([
            fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`),
            fetch(`https://api.github.com/users/${username}/starred?per_page=100`),
            fetch('/index.xml')
        ]);

        if (!ownedResponse.ok || !starredResponse.ok || !postsResponse.ok) throw new Error('Network error');

        const ownedRepos = await ownedResponse.json();
        const starredRepos = await starredResponse.json();
        
        const postsText = await postsResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(postsText, "text/xml");
        const postItems = Array.from(xmlDoc.querySelectorAll("item"));
        
        const posts = postItems.map(item => ({
            title: item.querySelector("title").textContent,
            link: item.querySelector("link").textContent,
            date: new Date(item.querySelector("pubDate").textContent),
            summary: item.querySelector("description").textContent,
            tags: Array.from(item.querySelectorAll("category")).map(c => c.textContent).join(" | ")
        }));

        const starredIds = new Set(starredRepos.map(repo => repo.id));
        const projects = ownedRepos.filter(repo => starredIds.has(repo.id));

        const items = [
            ...projects.map(r => ({
                type: 'project',
                title: r.full_name,
                date: new Date(r.created_at),
                desc: r.description || 'No description available.',
                link: r.html_url,
                icon: 'ri-github-line',
                meta: `⭐ ${r.stargazers_count} | ${r.language || 'N/A'}`
            })),
            ...posts.map(p => ({
                type: 'post',
                title: p.title,
                date: p.date,
                desc: p.summary,
                link: p.link,
                icon: 'ri-article-line',
                meta: p.tags || 'Blog Post'
            }))
        ].sort((a, b) => b.date - a.date);

        container.innerHTML = '';
        const line = document.getElementById('timeline-line');
        if(line) {
            line.classList.add('md:block');
            line.classList.remove('hidden');
        }

        // Helper to truncate text to n chars
        const truncateChars = (str, n) => {
            if (!str) return '';
            if (str.length <= n) return str;
            return str.slice(0, n) + '...';
        };

        items.forEach((item, index) => {
            const isLeft = index % 2 === 0;
            const truncatedDesc = truncateChars(item.desc, 150);

            const rowEl = document.createElement('div');
            rowEl.className = `timeline-row flex flex-col md:flex-row w-full ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center mb-12 md:mb-0`;
            
            rowEl.innerHTML = `
                <!-- Content Side -->
                <div class="w-full md:w-[45%] ${isLeft ? 'md:pr-12' : 'md:pl-12'}">
                    <a href="${item.link}" ${item.type === 'project' ? 'target="_blank"' : ''} class="block card p-6 rounded-2xl bg-slate-900 border border-transparent shadow-none transition-all duration-300 hover:bg-slate-800 hover:border-blue-500/50 group decoration-0">
                        <span class="text-sm font-semibold text-blue-400 mb-2 block uppercase tracking-wider">
                            ${item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${item.type}
                        </span>
                        <h3 class="text-xl font-bold text-gray-100 mb-3 group-hover:text-blue-400 transition-colors">
                            ${item.title}
                        </h3>
                        <p class="text-gray-400 text-sm text-truncate-3 leading-relaxed mb-4" title="${item.desc}">${truncatedDesc}</p>
                        <div class="flex items-center justify-between text-[11px] font-mono text-gray-500">
                            <span>${item.meta}</span>
                            <i class="${item.icon} text-lg text-blue-500/50"></i>
                        </div>
                    </a>
                </div>

                <!-- Center Dot & Line Connectors -->
                <div class="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center w-8 h-8 z-20">
                    <div class="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] border-4 border-slate-900"></div>
                    <div class="absolute ${isLeft ? 'right-full' : 'left-full'} h-px w-12 bg-gradient-to-r ${isLeft ? 'from-transparent to-blue-500/50' : 'from-blue-500/50 to-transparent'}"></div>
                </div>

                <!-- Spacing Side -->
                <div class="hidden md:block w-full md:w-[45%]"></div>
            `;
            
            container.appendChild(rowEl);
            applyTilt(rowEl.querySelector('.card'));
        });
        
        container.dataset.loaded = 'true';

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-center text-red-400 py-10">Sync failed: ${err.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', buildTimeline);
document.addEventListener('page:loaded', buildTimeline);
