module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/built/'],
  reporters: [
    'default',
    ...(process.env.GITHUB_ACTIONS ? ['github-actions'] : []),
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/@types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};
