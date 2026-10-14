/** Shows a banner when any Uptime Kuma monitor is currently down. */
import { profile } from '../../config/site';
import { onPageLoad } from '../lifecycle';

interface StatusConfig {
  publicGroupList?: { monitorList?: { id: number; name: string }[] }[];
}
interface Heartbeats {
  heartbeatList?: Record<string, { status: number }[]>;
}

onPageLoad(async () => {
  const alert = document.getElementById('downtime-alert');
  const services = document.getElementById('down-services');
  if (!alert || !services) return;

  const slug = encodeURIComponent(profile.statusPageSlug);
  const base = profile.statusPageBaseUrl.replace(/\/$/, '');

  try {
    const [configRes, heartbeatRes] = await Promise.all([
      fetch(`${base}/api/status-page/${slug}`),
      fetch(`${base}/api/status-page/heartbeat/${slug}`),
    ]);
    if (!configRes.ok || !heartbeatRes.ok) return;

    const config = (await configRes.json()) as StatusConfig;
    const { heartbeatList = {} } = (await heartbeatRes.json()) as Heartbeats;

    const names = new Map<string, string>();
    for (const group of config.publicGroupList ?? []) {
      for (const monitor of group.monitorList ?? []) names.set(String(monitor.id), monitor.name);
    }

    const down = Object.entries(heartbeatList)
      .filter(([id, beats]) => beats.at(-1)?.status === 0 && names.has(id))
      .map(([id]) => names.get(id)!);

    if (down.length) {
      services.textContent = down.join(', ');
      alert.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Uptime Kuma fetch error:', error);
  }
});
