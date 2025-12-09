# vue-sherpa

Headless tour/onboarding library for Vue 3 with a **bring-your-own-component** design.

[![npm version](https://img.shields.io/npm/v/vue-sherpa.svg)](https://www.npmjs.com/package/vue-sherpa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Headless architecture** - Full control over UI rendering
- **Framework adapters** - Ready-to-use PrimeVue adapter, or build your own
- **TypeScript first** - Full type safety and IntelliSense support
- **Lightweight** - ~4KB minified (core), requires only Vue 3.4+ as peer dependency
- **Nuxt module** - Auto-imports for Nuxt 3 projects
- **Keyboard navigation** - Arrow keys, Enter, Escape support
- **Accessibility** - Focus management and ARIA support

## Installation

```bash
# npm
npm install vue-sherpa

# pnpm
pnpm add vue-sherpa

# yarn
yarn add vue-sherpa
```

### Peer Dependencies

vue-sherpa requires Vue 3.4+:

```bash
npm install vue@^3.4.0
```

For the PrimeVue adapter (optional):

```bash
npm install primevue@^4.0.0
```

## Quick Start

### Basic Usage (Headless)

```vue
<script setup>
import { useTour } from 'vue-sherpa'

const { state, start, next, previous, skip } = useTour({
  steps: [
    {
      id: 'welcome',
      target: '#welcome-section',
      title: 'Welcome!',
      content: 'Let us show you around.',
    },
    {
      id: 'sidebar',
      target: '.sidebar',
      title: 'Navigation',
      content: 'Use the sidebar to navigate.',
      placement: 'right',
    },
  ],
  onComplete: () => console.log('Tour completed!'),
})
</script>

<template>
  <button @click="start()">Start Tour</button>

  <!-- Your custom tour UI -->
  <Teleport to="body">
    <div v-if="state.status === 'active'" class="tour-overlay">
      <div class="tour-popover">
        <h3>{{ state.currentStep?.title }}</h3>
        <p>{{ state.currentStep?.content }}</p>
        <div class="tour-actions">
          <button @click="skip()">Skip</button>
          <button @click="previous()" :disabled="state.isFirstStep">Back</button>
          <button @click="next()">
            {{ state.isLastStep ? 'Finish' : 'Next' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

### With PrimeVue Adapter

```vue
<script setup>
import { useTour } from 'vue-sherpa'
import { SherpaPrimeVue } from 'vue-sherpa/primevue'

const { state, controls, start } = useTour({
  steps: [
    { id: 'welcome', target: '#header', content: 'Welcome!' },
    { id: 'sidebar', target: '.nav', content: 'Navigate here' },
  ],
})
</script>

<template>
  <Button @click="start()">Start Tour</Button>
  <SherpaPrimeVue :state="state" :controls="controls" />
</template>
```

### With Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-sherpa/nuxt'],
})
```

The `useTour` composable is auto-imported:

```vue
<script setup>
// No import needed - auto-imported by Nuxt module
const tour = useTour({
  steps: [/* ... */],
})
</script>
```

## API Reference

### `useTour(options)`

The main composable for managing tour state.

#### Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `steps` | `TourStep[]` | required | Array of tour steps |
| `showStepCount` | `boolean` | `true` | Show "1 of 5" counter |
| `showProgress` | `boolean` | `true` | Show progress bar |
| `keyboardNavigation` | `boolean` | `true` | Enable arrow keys navigation |
| `closeOnEscape` | `boolean` | `true` | Close tour on Escape key |
| `closeOnClickOutside` | `boolean` | `false` | Close when clicking outside |
| `scrollToTarget` | `boolean` | `true` | Auto-scroll to target element |
| `scrollBehavior` | `ScrollBehavior` | `'smooth'` | Scroll animation style |
| `highlightPadding` | `number` | `8` | Padding around highlighted element |
| `overlayOpacity` | `number` | `0.5` | Backdrop opacity (0-1) |
| `zIndex` | `number` | `9999` | Z-index for tour elements |
| `onStart` | `() => void` | - | Callback when tour starts |
| `onComplete` | `() => void` | - | Callback when tour completes |
| `onSkip` | `() => void` | - | Callback when tour is skipped |
| `onStepChange` | `(step, direction) => void` | - | Callback on step change |

#### TourStep

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | required | Unique step identifier |
| `target` | `string \| () => HTMLElement` | required | CSS selector or function |
| `title` | `string` | - | Step title |
| `content` | `string` | required | Step description |
| `placement` | `PopoverPlacement` | `'bottom'` | Popover position |
| `highlight` | `boolean` | `true` | Highlight target element |
| `allowInteraction` | `boolean` | `false` | Allow clicking target |
| `autoAdvance` | `number` | - | Auto-advance after ms |
| `onBeforeShow` | `() => void \| Promise` | - | Before showing step |
| `onAfterShow` | `() => void` | - | After showing step |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `state` | `TourState` | Reactive tour state |
| `isActive` | `boolean` | Whether tour is running |
| `start(stepIndex?)` | `() => void` | Start the tour |
| `stop()` | `() => void` | Stop the tour |
| `next()` | `() => void` | Go to next step |
| `previous()` | `() => void` | Go to previous step |
| `goTo(indexOrId)` | `() => void` | Go to specific step |
| `skip()` | `() => void` | Skip/cancel the tour |
| `pause()` | `() => void` | Pause the tour |
| `resume()` | `() => void` | Resume paused tour |
| `complete()` | `() => void` | Complete the tour |

### Adapters

#### Headless Adapter

For full control over rendering:

```ts
import { SherpaHeadless } from 'vue-sherpa/headless'
```

```vue
<SherpaHeadless :state="state" :controls="controls" :options="options">
  <template #default="{ state, controls, close }">
    <!-- Your custom UI -->
  </template>
</SherpaHeadless>
```

#### PrimeVue Adapter

Pre-built UI using PrimeVue components:

```ts
import { SherpaPrimeVue } from 'vue-sherpa/primevue'
```

```vue
<SherpaPrimeVue
  :state="state"
  :controls="controls"
  :options="options"
  :show-overlay="true"
  popover-class="my-custom-class"
/>
```

## Styling

### CSS Variables

The PrimeVue adapter respects PrimeVue's CSS variables:

```css
:root {
  --p-primary-color: #3b82f6;
}
```

### Custom Styling

For headless usage, you have full control over styles. Example:

```css
.tour-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
}

.tour-popover {
  position: absolute;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
}
```

## TypeScript

All types are exported for TypeScript users:

```ts
import type {
  TourStep,
  TourOptions,
  TourState,
  TourControls,
  PopoverPlacement,
} from 'vue-sherpa'
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## License

[MIT](./LICENSE)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## Credits

### Overlay Implementation

The spotlight overlay effect uses an **SVG path with even-odd fill rule**, inspired by [Driver.js](https://driverjs.com/). This technique creates a transparent cutout around highlighted elements without z-index manipulation, providing robust behavior across complex UI layouts.

## A Note on the Name

The term "sherpa" refers to the [Sherpa people](https://en.wikipedia.org/wiki/Sherpa_people), an ethnic group native to the Himalayas. While the name is intended to evoke the concept of an expert guide, we acknowledge that using ethnic group names for software can be perceived as cultural appropriation.

**If you are a member of the Sherpa community and feel this naming is inappropriate, please reach out.** We are committed to respectful naming practices and will consider renaming the library if concerns are raised by those directly affected.
