/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://139.59.109.76:3002/api/:path*',
      },
    ]
  },
}

export default nextConfig
