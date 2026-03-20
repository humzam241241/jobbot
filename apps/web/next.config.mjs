/** @type {import('next').NextConfig} */
const nextConfig = {
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
        playwright: 'commonjs playwright',
        'chrome-aws-lambda': 'commonjs chrome-aws-lambda',
        puppeteer: 'commonjs puppeteer',
        'puppeteer-core': 'commonjs puppeteer-core',
        'html-pdf-node': 'commonjs html-pdf-node',
      });
    } else {
      // Client-side configuration
      config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/build/pdf';
    }
    
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      'canvas',
      'pdfjs-dist',
      'jsdom',
      'playwright',
      'chrome-aws-lambda',
      'puppeteer',
      'puppeteer-core',
      'html-pdf-node',
    ],
  },
}

export default nextConfig;