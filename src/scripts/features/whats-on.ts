/** Home "What's up?" card: today's GitHub activity and recent commits */
import { profile } from '../../config/site';
import { escapeHtml } from '../../lib/text';
import { fetchGitHub, githubUrls } from '../github';
import { onPageLoad } from '../lifecycle';

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: { commits?: unknown[] };
}
interface GitHubCommit {
  sha: string;
  html_url?: string;
  commit?: { message?: string; author?: { date: string } };
  repository?: { full_name: string };
}

const MINUTE = 60 * 1000;
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function timeAgo(iso: string | undefined): string {
  const then = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(then)) return '';
  const minutes = Math.round((then - Date.now()) / MINUTE);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}

onPageLoad(async () => {
  const activity = document.getElementById('activity-today');
  const commitsList = document.getElementById('recent-commits');
  if (!activity || !commitsList) return;

  const user = profile.githubUsername;
  const excluded: readonly string[] = profile.excludedRepositories;

  const loadActivity = async () => {
    try {
      const { data: events } = await fetchGitHub<GitHubEvent[]>(githubUrls.events(user), { ttlMs: 5 * MINUTE });
      const today = new Date().toISOString().slice(0, 10);
      activity.textContent = `Activity today: ${events.filter((e) => e.created_at?.startsWith(today)).length} events`;

      const { data: found } = await fetchGitHub<{ items: GitHubCommit[] }>(githubUrls.authoredCommits(user), {
        ttlMs: 5 * MINUTE,
      });
      const latest = found.items
        .filter((commit) => commit.sha && commit.repository && !excluded.includes(commit.repository.full_name))
        .slice(0, 3)
        .map((commit) => ({ commit, repo: commit.repository!.full_name }));

      commitsList.innerHTML = latest.length
        ? latest
            .map(({ commit, repo }, index) => {
              const message = (commit.commit?.message || 'Commit').split('\n')[0];
              const url = commit.html_url || `https://github.com/${repo}/commit/${commit.sha}`;
              const ago = timeAgo(commit.commit?.author?.date);
              return `<li class="leading-relaxed" data-rise style="--i:${index + 4}"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-body hover:text-gray-100 transition-colors">${escapeHtml(message)}</a><span class="text-muted"> · ${escapeHtml(repo)}${ago ? ` · ${escapeHtml(ago)}` : ''}</span></li>`;
            })
            .join('')
        : '<li class="text-muted">No recent public commits found.</li>';
    } catch {
      activity.textContent = 'Activity today: unavailable';
      commitsList.innerHTML = '<li class="text-muted">Couldn\'t load commit activity right now.</li>';
    }
  };

  await loadActivity();
});
