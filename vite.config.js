import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

/**
 * Vite plugin: after build, replaces __GOOGLE_CLIENT_ID__ in dist/manifest.json
 * with the real value from VITE_GOOGLE_CLIENT_ID in .env.
 */
function injectManifestEnv(mode) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    name: "inject-manifest-env",
    closeBundle() {
      const manifestPath = path.resolve("dist", "manifest.json");
      if (!fs.existsSync(manifestPath)) return;

      let content = fs.readFileSync(manifestPath, "utf-8");
      content = content.replace(
        /__GOOGLE_CLIENT_ID__/g,
        env.VITE_GOOGLE_CLIENT_ID || ""
      );
      fs.writeFileSync(manifestPath, content, "utf-8");
      console.log("✔ Injected VITE_GOOGLE_CLIENT_ID into dist/manifest.json");
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Redirect "/" to "/sidepanel.html" in dev & preview mode
    {
      name: "redirect-root",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/") {
            res.writeHead(302, { Location: "/sidepanel.html" });
            res.end();
            return;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/") {
            res.writeHead(302, { Location: "/sidepanel.html" });
            res.end();
            return;
          }
          next();
        });
      },
    },
    injectManifestEnv(mode),
  ],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "sidepanel.html",
    },
  },
}));
