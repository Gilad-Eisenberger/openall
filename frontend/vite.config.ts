import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        react(),
        tailwindcss(),
        babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
        proxy: {
            '/api/chat': {
                target: 'ws://localhost:3000',
                ws: true,
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/redirect': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
})
