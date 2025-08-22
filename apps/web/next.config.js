/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  },
  webpack: (config, { isServer }) => {
    // Fix for chrome-aws-lambda source map issues
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
      include: /node_modules/,
    });
    
    return config;
  },
};
module.exports = withPWA(nextConfig);

