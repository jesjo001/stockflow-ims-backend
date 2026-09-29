module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: [],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
  restoreMocks: true,
};
