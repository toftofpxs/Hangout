export default {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/db/test*.js'
  ],
  transform: {
    '^.+\\.js$': ['babel-jest', { rootMode: 'upward' }]
  }
}
