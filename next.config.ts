/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    // Liste Ihrer Workspace-Pakete, die transpiliert werden müssen
    '@ocoso/wallet'
  ],
  eslint: {
    dirs: ['src', 'app', 'pages', 'components', 'lib', 'hooks']
  }
};

module.exports = nextConfig;