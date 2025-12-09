import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { SherpaHeadless } from './index'
import type { TourState, TourControls, TourOptions } from '../../core/types'

describe('SherpaHeadless', () => {
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
      { id: 'step1', target: '#test', content: 'Step 1 content' },
    ],
    ...overrides,
  })

  describe('rendering', () => {
    it('should not render when status is idle', () => {
      const wrapper = mount(SherpaHeadless, {
        props: {
          state: createMockState({ status: 'idle' }),
          controls: createMockControls(),
          options: createMockOptions(),
        },
        slots: {
          default: '<div class="tour-content">Tour content</div>',
        },
      })

      expect(wrapper.find('.tour-content').exists()).toBe(false)
    })

    it('should render slot content when status is active', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
      })

      const wrapper = mount(SherpaHeadless, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        slots: {
          default: '<div class="tour-content">Tour content</div>',
        },
        attachTo: document.body,
      })

      await nextTick()
      expect(document.querySelector('.tour-content')).toBeTruthy()

      wrapper.unmount()
    })
  })

  describe('slot props', () => {
    it('should pass state to slot', async () => {
      const state = createMockState({
        status: 'active',
        currentStepIndex: 0,
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
        progress: 50,
      })

      let receivedProps: any = null

      const wrapper = mount(SherpaHeadless, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        slots: {
          default: (props: any) => {
            receivedProps = props
            return null
          },
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(receivedProps.state).toEqual(state)
      expect(receivedProps.state.progress).toBe(50)

      wrapper.unmount()
    })

    it('should pass controls to slot', async () => {
      const controls = createMockControls()
      const state = createMockState({
        status: 'active',
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
      })

      let receivedProps: any = null

      const wrapper = mount(SherpaHeadless, {
        props: {
          state,
          controls,
          options: createMockOptions(),
        },
        slots: {
          default: (props: any) => {
            receivedProps = props
            return null
          },
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(receivedProps.controls).toEqual(controls)

      wrapper.unmount()
    })

    it('should pass close function that calls skip', async () => {
      const controls = createMockControls()
      const state = createMockState({
        status: 'active',
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
      })

      let receivedProps: any = null

      const wrapper = mount(SherpaHeadless, {
        props: {
          state,
          controls,
          options: createMockOptions(),
        },
        slots: {
          default: (props: any) => {
            receivedProps = props
            return null
          },
        },
        attachTo: document.body,
      })

      await nextTick()

      receivedProps.close()
      expect(controls.skip).toHaveBeenCalledOnce()

      wrapper.unmount()
    })
  })

  describe('teleport', () => {
    it('should teleport to body by default', async () => {
      const state = createMockState({
        status: 'active',
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
      })

      const wrapper = mount(SherpaHeadless, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
        },
        slots: {
          default: '<div data-testid="teleported">Content</div>',
        },
        attachTo: document.body,
      })

      await nextTick()

      // Content should be teleported to body
      expect(document.body.querySelector('[data-testid="teleported"]')).toBeTruthy()

      wrapper.unmount()
    })

    it('should teleport to custom target', async () => {
      const teleportTarget = document.createElement('div')
      teleportTarget.id = 'custom-target'
      document.body.appendChild(teleportTarget)

      const state = createMockState({
        status: 'active',
        currentStep: { id: 'step1', target: '#test', content: 'Step 1' },
      })

      const wrapper = mount(SherpaHeadless, {
        props: {
          state,
          controls: createMockControls(),
          options: createMockOptions(),
          teleportTo: '#custom-target',
        },
        slots: {
          default: '<div data-testid="teleported">Content</div>',
        },
        attachTo: document.body,
      })

      await nextTick()

      expect(teleportTarget.querySelector('[data-testid="teleported"]')).toBeTruthy()

      wrapper.unmount()
      teleportTarget.remove()
    })
  })
})
