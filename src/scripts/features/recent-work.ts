/** Home "Recent Work" timeline: build-time posts merged with the owner's starred GitHub projects. */
import { profile } from '../../config/site';
import { escapeHtml, truncate } from '../../lib/text';
import { fetchGitHub, githubUrls, type Repo } from '../github';
import { onPageLoad } from '../lifecycle';

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
        ? `<span class="bg-zinc-800/50 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">${escapeHtml(tech)}</span>`
        : '';
    })
    .filter(Boolean)
    .slice(0, 6);
  return chips.length ? `<div class="flex flex-wrap gap-2 mt-2">${chips.join('')}</div>` : '';
}

function card(item: TimelineItem): string {
  const external = item.isProject ? ' target="_blank" rel="noopener noreferrer"' : '';
  const stars =
    item.stars === null
      ? ''
      : `<span class="flex items-center gap-1 mr-2 text-yellow-500"><i class="ri-star-fill"></i> ${item.stars}</span>`;
  return `
    <a href="${escapeHtml(item.link)}"${external} class="block card p-6 rounded-2xl bg-zinc-950/55 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/65 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 group decoration-0">
      <span class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-200 mb-3">${escapeHtml(monthDay.format(item.date))} · ${escapeHtml(item.type)}</span>
      <h3 class="text-xl font-semibold text-gray-100 mb-3 group-hover:text-gray-100 transition-colors">${escapeHtml(item.title)}</h3>
      <p class="text-body text-sm text-truncate-3 leading-relaxed mb-4">${escapeHtml(truncate(item.description, 150))}</p>
      <div class="flex items-end justify-between gap-3">
        <div class="flex flex-wrap gap-2">${techStack(item)}</div>
        <div class="flex items-center text-meta text-[11px] font-mono shrink-0 ml-2">
          <span class="flex items-center gap-1 mr-2">${stars}</span>
          <i class="${item.icon} text-lg text-gray-300/70"></i>
        </div>
      </div>
    </a>`;
}

function row(item: TimelineItem, index: number): string {
  const left = index % 2 === 0;
  return `
    <div class="timeline-row relative flex flex-col md:flex-row w-full ${left ? 'md:flex-row' : 'md:flex-row-reverse'} items-center mb-12 md:mb-0">
      <div class="w-full md:w-[45%] ${left ? 'md:pr-12' : 'md:pl-12'}">${card(item)}</div>
      <div class="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center w-10 h-10 z-20">
        <div class="w-3.5 h-3.5 rounded-full bg-zinc-300 ring-4 ring-zinc-950/90"></div>
        <div class="absolute ${left ? 'right-full' : 'left-full'} h-px w-14 bg-linear-to-r ${left ? 'from-transparent to-zinc-400/60' : 'from-zinc-400/60 to-transparent'}"></div>
      </div>
      <div class="hidden md:block w-full md:w-[45%]"></div>
    </div>`;
}

async function loadProjects(user: string): Promise<{ projects: Repo[]; ok: boolean }> {
  try {
    const [owned, starred] = await Promise.all([
      fetchGitHub<Repo[]>(githubUrls.ownRepos(user), { ttlMs: 20 * 60 * 1000 }),
      fetchGitHub<Repo[]>(githubUrls.starred(user), { ttlMs: 20 * 60 * 1000 }),
    ]);
    const starredIds = new Set(starred.data.map((repo) => repo.id));
    return { projects: owned.data.filter((repo) => !repo.fork && starredIds.has(repo.id)), ok: true };
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

  const render = (projects: Repo[], githubOk: boolean) => {
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
    container.innerHTML = items.map(row).join('');
    document.getElementById('timeline-line')?.classList.remove('hidden');
  };

  // Posts are already on the page, so show them immediately and merge projects in when GitHub answers.
  render([], true);
  const { projects, ok } = await loadProjects(profile.githubUsername);
  if (container.isConnected && (projects.length || !ok)) render(projects, ok);
});
