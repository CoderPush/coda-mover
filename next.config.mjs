const isProduction = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  ...isProduction && { // export as static pages into electron app
    output: 'export',
    distDir: 'dist/next',
  }
};

export default nextConfig;
