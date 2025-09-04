import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    
    // Build configuration optimized for Azure Static Web Apps
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          }
        }
      }
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

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: []
    },

    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    }
  }
})
