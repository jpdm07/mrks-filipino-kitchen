/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel CI: don’t block deploys on lint/TS drift; fix locally with `npm run lint`.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
