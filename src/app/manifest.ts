import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NutriSun — Healthy Tasty Daily',
    short_name: 'NutriSun',
    description: 'Fresh subscription meals with convenient doorstep delivery.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F3F5F4',
    theme_color: '#741B22',
    icons: [
      {
        src: '/nutrisun-logo.png',
        sizes: '1080x1080',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/nutrisun-logo.png',
        sizes: '1080x1080',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
