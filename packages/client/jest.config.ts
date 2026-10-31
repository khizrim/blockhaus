import dotenv from 'dotenv';
import type { Config } from 'jest';

dotenv.config();

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-fixed-jsdom',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  globals: {
    __SERVER_PORT__: process.env.SERVER_PORT,
    'ts-jest': {
      isolatedModules: true,
    },
  },
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^.+\\.css$': 'identity-obj-proxy',
    '^.+\\.svg$': 'jest-svg-transformer',
    'src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/fileTransformer.js',
  },
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

export default config;
