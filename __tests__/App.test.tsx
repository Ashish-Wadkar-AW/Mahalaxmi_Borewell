import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k: string, v: string) => {
    storage[k] = v;
    return Promise.resolve();
  }),
  getItem: jest.fn((k: string) => Promise.resolve(storage[k] || null)),
  removeItem: jest.fn((k: string) => {
    delete storage[k];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    return Promise.resolve();
  }),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(() => Promise.resolve(null)),
  resetGenericPassword: jest.fn(),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
