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
      // M1 lê foto-template + mask via readFile(process.cwd() + '/public/templates/m1/...').
      // Sem este include, o bundle da função serverless não embarca os assets.
      '/api/imagens/m1/render': ['./public/templates/m1/**/*'],
      // M3 usa Satori (Montserrat 600/700/800 estáticos) + decorações PNG do banco.
      '/api/imagens/m3/render': [
        './public/fonts/Montserrat-SemiBold.ttf',
        './public/fonts/Montserrat-Bold.ttf',
        './public/fonts/Montserrat-ExtraBold.ttf',
        './public/brand/m3/decoracoes/*.png',
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
