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

      // These modules are too large for serverless (puppeteer bundles Chromium ~280MB)
      // They are lazy-imported at runtime only when needed, so resolve to empty stubs
      config.externals.push(
        function ({ request }, callback) {
          if (/^(puppeteer|puppeteer-core|chrome-aws-lambda|playwright|html-pdf-node)$/.test(request)) {
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
        'node_modules/chrome-aws-lambda/**',
        'node_modules/playwright/**',
        'node_modules/playwright-core/**',
        'node_modules/.pnpm/puppeteer*/**',
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
      'html-pdf-node',
      'pdf-parse',
    ],
  },
}

export default nextConfig;