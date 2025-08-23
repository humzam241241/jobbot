/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  },
  experimental: {
    serverComponentsExternalPackages: [
      'pdfkit',
      'fontkit',
      'html-pdf-node',
      'puppeteer-core',
      'puppeteer',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }

    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
      include: /node_modules/,
    });

    if (isServer) {
      config.externals = [...(config.externals || []),
        'pdfkit',
        'fontkit',
        'html-pdf-node',
        'puppeteer-core',
        'puppeteer',
      ];
    }

    return config;
  },
};

export default nextConfig;