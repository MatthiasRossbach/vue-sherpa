/**
 * Nuxt module for vue-sherpa
 *
 * Provides auto-imports for the useTour composable and type definitions.
 *
 * @example nuxt.config.ts
 * ```ts
 * export default defineNuxtConfig({
 *   modules: ['vue-sherpa/nuxt']
 * })
 * ```
 */

import { defineNuxtModule, addImports } from '@nuxt/kit'

export interface ModuleOptions {
  /** Prefix for auto-imported composables (default: none) */
  prefix?: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vue-sherpa',
    configKey: 'sherpa',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    prefix: '',
  },
  setup(options, nuxt) {
    const prefix = options.prefix || ''

    // Auto-import useTour composable
    addImports({
      name: 'useTour',
      as: `${prefix}useTour`,
      from: 'vue-sherpa',
    })

    // Add type declarations
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ types: 'vue-sherpa' })
    })
  },
})

declare module '@nuxt/schema' {
  interface NuxtConfig {
    sherpa?: ModuleOptions
  }
  interface NuxtOptions {
    sherpa?: ModuleOptions
  }
}
