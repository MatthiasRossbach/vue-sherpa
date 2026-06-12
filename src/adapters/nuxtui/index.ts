/**
 * Nuxt UI adapter for vue-sherpa
 *
 * A ready-to-use tour overlay styled with Nuxt UI's design tokens. It renders
 * the SVG spotlight plus a popover whose colors, radius and typography come
 * entirely from Nuxt UI's CSS variables (`--ui-primary`, `--ui-bg`,
 * `--ui-text-*`, `--ui-border`, `--ui-radius`, …). That means the tour
 * automatically follows the consuming app's Nuxt UI theme (primary color,
 * radius, light/dark mode) with no extra wiring — see the README "Nuxt UI
 * theming" section.
 *
 * There is no hard dependency on `@nuxt/ui`; the adapter only references the
 * CSS variables that Nuxt UI defines, exactly as the PrimeVue adapter does.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTour } from 'vue-sherpa'
 * import { SherpaNuxtUI } from 'vue-sherpa/nuxtui'
 *
 * const { state, controls, options, start } = useTour({ steps: [...] })
 * </script>
 *
 * <template>
 *   <SherpaNuxtUI :state="state" :controls="controls" :options="options" />
 *   <UButton @click="start">Start tour</UButton>
 * </template>
 * ```
 */

import {
  h,
  defineComponent,
  type PropType,
  Teleport,
  watch,
  ref,
  onMounted,
  onUnmounted,
} from 'vue'
import type { TourState, TourControls, TourOptions } from '../../core/types'
import { useOverlay } from '../../composables/useOverlay'

/** Button/counter labels — pass translated strings here for i18n. */
export interface SherpaNuxtUILabels {
  skip?: string
  previous?: string
  next?: string
  finish?: string
}

/** `data-testid` values for each rendered part. */
export interface SherpaNuxtUITestIds {
  overlay?: string
  popover?: string
  stepCount?: string
  skip?: string
  previous?: string
  next?: string
}

const DEFAULT_LABELS: Required<SherpaNuxtUILabels> = {
  skip: 'Skip',
  previous: 'Back',
  next: 'Next',
  finish: 'Finish',
}

