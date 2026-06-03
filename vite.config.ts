import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    projects: [
      {
        extends: "./vite.config.ts",
        mode: "vitest-client",
        test: {
          name: "client",
          environment: "happy-dom",
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**", "tests/server/**"]
        },
        resolve: { conditions: ["browser"] }
      },
      {
        extends: "./vite.config.ts",
        mode: "vitest-server",
        test: {
          name: "server",
          environment: "node",
          include: ["tests/server/**/*.{test,spec}.{js,ts}"]
        }
      }
    ]
  }
})
