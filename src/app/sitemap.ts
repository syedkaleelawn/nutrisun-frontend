import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://app.nutrisun.cloud',
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://app.nutrisun.cloud/pricing',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
