import adapter from "@sveltejs/adapter-node"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  },
  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    typescript: {
      config: (config) => {
        if (!config.compilerOptions.types) {
          config.compilerOptions.types = []
        }
        config.compilerOptions.types.push(
          "@digdir/designsystemet-web",
          "@digdir/designsystemet-types",
          "@digdir/designsystemet-css/theme" /* or your theme type file, design-tokens-build/types.d.ts */
        )
        return config
      }
    }
  }
}

export default config
