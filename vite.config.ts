import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://vlmslygnimfbamrtwvyo.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbXNseWduaW1mYmFtcnR3dnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzYzNzUsImV4cCI6MjA5OTExMjM3NX0.qPBblAfE1PP5lMbXRtPid0wa_3J7urXOpRAosdAGtH4'),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
