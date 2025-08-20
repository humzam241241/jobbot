// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/$1',
    '^@server/(.*)$': '<rootDir>/apps/server/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  roots: [
    "<rootDir>/apps/web"
  ],
};
