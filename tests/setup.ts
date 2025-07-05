// Global test setup
process.env.NODE_ENV = "test";
process.env.STORAGE_CONNECTION_STRING =
  "DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=testkey;EndpointSuffix=core.windows.net";
process.env.AUTH0_DOMAIN = "test.auth0.com";
process.env.GROK_BASE_URL = "https://api.test-grok.com";

// Mock Azure Functions context
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
