/**
 * PrimeVue adapter for vue-sherpa
 *
 * Provides ready-to-use components that integrate with PrimeVue's
 * Popover, Dialog, and styling system.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTour } from 'vue-sherpa'
 * import { SherpaPrimeVue } from 'vue-sherpa/primevue'
 *
 * const { state, controls, start } = useTour({
 *   steps: [...]
 * })
 * </script>
 *
 * <template>
 *   <SherpaPrimeVue :state="state" :controls="controls" />
 *   <Button @click="start">Start Tour</Button>
 * </template>
 * ```
 */

import { h, defineComponent, type PropType, Teleport, watch } from 'vue'
import type { TourState, TourControls, TourOptions } from '../../core/types'
import { useOverlay } from '../../composables/useOverlay'

/**
 * PrimeVue tour component
 *
 * Renders a tour overlay using PrimeVue components (Popover, Button, ProgressBar).
 * Requires PrimeVue to be installed and configured in your app.
 *
 * Note: This is a placeholder implementation. The actual implementation
 * will use PrimeVue's Popover component for positioning and styling.
 */
export const SherpaPrimeVue = defineComponent({
  name: 'SherpaPrimeVue',
  props: {
    state: {
      type: Object as PropType<TourState>,
      required: true,
    },
    controls: {
      type: Object as PropType<TourControls>,
      required: true,
    },
    options: {
      type: Object as PropType<TourOptions>,
      default: () => ({}),
    },
    /** Teleport target for the overlay */
    teleportTo: {
      type: String,
      default: 'body',
    },
    /** Show overlay backdrop */
    showOverlay: {
      type: Boolean,
      default: true,
    },
    /** Custom class for the popover */
    popoverClass: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    // Use overlay composable for SVG spotlight effect
    const overlay = useOverlay()

    // Update overlay when target rect changes
    watch(
      () => props.state.targetRect,
      (newRect) => {
        if (props.showOverlay && newRect && props.state.status === 'active') {
          overlay.show(newRect, {
            padding: props.options.highlightPadding ?? 8,
            radius: 4,
            opacity: props.options.overlayOpacity ?? 0.5,
          })
        } else {
          overlay.hide()
        }
      },
      { immediate: true }
    )

    // Hide overlay when tour stops
    watch(
      () => props.state.status,
      (status) => {
        if (status !== 'active') {
          overlay.hide()
        }
      }
    )

    return () => {
      if (props.state.status !== 'active') {
        return null
      }

      const step = props.state.currentStep
      if (!step) return null

      // Render with SVG overlay spotlight
      return h(
        Teleport,
        { to: props.teleportTo },
        h(
          'div',
          {
            class: 'sherpa-primevue-overlay',
            style: {
              position: 'fixed',
              inset: 0,
              zIndex: props.options.zIndex ?? 9999,
              pointerEvents: 'none',
            },
          },
          [
            // SVG Overlay with spotlight cutout (inspired by Driver.js)
            props.showOverlay &&
              overlay.isVisible.value &&
              h(
                'svg',
                {
                  class: 'sherpa-overlay-svg',
                  style: {
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  },
                  'aria-hidden': 'true',
                },
                [
                  h('path', {
                    d: overlay.path.value,
                    fill: `rgba(0, 0, 0, ${props.options.overlayOpacity ?? 0.5})`,
                    'fill-rule': 'evenodd',
                    style: {
                      transition: 'all 0.3s ease-out',
                    },
                  }),
                ]
              ),
            // Popover content (placeholder)
            h(
              'div',
              {
                class: ['sherpa-popover', props.popoverClass],
                style: {
                  position: 'absolute',
                  top: props.state.targetRect
                    ? `${props.state.targetRect.bottom + 12}px`
                    : '50%',
                  left: props.state.targetRect
                    ? `${props.state.targetRect.left}px`
                    : '50%',
                  transform: props.state.targetRect ? 'none' : 'translate(-50%, -50%)',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  maxWidth: '400px',
                  pointerEvents: 'auto', // Enable interaction with popover
                },
              },
              [
                // Title
                step.title && h('h3', { style: { margin: '0 0 8px' } }, step.title),
                // Content
                h('p', { style: { margin: '0 0 16px', color: '#666' } }, step.content),
                // Progress
                props.options.showProgress &&
                  h('div', {
                    style: {
                      height: '4px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '2px',
                      marginBottom: '16px',
                    },
                  }, [
                    h('div', {
                      style: {
                        width: `${props.state.progress}%`,
                        height: '100%',
                        backgroundColor: 'var(--p-primary-color, #3b82f6)',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                      },
                    }),
                  ]),
                // Navigation
                h(
                  'div',
                  { style: { display: 'flex', gap: '8px', justifyContent: 'space-between' } },
                  [
                    // Skip button
                    h(
                      'button',
                      {
                        onClick: props.controls.skip,
                        style: {
                          padding: '8px 16px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#666',
                        },
                      },
                      'Skip'
                    ),
                    h('div', { style: { display: 'flex', gap: '8px' } }, [
                      // Previous button
                      !props.state.isFirstStep &&
                        h(
                          'button',
                          {
                            onClick: props.controls.previous,
                            style: {
                              padding: '8px 16px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              background: 'white',
                              cursor: 'pointer',
                            },
                          },
                          'Previous'
                        ),
                      // Next/Finish button
                      h(
                        'button',
                        {
                          onClick: props.controls.next,
                          style: {
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: 'var(--p-primary-color, #3b82f6)',
                            color: 'white',
                            cursor: 'pointer',
                          },
                        },
                        props.state.isLastStep ? 'Finish' : 'Next'
                      ),
                    ]),
                  ]
                ),
                // Step counter
                props.options.showStepCount &&
                  h(
                    'div',
                    {
                      style: {
                        textAlign: 'center',
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#999',
                      },
                    },
                    `${props.state.currentStepIndex + 1} of ${props.state.totalSteps}`
                  ),
              ]
            ),
          ]
        )
      )
    }
  },
})

export default SherpaPrimeVue
