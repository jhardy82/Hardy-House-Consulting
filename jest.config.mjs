export default {
  testEnvironment: 'node',
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {},
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
};
