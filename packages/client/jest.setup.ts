import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import 'whatwg-fetch';

import { server } from './src/utils/tests/mocks/server';

configure({ testIdAttribute: 'data-qa' });

window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
