/** Animated particle backdrop. The canvas persists across navigations. */
// particles.js is a sloppy-mode classic script (it uses arguments.callee), so it cannot be
// bundled as an ES module. Load it as a plain script from its hashed asset URL instead.
import particlesUrl from 'particles.js/particles.js?url';

declare global {
  interface Window {
    particlesJS?: (id: string, config: object) => void;
  }
}

const config = {
  particles: {
    number: { value: window.matchMedia('(max-width: 768px)').matches ? 70 : 130, density: { enable: true, value_area: 900 } },
    color: { value: ['#D8C2FF', '#F5A8E6', '#FFC3D2', '#B7C8FF'] },
    shape: { type: 'circle' },
    opacity: { value: 0.42, random: true },
    size: { value: 2.8, random: true },
    line_linked: { enable: true, distance: 155, color: '#C8A8FF', opacity: 0.28, width: 1 },
    move: { enable: true, speed: 1.5, direction: 'none', random: false, straight: false, out_mode: 'out' },
  },
  interactivity: {
    detect_on: 'window',
    events: {
      onhover: { enable: true, mode: 'repulse' },
      onclick: { enable: true, mode: 'push' },
      resize: true,
    },
    modes: { repulse: { distance: 95, duration: 0.28 }, push: { particles_nb: 5 } },
  },
  retina_detect: true,
};

function loadLibrary(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = particlesUrl;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.append(script);
  });
}

let started = false;
document.addEventListener('astro:page-load', async () => {
  if (started) return;
  started = true;
  // The backdrop is pure decoration: skip it entirely for people who ask for less motion.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    await loadLibrary();
    window.particlesJS?.('particles-js', config);
  } catch (error) {
    console.error('Could not start particles backdrop:', error);
  }
});
