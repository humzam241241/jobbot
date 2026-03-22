/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Handle PDF.js in Node.js environment
    if (isServer) {
      config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/legacy/build/pdf';
      config.resolve.alias['canvas'] = 'canvas';
      
      // Add fallbacks for browser APIs
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      };
      
      // External modules that should not be bundled
      config.externals.push({
        'pdfjs-dist': 'commonjs pdfjs-dist/legacy/build/pdf',
        'pdfjs-dist/build/pdf.worker.js': 'commonjs pdfjs-dist/build/pdf.worker.js',
        'pdfjs-dist/legacy/build/pdf.worker.js': 'commonjs pdfjs-dist/legacy/build/pdf.worker.js',
        canvas: 'commonjs canvas',
        jsdom: 'commonjs jsdom',
        'pdf-parse': 'commonjs pdf-parse',
      });

      // Keep puppeteer/puppeteer-core external (never bundle — ESM uses private class fields
      // that SWC can't parse). Remap bare 'puppeteer' to 'puppeteer-core' at runtime.
      config.externals.push(
        function ({ request }, callback) {
          if (request === 'puppeteer') {
            return callback(null, 'commonjs puppeteer-core');
          }
          if (/^(puppeteer-core|@sparticuz\/chromium|chrome-aws-lambda|playwright|html-pdf-node)$/.test(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      );
    } else {
      // Client-side configuration
      config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/build/pdf';
    }
    
    return config;
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/puppeteer/**',
        'node_modules/puppeteer-core/**',
        'node_modules/@sparticuz/**',
        'node_modules/chrome-aws-lambda/**',
        'node_modules/playwright/**',
        'node_modules/playwright-core/**',
        'node_modules/.pnpm/puppeteer*/**',
        'node_modules/.pnpm/@sparticuz*/**',
        'node_modules/.pnpm/chrome-aws-lambda*/**',
        'node_modules/.pnpm/playwright*/**',
        'node_modules/**/chromium/**',
        'node_modules/**/.local-chromium/**',
        'node_modules/.pnpm/html-pdf-node*/**',
      ],
    },
    serverComponentsExternalPackages: [
      'canvas',
      'pdfjs-dist',
      'jsdom',
      'playwright',
      'chrome-aws-lambda',
      'puppeteer',
      'puppeteer-core',
      '@sparticuz/chromium',
      'html-pdf-node',
      'pdf-parse',
    ],
  },
}

export default nextConfig;