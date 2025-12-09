import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useTour } from './useTour'
import type { TourStep } from '../core/types'

// Helper to create a test component that uses useTour
function createTestComponent(steps: TourStep[], options = {}) {
  return defineComponent({
    setup() {
      const tour = useTour({ steps, ...options })
      return { tour }
    },
    render() {
      return h('div')
    },
  })
}

describe('useTour', () => {
  let targetElement: HTMLElement

  beforeEach(() => {
    // Create a target element in the DOM
    targetElement = document.createElement('div')
    targetElement.id = 'test-target'
    document.body.appendChild(targetElement)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with idle status', () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
        ])
      )

      expect(wrapper.vm.tour.state.status).toBe('idle')
      expect(wrapper.vm.tour.state.currentStepIndex).toBe(-1)
      expect(wrapper.vm.tour.state.currentStep).toBeNull()
    })

    it('should calculate totalSteps correctly', () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
          { id: 'step3', target: '#test-target', content: 'Step 3' },
        ])
      )

      expect(wrapper.vm.tour.state.totalSteps).toBe(3)
    })
  })

  describe('start()', () => {
    it('should start the tour and set first step', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      expect(wrapper.vm.tour.state.status).toBe('active')
      expect(wrapper.vm.tour.state.currentStepIndex).toBe(0)
      expect(wrapper.vm.tour.state.currentStep?.id).toBe('step1')
      expect(wrapper.vm.tour.state.isFirstStep).toBe(true)
      expect(wrapper.vm.tour.state.isLastStep).toBe(false)
    })

    it('should start at a specific step index', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
        ])
      )

      wrapper.vm.tour.start(1)
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(1)
      expect(wrapper.vm.tour.state.currentStep?.id).toBe('step2')
    })

    it('should call onStart callback', async () => {
      const onStart = vi.fn()
      const wrapper = mount(
        createTestComponent(
          [{ id: 'step1', target: '#test-target', content: 'Step 1' }],
          { onStart }
        )
      )

      wrapper.vm.tour.start()
      await nextTick()

      expect(onStart).toHaveBeenCalledOnce()
    })

    it('should not start if no steps provided', async () => {
      const wrapper = mount(createTestComponent([]))

      wrapper.vm.tour.start()
      await nextTick()

      expect(wrapper.vm.tour.state.status).toBe('idle')
    })
  })

  describe('next()', () => {
    it('should advance to next step', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.next()
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(1)
      expect(wrapper.vm.tour.state.currentStep?.id).toBe('step2')
      expect(wrapper.vm.tour.state.isLastStep).toBe(true)
    })

    it('should complete tour when called on last step', async () => {
      const onComplete = vi.fn()
      const wrapper = mount(
        createTestComponent(
          [{ id: 'step1', target: '#test-target', content: 'Step 1' }],
          { onComplete }
        )
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.next()
      await nextTick()

      expect(wrapper.vm.tour.state.status).toBe('completed')
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('should call onStepChange callback', async () => {
      const onStepChange = vi.fn()
      const wrapper = mount(
        createTestComponent(
          [
            { id: 'step1', target: '#test-target', content: 'Step 1' },
            { id: 'step2', target: '#test-target', content: 'Step 2' },
          ],
          { onStepChange }
        )
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.next()
      await nextTick()

      expect(onStepChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step2' }),
        'next'
      )
    })
  })

  describe('previous()', () => {
    it('should go back to previous step', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
        ])
      )

      wrapper.vm.tour.start(1)
      await nextTick()

      wrapper.vm.tour.previous()
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(0)
      expect(wrapper.vm.tour.state.currentStep?.id).toBe('step1')
    })

    it('should not go back on first step', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.previous()
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(0)
      expect(wrapper.vm.tour.state.isFirstStep).toBe(true)
    })
  })

  describe('goTo()', () => {
    it('should go to step by index', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
          { id: 'step3', target: '#test-target', content: 'Step 3' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.goTo(2)
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(2)
      expect(wrapper.vm.tour.state.currentStep?.id).toBe('step3')
    })

    it('should go to step by id', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
          { id: 'step3', target: '#test-target', content: 'Step 3' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.goTo('step3')
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(2)
      expect(wrapper.vm.tour.state.currentStep?.id).toBe('step3')
    })

    it('should not navigate if step id not found', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.goTo('nonexistent')
      await nextTick()

      expect(wrapper.vm.tour.state.currentStepIndex).toBe(0)
    })
  })

  describe('skip()', () => {
    it('should skip the tour and reset state', async () => {
      const onSkip = vi.fn()
      const wrapper = mount(
        createTestComponent(
          [{ id: 'step1', target: '#test-target', content: 'Step 1' }],
          { onSkip }
        )
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.skip()
      await nextTick()

      expect(wrapper.vm.tour.state.status).toBe('idle')
      expect(wrapper.vm.tour.state.currentStepIndex).toBe(-1)
      expect(onSkip).toHaveBeenCalledOnce()
    })
  })

  describe('pause() and resume()', () => {
    it('should pause and resume the tour', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.pause()
      await nextTick()
      expect(wrapper.vm.tour.state.status).toBe('paused')

      wrapper.vm.tour.resume()
      await nextTick()
      expect(wrapper.vm.tour.state.status).toBe('active')
    })
  })

  describe('stop()', () => {
    it('should stop the tour and reset state', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.stop()
      await nextTick()

      expect(wrapper.vm.tour.state.status).toBe('idle')
      expect(wrapper.vm.tour.state.currentStepIndex).toBe(-1)
    })
  })

  describe('progress calculation', () => {
    it('should calculate progress percentage correctly', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
          { id: 'step3', target: '#test-target', content: 'Step 3' },
          { id: 'step4', target: '#test-target', content: 'Step 4' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()
      expect(wrapper.vm.tour.state.progress).toBe(25) // 1/4 = 25%

      wrapper.vm.tour.next()
      await nextTick()
      expect(wrapper.vm.tour.state.progress).toBe(50) // 2/4 = 50%

      wrapper.vm.tour.next()
      await nextTick()
      expect(wrapper.vm.tour.state.progress).toBe(75) // 3/4 = 75%

      wrapper.vm.tour.next()
      await nextTick()
      expect(wrapper.vm.tour.state.progress).toBe(100) // 4/4 = 100%
    })
  })

  describe('step callbacks', () => {
    it('should call onBeforeShow and onAfterShow callbacks', async () => {
      const onBeforeShow = vi.fn()
      const onAfterShow = vi.fn()

      const wrapper = mount(
        createTestComponent([
          {
            id: 'step1',
            target: '#test-target',
            content: 'Step 1',
            onBeforeShow,
            onAfterShow,
          },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      expect(onBeforeShow).toHaveBeenCalledOnce()
      expect(onAfterShow).toHaveBeenCalledOnce()
    })

    it('should call onBeforeHide and onAfterHide callbacks', async () => {
      const onBeforeHide = vi.fn()
      const onAfterHide = vi.fn()

      const wrapper = mount(
        createTestComponent([
          {
            id: 'step1',
            target: '#test-target',
            content: 'Step 1',
            onBeforeHide,
            onAfterHide,
          },
          { id: 'step2', target: '#test-target', content: 'Step 2' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      wrapper.vm.tour.next()
      await nextTick()

      expect(onBeforeHide).toHaveBeenCalledOnce()
      expect(onAfterHide).toHaveBeenCalledOnce()
    })
  })

  describe('target resolution', () => {
    it('should resolve target element by CSS selector', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#test-target', content: 'Step 1' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      expect(wrapper.vm.tour.state.targetElement).toBe(targetElement)
    })

    it('should resolve target element by function', async () => {
      const wrapper = mount(
        createTestComponent([
          {
            id: 'step1',
            target: () => document.getElementById('test-target'),
            content: 'Step 1',
          },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      expect(wrapper.vm.tour.state.targetElement).toBe(targetElement)
    })

    it('should handle missing target element', async () => {
      const wrapper = mount(
        createTestComponent([
          { id: 'step1', target: '#nonexistent', content: 'Step 1' },
        ])
      )

      wrapper.vm.tour.start()
      await nextTick()

      expect(wrapper.vm.tour.state.targetElement).toBeNull()
      expect(wrapper.vm.tour.state.targetRect).toBeNull()
    })
  })
})
