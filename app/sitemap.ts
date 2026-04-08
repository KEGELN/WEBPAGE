import type { MetadataRoute } from 'next';

function getBaseUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
  ];

  const resolved = candidates.find((value) => value && value.trim().length > 0);
  return (resolved || 'http://localhost:3000').replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const routes = [
    '',
    '/home',
    '/player',
    '/scores',
    '/tournaments',
    '/live',
    '/clubs',
    '/berlin',
    '/search',
    '/login',
    '/training',
    '/trainer/login',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/scores' || route === '/tournaments' || route === '/player' ? 0.8 : 0.6,
  }));
}
