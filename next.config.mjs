/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', '@resvg/resvg-js'],
    outputFileTracingIncludes: {
      '/api/imagens/m4/render': [
        './public/fonts/Tinos-Bold.ttf',
        './public/fonts/Tinos-Regular.ttf',
        './public/brand/florzinha.svg',
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
}

export default nextConfig
