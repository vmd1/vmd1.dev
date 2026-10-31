/** Home "Recent Work" timeline: build-time posts merged with the owner's starred GitHub projects. */
import { profile } from '../../config/site';
import { escapeHtml, truncate } from '../../lib/text';
import { fetchGitHub, githubUrls, type Repo } from '../github';
import { onPageLoad } from '../lifecycle';
import { observeReveals } from '../ui/motion';

interface TimelinePost {
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
  section: string;
}
interface TimelineItem {
  isProject: boolean;
  type: string;
  title: string;
  date: Date;
  description: string;
  link: string;
  icon: string;
  technologies: string[];
  stars: number | null;
}

const TECH_ICONS: Record<string, string> = {
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
  astro: 'devicon-astro-plain',
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
  markdown: 'devicon-markdown-original',
};

const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function techStack(item: TimelineItem): string {
  const chips = item.technologies
    .map((tech) => {
      const icon = TECH_ICONS[tech.toLowerCase().trim()];
      if (icon) return `<i class="${icon} text-lg" title="${escapeHtml(tech)}"></i>`;
      return item.isProject
        ? `<span class="bg-white/5 text-zinc-300 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap">${escapeHtml(tech)}</span>`
        : '';
    })
    .filter(Boolean)
    .slice(0, 5);
  return chips.length ? `<div class="flex flex-wrap items-center gap-2">${chips.join('')}</div>` : '';
}

function card(item: TimelineItem): string {
  const external = item.isProject ? ' target="_blank" rel="noopener noreferrer"' : '';
  const stars =
    item.stars === null
      ? ''
      : `<span class="flex items-center gap-1 text-yellow-500"><i class="ri-star-fill"></i>${item.stars}</span>`;
  return `
    <a href="${escapeHtml(item.link)}"${external} class="tl-card spot group block p-6 rounded-2xl decoration-0">
      <span class="tl-spot" aria-hidden="true"></span>
      <div class="relative flex items-center justify-between mb-4">
        <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-200">${escapeHtml(monthDay.format(item.date))}<span class="text-zinc-500">·</span>${escapeHtml(item.type)}</span>
        <i class="${item.icon} text-xl text-gray-400 transition-colors duration-300 group-hover:text-gray-100"></i>
      </div>
      <h3 class="relative text-xl font-semibold text-gray-100 mb-2 leading-snug">${escapeHtml(item.title)}</h3>
      <p class="relative text-body text-sm text-truncate-3 leading-relaxed mb-5">${escapeHtml(truncate(item.description, 150))}</p>
      <div class="relative flex items-center justify-between gap-3 mt-auto">
        ${techStack(item) || '<span></span>'}
        <div class="flex items-center gap-3 text-meta text-xs shrink-0">
          ${stars}
          <span aria-hidden="true" class="text-base text-gray-300 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">→</span>
        </div>
      </div>
    </a>`;
}

function row(item: TimelineItem, index: number, animate: boolean): string {
  const left = index % 2 === 0;
  const reveal = animate ? ` data-reveal="${left ? 'left' : 'right'}"` : '';
  return `
    <div class="timeline-row relative flex flex-col md:flex-row w-full ${left ? 'md:flex-row' : 'md:flex-row-reverse'} items-center mb-12 md:mb-0"${reveal}>
      <div class="w-full md:w-[45%] ${left ? 'md:pr-12' : 'md:pl-12'}">${card(item)}</div>
      <div class="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center w-10 h-10 z-20" aria-hidden="true">
        <span class="tl-dot"></span>
        <span class="tl-link ${left ? 'right-full origin-right' : 'left-full origin-left'}"></span>
      </div>
      <div class="hidden md:block w-full md:w-[45%]"></div>
    </div>`;
}

async function loadProjects(user: string): Promise<{ projects: Repo[]; ok: boolean }> {
  try {
    const ttlMs = 20 * 60 * 1000;
    const [owned, starred, orgs] = await Promise.all([
      fetchGitHub<Repo[]>(githubUrls.ownRepos(user), { ttlMs }),
      fetchGitHub<Repo[]>(githubUrls.starred(user), { ttlMs }),
      // Org lookups are best-effort: a failure here shouldn't hide personal projects.
      fetchGitHub<{ login: string }[]>(githubUrls.orgs(user), { ttlMs }).catch(() => ({ data: [] as { login: string }[] })),
    ]);
    const orgRepos = await Promise.all(
      orgs.data.map((org) =>
        fetchGitHub<Repo[]>(githubUrls.orgRepos(org.login), { ttlMs })
          .then(({ data }) => data)
          .catch(() => [] as Repo[]),
      ),
    );
    // Featured = non-fork repos you've starred, whether they're yours or in one of your orgs.
    const starredIds = new Set(starred.data.map((repo) => repo.id));
    const unique = new Map<number, Repo>();
    for (const repo of [...owned.data, ...orgRepos.flat()]) unique.set(repo.id, repo);
    return { projects: [...unique.values()].filter((repo) => !repo.fork && starredIds.has(repo.id)), ok: true };
  } catch {
    return { projects: [], ok: false };
  }
}

onPageLoad(async () => {
  const container = document.getElementById('timeline-container');
  const notice = document.getElementById('timeline-notice');
  const postsJson = document.getElementById('timeline-posts');
  if (!container || !postsJson) return;

  const posts = JSON.parse(postsJson.textContent || '[]') as TimelinePost[];

  const render = (allProjects: Repo[], githubOk: boolean, animate: boolean) => {
    // Show no more projects than posts, preferring the newest.
    const projects = [...allProjects]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, posts.length);
    const items: TimelineItem[] = [
      ...projects.map((repo) => ({
        isProject: true,
        type: 'project',
        title: repo.full_name,
        date: new Date(repo.created_at),
        description: repo.description || 'No description available.',
        link: repo.html_url,
        icon: 'ri-github-line',
        technologies: [repo.language, ...(repo.topics ?? [])].filter((t): t is string => Boolean(t)),
        stars: repo.stargazers_count,
      })),
      ...posts.map((post) => ({
        isProject: false,
        type: post.section,
        title: post.title,
        date: new Date(post.date),
        description: post.summary,
        link: post.url,
        icon: 'ri-article-line',
        technologies: post.tags,
        stars: null,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (notice) {
      notice.innerHTML = githubOk
        ? ''
        : '<div class="mb-6 flex items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"><i class="ri-error-warning-line text-base text-yellow-300"></i><span>GitHub API is unavailable, showing posts only (project data unavailable).</span></div>';
    }
    container.innerHTML = items.map((item, index) => row(item, index, animate)).join('');
    observeReveals(container);
    document.getElementById('timeline-line')?.classList.remove('hidden');
  };

  // Wait briefly for GitHub so the timeline renders (and animates) once. If it is slow, show the
  // posts now and merge the projects in later without replaying the entrance.
  const projectsPromise = loadProjects(profile.githubUsername);
  const first = await Promise.race([
    projectsPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
  ]);
  if (!container.isConnected) return;
  if (first) {
    render(first.projects, first.ok, true);
    return;
  }
  render([], true, true);
  const { projects, ok } = await projectsPromise;
  if (container.isConnected && (projects.length || !ok)) render(projects, ok, false);
});
