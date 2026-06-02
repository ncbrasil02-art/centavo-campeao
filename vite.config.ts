import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    hmr: {
      overlay: false
    }
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});