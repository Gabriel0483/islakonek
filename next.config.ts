import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Fix for cross-origin workstation preview issues and server action origin validation
  experimental: {
    serverActions: {
      allowedOrigins: [
        '6000-firebase-studio-1777924168732.cluster-tafiw3cv6fduct4hlcc5knh5fo.cloudworkstations.dev',
        '*.cloudworkstations.dev',
        'localhost:9002'
      ],
    },
  },
};

export default nextConfig;
