module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      { jsc: { transform: { react: { runtime: 'automatic' } } } },
    ],
  },
  moduleNameMapper: {
    '^@thenoreal/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
    '^@thenoreal/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@/lib/(.*)$': '<rootDir>/../packages/shared/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/../packages/shared/src/types/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
};
