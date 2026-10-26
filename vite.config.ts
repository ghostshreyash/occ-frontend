import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  /*
   * The OCC API only allows the deployed front-end's origin, so a browser on
   * localhost has every cross-origin call blocked. Proxying /api through the dev
   * server makes those calls same-origin as far as the browser is concerned, so
   * CORS never applies and local work needs no backend change.
   *
   * Dev therefore runs with VITE_API_URL="" (same origin); a deployed build sets
   * the real host and talks to the API directly.
   */
  const target = env.VITE_API_PROXY_TARGET || "https://occ-backend-braw.onrender.com"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
