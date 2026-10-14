/** Site-wide configuration. Everything that used to live in hugo.yaml params. */

export const site = {
  title: 'vmd1',
  language: 'en-us',
  description:
    "Vivaan M's portfolio and blog. Exploring programming, security, and technology.",
  keywords: 'programming, security, cybersecurity, blog, portfolio, vmd1, vivaan m',
  /** Fallback social-sharing image. */
  image: 'https://cdn.848226.xyz/v1/vmd1/media/logo/logo.png',
  analyticsId: 'G-Z0H0P60H5S',
  author: { name: 'Vivaan M', email: 'me@vmd1.dev' },
} as const;

export const profile = {
  logoUrl: 'https://cdn.848226.xyz/v1/vmd1/media/logo/logo.svg',
  logoAlt: 'vmd1 logo',
  githubUsername: 'vmd1',
  linkedinUrl: 'https://www.linkedin.com/in/vmd1',
  email: 'me@vmd1.dev',
  matrixId: '@vivaan:vmd1.dev',
  statusPageBaseUrl: 'https://up.vmd1.dev',
  statusPageSlug: 'vmd1-dev',
  infrastructureName: 'vmd1 Infrastructure',
  scriptsBaseUrl: 'https://sc.vmd1.dev',
  scriptsIndexUrl: 'https://raw.githubusercontent.com/vmd1/scripts/refs/heads/main/scripts.json',
  whatsOnMarkdownUrl: 'https://raw.githubusercontent.com/vmd1/vmd1/refs/heads/main/whats-on.md',
  excludedRepositories: ['vmd1/vmd1.dev', 'vmd1/polytrack'],
  contributionGraphLabel: "Vivaan's contribution graph",
  aboutIntro:
    "I'm Vivaan, a teen dev who builds secure, self-hosted systems, and breaks them (ethically) for fun. This is my portfolio page where I dump my projects, write-ups, and blog posts about what I'm learning along the way.",
  aboutCurrent:
    "Right now, I'm working on a few open-source projects - mostly related to security tools and automation. I love digging into code, figuring out how stuff works under the hood, and then building (or breaking) things just to see what happens.",
} as const;

export const giscus = {
  repo: 'vmd1/init0',
  repoId: 'R_kgDOOtTSnQ',
  category: 'Comments',
  categoryId: 'DIC_kwDOOtTSnc4Cu2Vr',
  /** Giscus must load this over the public internet, so it is always absolute. */
  themeUrl: 'https://vmd1.dev/css/giscus.css',
} as const;

/** Content sections shown in the posts grid, archive, home timeline and RSS. */
export const listedSections = ['docs', 'foundation', 'guides', 'posts', 'updates', 'k3s'] as const;

/** Sections that are rendered but never listed, indexed or put in the sitemap. */
export const unlistedSections = ['white-hat'] as const;

/** Sections that only exist to test rendering; listed under their own URL only. */
export const noindexSections = ['testing', 'white-hat'] as const;

export const nav = [
  { key: 'home', href: '/', label: 'Home', icon: 'ri-home-line', overflow: false },
  { key: 'posts', href: '/posts/', label: 'Posts', icon: 'ri-article-line', overflow: false },
  { key: 'projects', href: '/projects/', label: 'Projects', icon: 'ri-function-line', overflow: true },
] as const;

export type NavKey = (typeof nav)[number]['key'];
