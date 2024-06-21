import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fonts from "unplugin-fonts/vite";

export default defineConfig({
  plugins: [
    vue(),
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
