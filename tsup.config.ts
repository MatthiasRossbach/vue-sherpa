import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/primevue/index': 'src/adapters/primevue/index.ts',
    'adapters/headless/index': 'src/adapters/headless/index.ts',
    nuxt: 'src/nuxt.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['vue', 'primevue', '@nuxt/kit'],
  treeshake: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    }
  },
})
