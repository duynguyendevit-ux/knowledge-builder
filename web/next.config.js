/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://kb-api.tomtom79.tech/api/:path*',
      },
    ]
  },
}

export default nextConfig
