/** Projects page: lists the owner's non-fork GitHub repositories. */
import { profile } from '../../config/site';
import { escapeHtml } from '../../lib/text';
import { fetchGitHub, githubUrls, type Repo } from '../github';
import { onPageLoad } from '../lifecycle';

const formatDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const chip = (inner: string, extra = 'bg-zinc-900/60 gap-1') =>
  `<span class="inline-flex items-center ${extra} rounded-full border border-white/10 px-3 py-1">${inner}</span>`;

function projectCard(repo: Repo): string {
  return `
    <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="group block rounded-2xl border border-white/10 bg-zinc-950/55 p-6 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-900/70 hover:shadow-2xl hover:shadow-black/40">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-100">${escapeHtml(repo.name)}</h2>
          <p class="mt-1 text-sm text-gray-500">${escapeHtml(repo.full_name)}</p>
        </div>
        <i class="ri-external-link-line text-lg text-gray-500 transition-colors group-hover:text-gray-100"></i>
      </div>
      <p class="mt-4 text-sm leading-relaxed text-gray-300/90">${escapeHtml(repo.description || 'No description available.')}</p>
      <div class="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        ${repo.language ? chip(escapeHtml(repo.language), 'bg-white/5 text-gray-200') : ''}
        ${chip(`<i class="ri-star-line"></i>${repo.stargazers_count}`)}
        ${chip(`<i class="ri-git-repository-commits-line"></i>${repo.forks_count}`)}
        ${chip(`<i class="ri-time-line"></i>Updated ${formatDate.format(new Date(repo.pushed_at))}`)}
      </div>
    </a>`;
}

onPageLoad(async () => {
  const grid = document.getElementById('projects-grid');
  const status = document.getElementById('projects-status');
  if (!grid) return;

  try {
    const { data } = await fetchGitHub<Repo[]>(githubUrls.ownRepos(profile.githubUsername), {
      ttlMs: 20 * 60 * 1000,
    });
    const repos = data.filter((repo) => !repo.fork);
    status?.remove();
    grid.innerHTML = repos.length
      ? repos.map(projectCard).join('')
      : '<p class="text-gray-400">No repositories found.</p>';
  } catch (error) {
    console.error('Error loading projects:', error);
    if (status) {
      status.textContent = 'Failed to load projects from GitHub. Please try again later.';
      status.classList.add('text-red-300', 'border-red-500/30', 'bg-red-500/10');
    }
    grid.innerHTML = '';
  }
});
