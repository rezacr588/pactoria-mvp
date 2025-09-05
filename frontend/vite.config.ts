import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    
    // Build configuration optimized for Azure Static Web Apps and cost efficiency
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Disabled for production to reduce bundle size
      minify: 'esbuild', // Fastest minifier
      target: 'esnext', // Smaller bundles for modern browsers
      cssCodeSplit: true, // Split CSS for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['@headlessui/react', '@heroicons/react'],
            utils: ['@tanstack/react-query', 'zustand']
          },
          // Optimize chunk file names for better caching
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000
    },

    // Development server configuration
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      // Only proxy when using local backend (development mode)
      // When using prod-backend mode, frontend will connect directly to production API
      proxy: mode === 'development' ? {
        // Proxy API requests to local backend in development
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        }
      } : undefined
    },

    // Preview server configuration (for testing production build locally)
    preview: {
      port: 4173,
      host: true
    },

    // Environment variables configuration
    define: {
      // Make sure all VITE_ prefixed environment variables are available
      'import.meta.env.VITE_NODE_ENV': JSON.stringify(env.VITE_NODE_ENV || mode),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
    },

    // Base URL for assets (Azure Static Web Apps)
    base: mode === 'production' ? '/' : '/',

    // Optimize dependencies for faster dev startup and smaller production bundles
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        '@tanstack/react-query',
        'zustand'
      ],
      exclude: []
    },

    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    },

    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      css: true,
      // Include only unit and integration tests from src directory
      include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**'],
      // Mock browser APIs that jsdom doesn't provide
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true
        }
      }
    }
  }
})
