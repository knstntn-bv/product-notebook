import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // For GitHub Pages project site: set base to "/repository-name/"
  // For GitHub Pages user/organization site (username.github.io): set base to "/"
  // IMPORTANT: Change "product-notebook" to your actual repository name if different
  base: process.env.VITE_BASE_PATH || "/product-notebook/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