export const SherpaNuxtUI = defineComponent({
  name: 'SherpaNuxtUI',
  props: {
    state: { type: Object as PropType<TourState>, required: true },
    controls: { type: Object as PropType<TourControls>, required: true },
    options: { type: Object as PropType<TourOptions>, default: () => ({}) },
    /** Teleport target for the overlay. */
    teleportTo: { type: String, default: 'body' },
    /** Render the dimmed SVG spotlight backdrop. */
    showOverlay: { type: Boolean, default: true },
    /** Extra class on the popover (e.g. to widen it or tweak spacing). */
    popoverClass: { type: String, default: '' },
    /**
     * Button labels. Provide translated strings for i18n; omitted keys fall
     * back to English defaults.
     */
    labels: {
      type: Object as PropType<SherpaNuxtUILabels>,
      default: () => ({}),
    },
    /**
     * Step-counter formatter. Defaults to `"{current} / {total}"`. Override for
     * i18n, e.g. `(c, t) => t('tour.step', { current: c, total: t })`.
     */
    stepLabel: {
      type: Function as PropType<(current: number, total: number) => string>,
      default: (current: number, total: number) => `${current} / ${total}`,
    },
    /**
     * Optional `data-testid` values applied to each part, so a consuming app can
     * keep its existing E2E hooks. Omitted parts get no attribute.
     */
    testIds: {
      type: Object as PropType<SherpaNuxtUITestIds>,
      default: () => ({}),
    },
  },
  setup(props) {
    const overlay = useOverlay()

    watch(
      () => props.state.targetRect,
      (rect) => {
        if (props.showOverlay && rect && props.state.status === 'active') {
          overlay.show(rect, {
            padding: props.options.highlightPadding ?? 8,
            radius: 6,
            opacity: props.options.overlayOpacity ?? 0.5,
          })
        } else {
          overlay.hide()
        }
      },
      { immediate: true }
    )

    watch(
      () => props.state.status,
      (status) => {
        if (status !== 'active') overlay.hide()
      }
    )

    // Animate the cutout when MOVING BETWEEN STEPS, but never while the page
    // scrolls/resizes — a transition there makes the highlight visibly lag
    // behind the element. `navigating` is set synchronously on step change so
    // the scroll events fired by our own scrollIntoView don't disable it.
    const animateCutout = ref(true)
    let navigating = false
    let reflowTimer: ReturnType<typeof setTimeout> | null = null
    let navTimer: ReturnType<typeof setTimeout> | null = null

    function onReflow() {
      if (navigating) return
      animateCutout.value = false
      if (reflowTimer) clearTimeout(reflowTimer)
      reflowTimer = setTimeout(() => {
        animateCutout.value = true
      }, 150)
    }

    watch(
      () => props.state.currentStepIndex,
      () => {
        navigating = true
        animateCutout.value = true
        if (navTimer) clearTimeout(navTimer)
        navTimer = setTimeout(() => {
          navigating = false
        }, 400)
      },
      { flush: 'sync' }
    )

    onMounted(() => {
      window.addEventListener('scroll', onReflow, true)
      window.addEventListener('resize', onReflow)
    })
    onUnmounted(() => {
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
      if (reflowTimer) clearTimeout(reflowTimer)
      if (navTimer) clearTimeout(navTimer)
    })

    const labels = () => ({ ...DEFAULT_LABELS, ...props.labels })

    // Popover position from the target rect + step placement (top vs bottom).
    function popoverStyle(): Record<string, string> {
      const rect = props.state.targetRect
      if (!rect) {
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      }
      const placement = props.state.currentStep?.placement ?? 'bottom'
      const margin = 12
      const viewportW = window.innerWidth
      // Effective popover width mirrors the render style below: 360px capped
      // at 100vw - 2rem (32px).
      const popoverWidth = Math.min(360, viewportW - 32)

      // Horizontal anchor. Default aligns the popover's left edge to the
      // target's left. A `-end` placement (or a target sitting past the
      // viewport midpoint, e.g. a header pill on mobile) anchors the right
      // edges instead, so the popover opens leftward and stays on screen.
      // `-start` forces left-anchoring. This honours the `-start`/`-end`
      // placement suffixes that were previously defined but ignored.
      const targetRight = rect.left + rect.width
      let anchorEnd = targetRight - rect.width / 2 > viewportW / 2
      if (placement.endsWith('-start')) anchorEnd = false
      if (placement.endsWith('-end')) anchorEnd = true

      const rawLeft = anchorEnd ? targetRight - popoverWidth : rect.left
      // Final clamp guarantees no overflow regardless of the chosen anchor.
      const maxLeft = viewportW - popoverWidth - margin
      const left = `${Math.max(margin, Math.min(rawLeft, maxLeft))}px`
      if (placement.startsWith('top')) {
        return { bottom: `${window.innerHeight - rect.top + margin}px`, left }
      }
      return { top: `${rect.bottom + margin}px`, left }
    }

    const btnBase: Record<string, string> = {
      font: 'inherit',
      fontSize: '14px',
      fontWeight: '600',
      lineHeight: '1',
      padding: '8px 14px',
      borderRadius: 'calc(var(--ui-radius) * 1.5)',
      cursor: 'pointer',
      border: '1px solid transparent',
    }

    return () => {
      if (props.state.status !== 'active') return null
      const step = props.state.currentStep
      if (!step) return null
      const l = labels()

      return h(
        Teleport,
        { to: props.teleportTo },
        h(
          'div',
          {
            class: 'sherpa-nuxtui-overlay',
            'data-testid': props.testIds.overlay,
            style: {
              position: 'fixed',
              inset: 0,
              zIndex: String(props.options.zIndex ?? 9999),
              pointerEvents: 'none',
            },
          },
          [
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
                      // Morph between steps; track scroll instantly (no lag).
                      transition: animateCutout.value ? 'd 0.3s ease-out' : 'none',
                    },
                  }),
                ]
              ),
            h(
              'div',
              {
                class: ['sherpa-popover', props.popoverClass],
                'data-testid': props.testIds.popover,
                role: 'dialog',
                'aria-label': step.title ?? step.content,
                style: {
                  position: 'absolute',
                  ...popoverStyle(),
                  width: '360px',
                  maxWidth: 'calc(100vw - 2rem)',
                  background: 'var(--ui-bg)',
                  color: 'var(--ui-text)',
                  border: '1px solid var(--ui-border)',
                  borderRadius: 'calc(var(--ui-radius) * 2)',
                  padding: '16px',
                  boxShadow: '0 10px 38px -10px rgba(0,0,0,0.35)',
                  pointerEvents: 'auto',
                },
              },
              [
                h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'start',
                      justifyContent: 'space-between',
                      gap: '12px',
                    },
                  },
                  [
                    step.title &&
                      h(
                        'h3',
                        {
                          style: {
                            margin: '0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--ui-text-highlighted)',
                          },
                        },
                        step.title
                      ),
                    props.options.showStepCount &&
                      h(
                        'span',
                        {
                          class: 'sherpa-step-count',
                          'data-testid': props.testIds.stepCount,
                          style: {
                            flexShrink: '0',
                            fontSize: '12px',
                            color: 'var(--ui-text-muted)',
                          },
                        },
                        props.stepLabel(
                          props.state.currentStepIndex + 1,
                          props.state.totalSteps
                        )
                      ),
                  ]
                ),
                h(
                  'p',
                  {
                    style: {
                      margin: '8px 0 0',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'var(--ui-text-muted)',
                    },
                  },
                  step.content
                ),
                props.options.showProgress &&
                  h(
                    'div',
                    {
                      style: {
                        height: '4px',
                        background: 'var(--ui-bg-elevated)',
                        borderRadius: '9999px',
                        margin: '14px 0 0',
                        overflow: 'hidden',
                      },
                    },
                    [
                      h('div', {
                        style: {
                          width: `${props.state.progress}%`,
                          height: '100%',
                          background: 'var(--ui-primary)',
                          transition: 'width 0.3s ease',
                        },
                      }),
                    ]
                  ),
                h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      marginTop: '16px',
                    },
                  },
                  [
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-testid': props.testIds.skip,
                        onClick: () => props.controls.skip(),
                        style: {
                          ...btnBase,
                          background: 'transparent',
                          color: 'var(--ui-text-muted)',
                        },
                      },
                      l.skip
                    ),
                    h('div', { style: { display: 'flex', gap: '8px' } }, [
                      !props.state.isFirstStep &&
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-testid': props.testIds.previous,
                            onClick: () => props.controls.previous(),
                            style: {
                              ...btnBase,
                              background: 'var(--ui-bg)',
                              color: 'var(--ui-text)',
                              borderColor: 'var(--ui-border-accented)',
                            },
                          },
                          l.previous
                        ),
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-testid': props.testIds.next,
                          onClick: () => props.controls.next(),
                          style: {
                            ...btnBase,
                            background: 'var(--ui-primary)',
                            color: 'var(--ui-text-inverted)',
                          },
                        },
                        props.state.isLastStep ? l.finish : l.next
                      ),
                    ]),
                  ]
                ),
              ]
            ),
          ]
        )
      )
    }
  },
})

export default SherpaNuxtUI
