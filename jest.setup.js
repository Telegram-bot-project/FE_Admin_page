require('@testing-library/jest-dom');

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock environment variables
process.env = {
  ...process.env,
  VITE_GOOGLE_MAPS_API_KEY: 'test-api-key',
}; 