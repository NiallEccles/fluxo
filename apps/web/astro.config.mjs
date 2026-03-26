import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  output: 'static',
  site: 'https://nialleccles.github.io',
  base: '/fluxo',
  integrations: [react(), tailwind()],
})
