import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { SherpaPrimeVue } from './index'
import type { TourState, TourControls, TourOptions } from '../../core/types'

describe('SherpaPrimeVue', () => {
  const createMockState = (overrides: Partial<TourState> = {}): TourState =>
    reactive({
      status: 'idle',
      currentStepIndex: -1,
      currentStep: null,
      totalSteps: 0,
      isFirstStep: true,
      isLastStep: true,
      progress: 0,
      targetElement: null,
      targetRect: null,
      ...overrides,
    })

  const createMockControls = (): TourControls => ({
    start: vi.fn(),
    stop: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    goTo: vi.fn(),
    skip: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    complete: vi.fn(),
  })

  const createMockOptions = (overrides: Partial<TourOptions> = {}): TourOptions => ({
    steps: [
      { id: 'step1', target: '#test', content: 'Step 1 content', title: 'Step 1' },
    ],
    showStepCount: true,
    showProgress: true,
    ...overrides,
  })

  describe('rendering', () => {
    it('should not render when status is idle', () => {
      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state: createMockState({ status: 'idle' }),
          controls: createMockControls(),
          options: createMockOptions(),
        },
      })

      expect(wrapper.find('.sherpa-primevue-overlay').exists()).toBe(false)
    })

    it('should render overlay when status is active', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1', title: 'Title' },
        totalSteps: 1,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(document.querySelector('.sherpa-primevue-overlay')).toBeTruthy()

      wrapper.unmount()
    })

    it('should render step title and content', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: {
          id: 'step1',
          target: '#test',
          content: 'This is the step content',
          title: 'Step Title',
        },
        totalSteps: 1,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      const popover = document.querySelector('.sherpa-popover')
      expect(popover?.textContent).toContain('Step Title')
      expect(popover?.textContent).toContain('This is the step content')

      wrapper.unmount()
    })
  })

  describe('navigation buttons', () => {
    it('should call next() when Next button is clicked', async () => {
      const controls = createMockControls()
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        totalSteps: 2,
        isFirstStep: true,
        isLastStep: false,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls,
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      const nextButton = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Next'
      )
      nextButton?.click()

      expect(controls.next).toHaveBeenCalledOnce()

      wrapper.unmount()
    })

    it('should call previous() when Previous button is clicked', async () => {
      const controls = createMockControls()
      const state = createMockState({
        status: 'active',
        currentStepIndex: 1,
        currentStep: { id: 'step2', target: '#test', content: 'Step 2' },
        totalSteps: 2,
        isFirstStep: false,
        isLastStep: true,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls,
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      const prevButton = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Previous'
      )
      prevButton?.click()

      expect(controls.previous).toHaveBeenCalledOnce()

      wrapper.unmount()
    })

    it('should call skip() when Skip button is clicked', async () => {
      const controls = createMockControls()
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        totalSteps: 1,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls,
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      const skipButton = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Skip'
      )
      skipButton?.click()

      expect(controls.skip).toHaveBeenCalledOnce()

      wrapper.unmount()
    })

    it('should show Finish button on last step', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        totalSteps: 1,
        isFirstStep: true,
        isLastStep: true,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      const finishButton = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Finish'
      )
      expect(finishButton).toBeTruthy()

      wrapper.unmount()
    })

    it('should not show Previous button on first step', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        totalSteps: 2,
        isFirstStep: true,
        isLastStep: false,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        attachTo: document.body,
      })

      await nextTick()

      const prevButton = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Previous'
      )
      expect(prevButton).toBeFalsy()

      wrapper.unmount()
    })
  })

  describe('step counter', () => {
    it('should show step counter when enabled', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 1,
        currentStep: { id: 'step2', target: '#test', content: 'Step 2' },
        totalSteps: 3,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions({ showStepCount: true }),
        },
        attachTo: document.body,
      })

      await nextTick()

      const popover = document.querySelector('.sherpa-popover')
      expect(popover?.textContent).toContain('2 of 3')

      wrapper.unmount()
    })
  })

  describe('overlay', () => {
    it('should show SVG overlay when showOverlay is true and targetRect exists', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()

      const svgOverlay = document.querySelector('.sherpa-overlay-svg')
      expect(svgOverlay).toBeTruthy()

      // Should have a path element with fill-rule evenodd
      const path = svgOverlay?.querySelector('path')
      expect(path).toBeTruthy()
      expect(path?.getAttribute('fill-rule')).toBe('evenodd')

      wrapper.unmount()
    })

    it('should not show SVG overlay when showOverlay is false', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: false,
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(document.querySelector('.sherpa-overlay-svg')).toBeFalsy()

      wrapper.unmount()
    })

    it('should not show SVG overlay when targetRect is null', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: null,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(document.querySelector('.sherpa-overlay-svg')).toBeFalsy()

      wrapper.unmount()
    })

    it('should update overlay when targetRect changes', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()

      const initialPath = document.querySelector('.sherpa-overlay-svg path')?.getAttribute('d')

      // Update target rect
      state.targetRect = { x: 200, y: 200, width: 300, height: 100 } as DOMRect
      await nextTick()

      const updatedPath = document.querySelector('.sherpa-overlay-svg path')?.getAttribute('d')

      expect(updatedPath).not.toBe(initialPath)

      wrapper.unmount()
    })

    it('should hide overlay when tour status changes to idle', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()
      expect(document.querySelector('.sherpa-overlay-svg')).toBeTruthy()

      // Change status to idle
      state.status = 'idle'
      await nextTick()

      // Component should not render at all when idle
      expect(document.querySelector('.sherpa-primevue-overlay')).toBeFalsy()

      wrapper.unmount()
    })

    it('should apply correct opacity from options', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions({ overlayOpacity: 0.8 }),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()

      const path = document.querySelector('.sherpa-overlay-svg path')
      expect(path?.getAttribute('fill')).toContain('0.8')

      wrapper.unmount()
    })

    it('should have pointer-events: none on SVG for click-through', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()

      const svgOverlay = document.querySelector('.sherpa-overlay-svg') as HTMLElement
      expect(svgOverlay?.style.pointerEvents).toBe('none')

      wrapper.unmount()
    })

    it('should have pointer-events: auto on popover for interactivity', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect,
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          showOverlay: true,
        },
        attachTo: document.body,
      })

      await nextTick()

      const popover = document.querySelector('.sherpa-popover') as HTMLElement
      expect(popover?.style.pointerEvents).toBe('auto')

      wrapper.unmount()
    })
  })

  describe('custom class', () => {
    it('should apply custom popover class', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
      })

      const wrapper = mount(SherpaPrimeVue, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          popoverClass: 'my-custom-popover',
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(document.querySelector('.my-custom-popover')).toBeTruthy()

      wrapper.unmount()
    })
  })
})
