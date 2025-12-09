import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 로컬: .env 파일에서 읽기
  const env = loadEnv(mode, '.', '');
  
  // Vercel 빌드 시: process.env에서 직접 읽기 (Node.js 환경)
  const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // 클라이언트 코드에서 사용 가능하도록 주입
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
