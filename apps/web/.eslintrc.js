module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Add any existing rules here
  },
  overrides: [
    {
      files: ["**/*.tsx", "**/*.ts"],
      rules: {
        // your existing rules
      }
    },
    {
      // Special rules for client components
      files: ["**/*.tsx", "**/*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      processor: "typescript/typescript",
      rules: {}
    },
    {
      // Client component restrictions
      files: ["**/*.tsx", "**/*.ts"],
      rules: {}
    },
    {
      // Custom rule for client components to prevent server imports
      files: ["**/*.tsx", "**/*.ts"],
      rules: {
        "no-restricted-imports": ["error", {
          patterns: [
            { 
              group: [
                "fs", "node:fs", "path", "node:path", "url", "node:url", 
                "crypto", "node:crypto", "os", "node:os", "child_process", 
                "stream", "node:stream"
              ], 
              message: "Server-only module in a Client Component. Move to API route." 
            },
            { 
              group: [
                "puppeteer", "pdf-parse", "mammoth", "@prisma/*", "prisma", 
                "**/lib/pipeline/**"
              ], 
              message: "Server-only code imported into client. Call an API route instead." 
            }
          ]
        }]
      }
    }
  ]
};