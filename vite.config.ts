import { defineConfig, loadEnv } from "vite";
import { validatePublicConfig } from "./src/lib/public-config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const publicEnv = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  if (command === "build") validatePublicConfig(publicEnv);
  const basePath = publicEnv.NEXT_PUBLIC_APP_BASE_PATH || "/";
  if (!/^\/(?:[a-z0-9-]+\/)*$/.test(basePath)) throw new Error("Invalid application base path");
  return ({
  base: basePath,
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: false,
    },
    allowedHosts: ["staking.bdagdev.xyz", "staking.bdagdev.portfolio"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});
