import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fonts from "unplugin-fonts/vite";
import devtools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [
    vue(),
    devtools(),
    fonts({
      google: {
        families: [
          {
            name: "Zen Kaku Gothic New",
            styles: "wght@400;700",
          },
        ],
      },
    }),
  ],

  build: {
    outDir: `../../dist/frontend`,
  },
  server: {
    port: parseInt(process.env.FRONT_PORT!),
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
