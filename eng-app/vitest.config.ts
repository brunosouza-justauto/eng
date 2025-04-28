/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Use global APIs like describe, it, expect
    environment: 'jsdom', // Simulate DOM environment for React components
    setupFiles: './src/setupTests.ts', // Path to setup file
    // You might want to configure other options like coverage later
    // coverage: {
    //   provider: 'v8' // or 'istanbul'
    // }
  },
}); 