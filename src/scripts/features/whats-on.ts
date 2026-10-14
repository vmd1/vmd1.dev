/** Home "What's up?" card: status markdown, today's activity, recent commits, contribution graph, random project. */
import { marked } from 'marked';
import { profile } from '../../config/site';
import { escapeHtml } from '../../lib/text';
import { fetchGitHub, githubUrls, type Repo } from '../github';
import { onPageLoad } from '../lifecycle';

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: { commits?: unknown[] };
}
interface GitHubCommit {
  sha: string;
  html_url?: string;
  url?: string;
  commit?: { message?: string; author?: { date: string } };
}

const MINUTE = 60 * 1000;
const GRAPH_DAYS = 30;

function contributionGraph(events: GitHubEvent[]): string {
  const start = new Date();
  start.setDate(start.getDate() - (GRAPH_DAYS - 1));
  const dayAt = (index: number) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  };

  const byDay = new Map<string, number>();
  for (let i = 0; i < GRAPH_DAYS; i++) byDay.set(dayAt(i).toISOString().slice(0, 10), 0);
  for (const event of events) {
    const key = event.created_at?.slice(0, 10);
    if (!byDay.has(key)) continue;
    const weight = event.type === 'PushEvent' ? Math.max(event.payload?.commits?.length ?? 0, 1) : 1;
    byDay.set(key, byDay.get(key)! + weight);
  }

  const data = [...byDay.values()];
  const max = Math.max(...data, 5);
  const [width, height, left, right, top, bottom] = [760, 250, 42, 18, 26, 34];
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (i: number) => left + (i / (GRAPH_DAYS - 1)) * plotWidth;
  const y = (v: number) => top + plotHeight - (v / max) * plotHeight;
  const label = (xPos: number, yPos: number, anchor: string, text: string | number) =>
    `<text x="${xPos}" y="${yPos}" text-anchor="${anchor}" fill="rgba(161,161,161,0.72)" font-size="9">${text}</text>`;

  const horizontal = Array.from({ length: 6 }, (_, i) => {
    const yPos = y((max / 5) * i);
    return `<line x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" stroke="rgba(161,161,161,0.14)" stroke-width="1" />`;
  }).join('');
  const vertical = Array.from({ length: 15 }, (_, i) => {
    const xPos = left + (i / 14) * plotWidth;
    return `<line x1="${xPos}" y1="${top}" x2="${xPos}" y2="${height - bottom}" stroke="rgba(161,161,161,0.1)" stroke-width="1" />`;
  }).join('');
  const points = data.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const dots = data
    .map((v, i) => `<circle cx="${x(i).toFixed(2)}" cy="${y(v).toFixed(2)}" r="2.5" fill="#d4d4d8" />`)
    .join('');
  const xLabels = data
    .map((_, i) => (i % 2 === 0 || i === GRAPH_DAYS - 1 ? label(x(i), height - 10, 'middle', dayAt(i).getDate()) : ''))
    .join('');
  const yLabels = Array.from({ length: 6 }, (_, i) =>
    label(left - 8, top + (plotHeight / 5) * i + 3, 'end', Math.round((max / 5) * (5 - i))),
  ).join('');

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(profile.contributionGraphLabel)}" class="w-full h-auto">
    ${horizontal}${vertical}
    <polyline points="${points}" fill="none" stroke="#a1a1a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}${xLabels}${yLabels}
  </svg>`;
}

/** Re-rolls the "random project" link while the pointer rests on it. */
function bindRandomProject(link: HTMLAnchorElement, dice: HTMLElement | null, getRepos: () => Repo[]) {
  let current = '';
  let timeout: number | undefined;
  let interval: number | undefined;

  const pick = () => {
    const repos = getRepos();
    if (!repos.length) return;
    let repo = repos[Math.floor(Math.random() * repos.length)];
    while (repos.length > 1 && repo.html_url === current) {
      repo = repos[Math.floor(Math.random() * repos.length)];
    }
    current = repo.html_url;
    link.href = repo.html_url;
    link.dataset.repo = repo.full_name;
  };
  const roll = () => {
    if (!link.isConnected) return stop();
    dice?.classList.remove('rolling');
    void dice?.offsetWidth; // restart the CSS animation
    dice?.classList.add('rolling');
    pick();
  };
  const stop = () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };

  link.addEventListener('mouseenter', () => {
    stop();
    timeout = window.setTimeout(() => {
      roll();
      interval = window.setInterval(roll, 1500);
    }, 1500);
  });
  link.addEventListener('mouseleave', stop);
  return pick;
}

onPageLoad(async () => {
  const content = document.getElementById('whats-on-content');
  const activity = document.getElementById('activity-today');
  const commitsList = document.getElementById('recent-commits');
  const graph = document.getElementById('contribution-graph');
  const randomLink = document.getElementById('random-project-link') as HTMLAnchorElement | null;
  if (!content || !activity || !commitsList) return;

  const user = profile.githubUsername;
  const excluded: readonly string[] = profile.excludedRepositories;
  let candidates: Repo[] = [];
  const pickRandom = randomLink
    ? bindRandomProject(randomLink, document.getElementById('random-project-dice'), () => candidates)
    : () => {};

  // Status markdown and GitHub activity load independently.
  const loadStatus = async () => {
    try {
      const { data } = await fetchGitHub<string>(profile.whatsOnMarkdownUrl, {
        responseType: 'text',
        ttlMs: 5 * MINUTE,
      });
      content.innerHTML = await marked.parse(data || 'No updates yet.');
    } catch {
      content.innerHTML = '<p class="text-gray-500">Couldn\'t load status updates right now.</p>';
    }
  };

  const loadActivity = async () => {
    try {
      const { data: events } = await fetchGitHub<GitHubEvent[]>(githubUrls.events(user), { ttlMs: 5 * MINUTE });
      const today = new Date().toISOString().slice(0, 10);
      activity.textContent = `Activity today: ${events.filter((e) => e.created_at?.startsWith(today)).length} events`;
      if (graph) graph.innerHTML = contributionGraph(events);

      const { data: repos } = await fetchGitHub<Repo[]>(githubUrls.ownRepos(user, 6), { ttlMs: 10 * MINUTE });
      candidates = repos.filter((repo) => repo?.full_name && !repo.fork && !excluded.includes(repo.full_name));
      pickRandom();

      const perRepo = await Promise.all(
        repos.map((repo) =>
          fetchGitHub<GitHubCommit[]>(githubUrls.commits(repo.full_name, user), { ttlMs: 5 * MINUTE })
            .then(({ data }) => data.map((commit) => ({ commit, repo: repo.full_name })))
            .catch(() => []),
        ),
      );

      const seen = new Set<string>();
      const latest = perRepo
        .flat()
        .filter(({ commit, repo }) => commit.sha && commit.commit?.author && !excluded.includes(repo))
        .sort((a, b) => Date.parse(b.commit.commit!.author!.date) - Date.parse(a.commit.commit!.author!.date))
        .filter(({ commit }) => !seen.has(commit.sha) && seen.add(commit.sha))
        .slice(0, 3);

      commitsList.innerHTML = latest.length
        ? latest
            .map(({ commit, repo }) => {
              const message = (commit.commit?.message || 'Commit').split('\n')[0];
              const url = commit.html_url || `https://github.com/${repo}/commit/${commit.sha}`;
              return `<li class="leading-relaxed"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-gray-100">${escapeHtml(message)}</a><span class="text-gray-500"> · ${escapeHtml(repo)}</span></li>`;
            })
            .join('')
        : '<li class="text-gray-500">No recent public commits found.</li>';
    } catch {
      activity.textContent = 'Activity today: unavailable';
      commitsList.innerHTML = '<li class="text-gray-500">Couldn\'t load commit activity right now.</li>';
      if (graph) graph.innerHTML = '<p class="text-gray-500 text-sm">Couldn\'t render contribution graph right now.</p>';
    }
  };

  await Promise.all([loadStatus(), loadActivity()]);
});
