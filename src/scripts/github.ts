/** Cached fetching for GitHub's public API and raw content hosts. */

const CACHE_PREFIX = 'github-fetch-cache-v1:';
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ResponseType = 'json' | 'text';
interface CacheEntry {
  type: ResponseType;
  cachedAt: number;
  data: unknown;
}
export interface GitHubResult<T> {
  data: T;
  source: 'cache' | 'network' | 'stale';
}

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<GitHubResult<unknown>>>();

function readCache(key: string): CacheEntry | null {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (typeof parsed?.cachedAt !== 'number') return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, entry: CacheEntry): void {
  memory.set(key, entry);
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage may be full or unavailable (private mode); the in-memory copy is enough.
  }
}

/**
 * Fetches `url`, serving from a TTL cache when fresh and falling back to a stale
 * copy (up to a week old) when the network fails. Concurrent calls are de-duplicated.
 */
export async function fetchGitHub<T = unknown>(
  url: string,
  { responseType = 'json', ttlMs = DEFAULT_TTL_MS }: { responseType?: ResponseType; ttlMs?: number } = {},
): Promise<GitHubResult<T>> {
  const cached = readCache(url);
  const now = Date.now();
  if (cached?.type === responseType && now - cached.cachedAt <= ttlMs) {
    return { data: cached.data as T, source: 'cache' };
  }

  const key = `${responseType}:${url}`;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<GitHubResult<T>>;

  const request = (async (): Promise<GitHubResult<T>> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`GitHub fetch failed (${response.status})`);
      const data = (responseType === 'text' ? await response.text() : await response.json()) as T;
      writeCache(url, { type: responseType, cachedAt: Date.now(), data });
      return { data, source: 'network' };
    } catch (error) {
      if (cached?.type === responseType && now - cached.cachedAt <= STALE_TTL_MS) {
        return { data: cached.data as T, source: 'stale' };
      }
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  created_at: string;
}

const API = 'https://api.github.com';

export const githubUrls = {
  ownRepos: (user: string, perPage = 100) => `${API}/users/${user}/repos?sort=pushed&per_page=${perPage}`,
  starred: (user: string) => `${API}/users/${user}/starred?per_page=100`,
  events: (user: string) => `${API}/users/${user}/events?per_page=100`,
  commits: (fullName: string, user: string) => `${API}/repos/${fullName}/commits?author=${user}&per_page=3`,
};
