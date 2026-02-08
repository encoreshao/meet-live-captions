import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
  ],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "sidepanel.html",
    },
  },
});
