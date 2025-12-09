/**
 * vue-sherpa - Headless tour/onboarding library for Vue 3
 *
 * @example
 * ```ts
 * import { useTour } from 'vue-sherpa'
 *
 * const { state, start, next, previous, skip } = useTour({
 *   steps: [
 *     { id: 'welcome', target: '#header', content: 'Welcome to the app!' },
 *     { id: 'sidebar', target: '.sidebar', content: 'Navigate here' },
 *   ]
 * })
 *
 * // Start the tour
 * start()
 * ```
 */

// Core composables
export { useTour } from './composables/useTour'
export { useOverlay } from './composables/useOverlay'
export type { OverlayOptions, UseOverlayReturn } from './composables/useOverlay'

// Types
export type {
  TourStep,
  TourStepAction,
  TourOptions,
  TourState,
  TourControls,
  TourStatus,
  TourRenderProps,
  UseTourReturn,
  PopoverPlacement,
  NavigationDirection,
} from './core/types'
