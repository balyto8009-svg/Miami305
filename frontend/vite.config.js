// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: true, // Abre automáticamente el navegador
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit', 'react-redux', '@ant-design/icons'],
    },
});
