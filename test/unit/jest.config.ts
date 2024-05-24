module.exports = {
  rootDir: '../../',
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.json'}],
  },
};
