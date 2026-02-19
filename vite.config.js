import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // algosdk uses Node.js built-ins (Buffer, crypto, stream) – polyfill them for the browser
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  // Needed so algosdk's deep imports resolve correctly
  resolve: {
    alias: {
      // Some WalletConnect sub-packages expect 'events' to be available
    },
  },
  define: {
    // WalletConnect v1 needs global
    global: 'globalThis',
  },
})
