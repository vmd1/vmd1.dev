/** Home "What's up?" card: status markdown, today's activity, recent commits, random project. */
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
      content.innerHTML = '<p class="text-muted">Couldn\'t load status updates right now.</p>';
    }
  };

  const loadActivity = async () => {
    try {
      const { data: events } = await fetchGitHub<GitHubEvent[]>(githubUrls.events(user), { ttlMs: 5 * MINUTE });
      const today = new Date().toISOString().slice(0, 10);
      activity.textContent = `Activity today: ${events.filter((e) => e.created_at?.startsWith(today)).length} events`;

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
              return `<li class="leading-relaxed"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-body hover:text-gray-100">${escapeHtml(message)}</a><span class="text-muted"> · ${escapeHtml(repo)}</span></li>`;
            })
            .join('')
        : '<li class="text-muted">No recent public commits found.</li>';
    } catch {
      activity.textContent = 'Activity today: unavailable';
      commitsList.innerHTML = '<li class="text-muted">Couldn\'t load commit activity right now.</li>';
    }
  };

  await Promise.all([loadStatus(), loadActivity()]);
});
