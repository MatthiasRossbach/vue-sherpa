import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import type {
  TourOptions,
  TourState,
  TourControls,
  TourStatus,
  UseTourReturn,
  TourStep,
} from '../core/types'

/**
 * Headless composable for managing tour state and navigation
 *
 * @example
 * ```ts
 * const { state, start, next, previous, skip } = useTour({
 *   steps: [
 *     { id: 'welcome', target: '#header', content: 'Welcome!' },
 *     { id: 'feature', target: '.feature-btn', content: 'Click here' },
 *   ]
 * })
 * ```
 */
export function useTour(options: TourOptions): UseTourReturn {
  const status = ref<TourStatus>('idle')
  const currentStepIndex = ref(-1)
  const targetElement = ref<HTMLElement | null>(null)
  const targetRect = ref<DOMRect | null>(null)

  // Merge defaults with provided options
  const opts = {
    showStepCount: true,
    showProgress: true,
    keyboardNavigation: true,
    closeOnClickOutside: false,
    closeOnEscape: true,
    scrollToTarget: true,
    scrollBehavior: 'instant' as ScrollBehavior, // Instant to avoid animation conflict with cutout transition
    highlightPadding: 8,
    overlayOpacity: 0.5,
    zIndex: 9999,
    ...options,
  }

  // Computed state
  const currentStep = computed<TourStep | null>(() =>
    currentStepIndex.value >= 0 && currentStepIndex.value < opts.steps.length
      ? opts.steps[currentStepIndex.value]
      : null
  )

  const totalSteps = computed(() => opts.steps.length)
  // First/last are skip-aware: a step counts as "last" when no showable step
  // follows it, so trailing optional steps with missing targets don't leave the
  // popover stuck on a non-final step. Resolution is consulted on the client
  // only; during SSR every step is treated as showable (see canResolve).
  const isFirstStep = computed(
    () =>
      currentStepIndex.value >= 0 &&
      findShowableIndex(currentStepIndex.value - 1, 'previous') === -1
  )
  const isLastStep = computed(
    () =>
      currentStepIndex.value >= 0 &&
      findShowableIndex(currentStepIndex.value + 1, 'next') === -1
  )
  const progress = computed(() =>
    totalSteps.value > 0 ? ((currentStepIndex.value + 1) / totalSteps.value) * 100 : 0
  )
  const isActive = computed(() => status.value === 'active')

  // Reactive state object
  const state = reactive<TourState>({
    status: status.value,
    currentStepIndex: currentStepIndex.value,
    currentStep: currentStep.value,
    totalSteps: totalSteps.value,
    isFirstStep: isFirstStep.value,
    isLastStep: isLastStep.value,
    progress: progress.value,
    targetElement: targetElement.value,
    targetRect: targetRect.value,
  })

  // Keep reactive state in sync
  watch(
    [status, currentStepIndex, currentStep, totalSteps, isFirstStep, isLastStep, progress, targetElement, targetRect],
    () => {
      state.status = status.value
      state.currentStepIndex = currentStepIndex.value
      state.currentStep = currentStep.value
      state.totalSteps = totalSteps.value
      state.isFirstStep = isFirstStep.value
      state.isLastStep = isLastStep.value
      state.progress = progress.value
      state.targetElement = targetElement.value
      state.targetRect = targetRect.value
    }
  )

  // Find target element for current step
  function resolveTarget(step: TourStep): HTMLElement | null {
    if (typeof step.target === 'function') {
      return step.target()
    }
    return document.querySelector(step.target)
  }

  // Whether a step may be skipped when its target can't be resolved.
  function isSkippable(step: TourStep): boolean {
    return step.optional === true || opts.skipMissingTargets === true
  }

  // Whether a step is currently showable. A non-skippable step is always
  // showable (the orphan-popover fallback is preserved for back-compat). A
  // skippable step is showable only if its target resolves. During SSR (no
  // window) every step is treated as showable — resolution happens on the
  // client once the tour actually runs.
  function isShowable(step: TourStep): boolean {
    if (!isSkippable(step)) return true
    if (typeof window === 'undefined') return true
    return resolveTarget(step) !== null
  }

  // Index of the nearest showable step at or beyond `from`, scanning in the
  // given direction. Returns -1 when no showable step exists that way.
  function findShowableIndex(from: number, direction: 'next' | 'previous'): number {
    const delta = direction === 'next' ? 1 : -1
    for (let i = from; i >= 0 && i < opts.steps.length; i += delta) {
      const step = opts.steps[i]
      if (step && isShowable(step)) return i
    }
    return -1
  }

  // Update target element and rect.
  //
  // `allowScrollIntoView` is only set when navigating to a step. On a passing
  // reflow (window scroll/resize) we just recompute the rect so the highlight
  // tracks the element — calling scrollIntoView there would fight the user's
  // scroll, snapping the page back to the target on every wheel tick.
  function updateTarget(allowScrollIntoView = false) {
    const step = currentStep.value
    if (!step) {
      targetElement.value = null
      targetRect.value = null
      return
    }

    const el = resolveTarget(step)
    targetElement.value = el

    if (el) {
      targetRect.value = el.getBoundingClientRect()

      if (allowScrollIntoView && opts.scrollToTarget) {
        el.scrollIntoView({
          behavior: opts.scrollBehavior,
          block: 'center',
          inline: 'center',
        })
        // Update rect after scroll
        requestAnimationFrame(() => {
          targetRect.value = el.getBoundingClientRect()
        })
      }
    } else {
      targetRect.value = null
    }
  }

  // Handle step change
  async function setStep(index: number, direction: 'next' | 'previous' = 'next') {
    const prevStep = currentStep.value
    const nextStep = opts.steps[index]

    if (!nextStep) return

    // Call before hide on previous step
    if (prevStep?.onBeforeHide) {
      await prevStep.onBeforeHide()
    }

    // Call before show on next step
    if (nextStep.onBeforeShow) {
      await nextStep.onBeforeShow()
    }

    currentStepIndex.value = index
    updateTarget(true)

    // Call after hide on previous step
    if (prevStep?.onAfterHide) {
      prevStep.onAfterHide()
    }

    // Call after show on next step
    if (nextStep.onAfterShow) {
      nextStep.onAfterShow()
    }

    // Notify step change
    opts.onStepChange?.(nextStep, direction)

    // Handle auto-advance (scheduled after controls is defined)
    if (nextStep.autoAdvance && nextStep.autoAdvance > 0) {
      setTimeout(() => {
        if (status.value === 'active' && currentStepIndex.value === index) {
          controls.next()
        }
      }, nextStep.autoAdvance)
    }
  }

  // Control methods
  const controls: TourControls = {
    start(stepIndex = 0) {
      if (opts.steps.length === 0) return

      // Land on the first showable step at or after the requested index, so a
      // tour never opens on a step whose target is missing (when skipping is on).
      const index = findShowableIndex(stepIndex, 'next')
      if (index === -1) return

      status.value = 'active'
      setStep(index)
      opts.onStart?.()
    },

    stop() {
      status.value = 'idle'
      currentStepIndex.value = -1
      targetElement.value = null
      targetRect.value = null
    },

    next() {
      if (status.value !== 'active') return

      const index = findShowableIndex(currentStepIndex.value + 1, 'next')
      if (index === -1) {
        controls.complete()
      } else {
        setStep(index, 'next')
      }
    },

    previous() {
      if (status.value !== 'active') return

      const index = findShowableIndex(currentStepIndex.value - 1, 'previous')
      if (index === -1) return
      setStep(index, 'previous')
    },

    goTo(stepIndexOrId) {
      if (status.value !== 'active') return

      let index: number
      if (typeof stepIndexOrId === 'string') {
        index = opts.steps.findIndex((s) => s.id === stepIndexOrId)
        if (index === -1) return
      } else {
        index = stepIndexOrId
      }

      if (index < 0 || index >= opts.steps.length) return
      // If the requested step isn't showable, advance past it in the direction
      // of travel to the nearest showable step.
      const direction = index > currentStepIndex.value ? 'next' : 'previous'
      const resolved = findShowableIndex(index, direction)
      if (resolved === -1) return
      setStep(resolved, direction)
    },

    skip() {
      status.value = 'idle'
      currentStepIndex.value = -1
      targetElement.value = null
      targetRect.value = null
      opts.onSkip?.()
    },

    pause() {
      if (status.value === 'active') {
        status.value = 'paused'
      }
    },

    resume() {
      if (status.value === 'paused') {
        status.value = 'active'
      }
    },

    complete() {
      status.value = 'completed'
      currentStepIndex.value = -1
      targetElement.value = null
      targetRect.value = null
      opts.onComplete?.()
    },
  }

  // Keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (!opts.keyboardNavigation || status.value !== 'active') return

    switch (e.key) {
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault()
        controls.next()
        break
      case 'ArrowLeft':
        e.preventDefault()
        controls.previous()
        break
      case 'Escape':
        if (opts.closeOnEscape) {
          e.preventDefault()
          controls.skip()
        }
        break
    }
  }

  // Click outside handler
  function handleClickOutside(e: MouseEvent) {
    if (!opts.closeOnClickOutside || status.value !== 'active') return

    const target = e.target as HTMLElement
    if (targetElement.value && !targetElement.value.contains(target)) {
      controls.skip()
    }
  }

  // Window resize handler
  function handleResize() {
    if (status.value === 'active') {
      updateTarget()
    }
  }

  // Setup event listeners
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('click', handleClickOutside)
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleResize, true)
  })

  return {
    state,
    controls,
    options: opts,
    isActive: isActive.value,
    ...controls,
  }
}
