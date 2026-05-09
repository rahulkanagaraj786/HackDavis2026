/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress punycode deprecation from @solana/web3.js on Node 22+
  experimental: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Anchor/Solana deps are server-only
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
