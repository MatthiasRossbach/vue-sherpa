import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { SherpaNuxtUI } from './index'
import type { TourState, TourControls, TourOptions } from '../../core/types'

describe('SherpaNuxtUI', () => {
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
    steps: [{ id: 'step1', target: '#test', content: 'Step 1 content', title: 'Step 1' }],
    showStepCount: true,
    showProgress: true,
    ...overrides,
  })

  const activeState = (overrides: Partial<TourState> = {}) =>
    createMockState({
      status: 'active',
      currentStepIndex: 0,
      currentStep: { id: 'step1', target: '#test', content: 'Step 1', title: 'Title' },
      totalSteps: 1,
      ...overrides,
    })

  it('does not render when idle', () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: createMockState({ status: 'idle' }),
        controls: createMockControls(),
        options: createMockOptions(),
      },
    })
    expect(wrapper.find('.sherpa-nuxtui-overlay').exists()).toBe(false)
  })

  it('renders title and content when active', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({
          currentStep: { id: 'step1', target: '#test', content: 'Body copy', title: 'Heading' },
        }),
        controls: createMockControls(),
        options: createMockOptions(),
      },
      attachTo: document.body,
    })
    await nextTick()
    const popover = document.querySelector('.sherpa-popover')
    expect(popover?.textContent).toContain('Heading')
    expect(popover?.textContent).toContain('Body copy')
    wrapper.unmount()
  })

  it('themes via Nuxt UI CSS variables (primary on the next button)', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ totalSteps: 2, isLastStep: false }),
        controls: createMockControls(),
        options: createMockOptions(),
      },
      attachTo: document.body,
    })
    await nextTick()
    const nextBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Next'
    ) as HTMLElement
    expect(nextBtn.style.background).toContain('--ui-primary')
    wrapper.unmount()
  })

  it('uses custom labels for i18n', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ totalSteps: 1, isFirstStep: true, isLastStep: true }),
        controls: createMockControls(),
        options: createMockOptions(),
        labels: { skip: 'Überspringen', finish: 'Fertig' },
      },
      attachTo: document.body,
    })
    await nextTick()
    const texts = Array.from(document.querySelectorAll('button')).map((b) => b.textContent)
    expect(texts).toContain('Überspringen')
    expect(texts).toContain('Fertig')
    wrapper.unmount()
  })

  it('formats the step counter via stepLabel', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ currentStepIndex: 1, totalSteps: 3 }),
        controls: createMockControls(),
        options: createMockOptions({ showStepCount: true }),
        stepLabel: (c: number, t: number) => `Schritt ${c} von ${t}`,
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.querySelector('.sherpa-step-count')?.textContent).toBe('Schritt 2 von 3')
    wrapper.unmount()
  })

  it('wires navigation + skip controls', async () => {
    const controls = createMockControls()
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ currentStepIndex: 1, totalSteps: 2, isFirstStep: false, isLastStep: true }),
        controls,
        options: createMockOptions(),
      },
      attachTo: document.body,
    })
    await nextTick()
    const byText = (t: string) =>
      Array.from(document.querySelectorAll('button')).find((b) => b.textContent === t)
    byText('Back')?.click()
    byText('Finish')?.click()
    byText('Skip')?.click()
    expect(controls.previous).toHaveBeenCalledOnce()
    expect(controls.next).toHaveBeenCalledOnce()
    expect(controls.skip).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('renders the SVG spotlight with an evenodd cutout', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ targetRect: { x: 100, y: 100, width: 200, height: 50 } as DOMRect }),
        controls: createMockControls(),
        options: createMockOptions(),
        showOverlay: true,
      },
      attachTo: document.body,
    })
    await nextTick()
    const path = document.querySelector('.sherpa-overlay-svg path')
    expect(path?.getAttribute('fill-rule')).toBe('evenodd')
    wrapper.unmount()
  })

  it('applies passthrough data-testids for E2E hooks', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ currentStepIndex: 0, totalSteps: 2, isFirstStep: true, isLastStep: false }),
        controls: createMockControls(),
        options: createMockOptions(),
        testIds: {
          overlay: 'sherpa-tour',
          popover: 'sherpa-popover',
          stepCount: 'sherpa-step-counter',
          skip: 'sherpa-skip',
          next: 'sherpa-next',
        },
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.querySelector('[data-testid="sherpa-tour"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="sherpa-popover"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="sherpa-step-counter"]')?.textContent).toBe('1 / 2')
    expect(document.querySelector('[data-testid="sherpa-skip"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="sherpa-next"]')).toBeTruthy()
    wrapper.unmount()
  })

  it('hides Back on the first step', async () => {
    const wrapper = mount(SherpaNuxtUI, {
      props: {
        state: activeState({ totalSteps: 2, isFirstStep: true, isLastStep: false }),
        controls: createMockControls(),
        options: createMockOptions(),
      },
      attachTo: document.body,
    })
    await nextTick()
    const back = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Back')
    expect(back).toBeFalsy()
    wrapper.unmount()
  })
})
