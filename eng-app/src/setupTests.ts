import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// import matchers from '@testing-library/jest-dom/matchers'; // Old import
import * as matchers from '@testing-library/jest-dom/matchers'; // New import
import '@testing-library/jest-dom';

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Runs a cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
}); 