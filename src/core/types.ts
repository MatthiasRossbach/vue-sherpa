/**
 * Core types for vue-sherpa tour library
 */

/** Position of the popover relative to the target element */
export type PopoverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

/** Current state of the tour */
export type TourStatus = 'idle' | 'active' | 'paused' | 'completed'

/** Direction of navigation */
export type NavigationDirection = 'next' | 'previous'

/**
 * Definition of a single tour step
 */
export interface TourStep {
  /** Unique identifier for the step */
  id: string
  /** CSS selector or ref to target element */
  target: string | (() => HTMLElement | null)
  /** Title displayed in the popover */
  title?: string
  /** Content/description for the step */
  content: string
  /** Popover placement relative to target */
  placement?: PopoverPlacement
  /** Custom CSS class for this step */
  class?: string
  /** Whether to highlight the target element */
  highlight?: boolean
  /** Custom action buttons for this step */
  actions?: TourStepAction[]
  /** Callback before showing this step */
  onBeforeShow?: () => void | Promise<void>
  /** Callback after showing this step */
  onAfterShow?: () => void
  /** Callback before hiding this step */
  onBeforeHide?: () => void | Promise<void>
  /** Callback after hiding this step */
  onAfterHide?: () => void
  /** Allow interaction with target element during this step */
  allowInteraction?: boolean
  /** Auto-advance after delay (ms) */
  autoAdvance?: number
}

/**
 * Custom action button for a step
 */
export interface TourStepAction {
  /** Button label */
  label: string
  /** Action to perform */
  action: 'next' | 'previous' | 'skip' | 'complete' | (() => void)
  /** Button variant/style hint */
  variant?: 'primary' | 'secondary' | 'text'
  /** Disabled state */
  disabled?: boolean
}

/**
 * Tour configuration options
 */
export interface TourOptions {
  /** Array of steps to display */
  steps: TourStep[]
  /** Show step counter (e.g., "1 of 5") */
  showStepCount?: boolean
  /** Show progress indicator */
  showProgress?: boolean
  /** Allow keyboard navigation (arrow keys, escape) */
  keyboardNavigation?: boolean
  /** Close tour when clicking outside */
  closeOnClickOutside?: boolean
  /** Close tour when pressing escape */
  closeOnEscape?: boolean
  /** Scroll target element into view */
  scrollToTarget?: boolean
  /** Scroll behavior */
  scrollBehavior?: ScrollBehavior
  /** Padding around highlighted element */
  highlightPadding?: number
  /** Overlay opacity (0-1) */
  overlayOpacity?: number
  /** Z-index for tour elements */
  zIndex?: number
  /** Callback when tour starts */
  onStart?: () => void
  /** Callback when tour completes */
  onComplete?: () => void
  /** Callback when tour is skipped */
  onSkip?: () => void
  /** Callback when step changes */
  onStepChange?: (step: TourStep, direction: NavigationDirection) => void
}

/**
 * Current state of the tour (reactive)
 */
export interface TourState {
  /** Current tour status */
  status: TourStatus
  /** Current step index */
  currentStepIndex: number
  /** Current step object */
  currentStep: TourStep | null
  /** Total number of steps */
  totalSteps: number
  /** Whether we're on the first step */
  isFirstStep: boolean
  /** Whether we're on the last step */
  isLastStep: boolean
  /** Progress percentage (0-100) */
  progress: number
  /** Target element for current step */
  targetElement: HTMLElement | null
  /** Bounding rect of target element */
  targetRect: DOMRect | null
}

/**
 * Tour control methods
 */
export interface TourControls {
  /** Start the tour */
  start: (stepIndex?: number) => void
  /** Stop/end the tour */
  stop: () => void
  /** Go to next step */
  next: () => void
  /** Go to previous step */
  previous: () => void
  /** Go to specific step by index or id */
  goTo: (stepIndexOrId: number | string) => void
  /** Skip/cancel the tour */
  skip: () => void
  /** Pause the tour */
  pause: () => void
  /** Resume a paused tour */
  resume: () => void
  /** Complete the tour */
  complete: () => void
}

/**
 * Return type of useTour composable
 */
export interface UseTourReturn extends TourControls {
  /** Reactive tour state */
  state: TourState
  /** Tour controls object (for passing to adapters) */
  controls: TourControls
  /** Merged tour options (for passing to adapters) */
  options: TourOptions
  /** Whether the tour is currently active */
  isActive: boolean
}

/**
 * Render props passed to adapter components
 */
export interface TourRenderProps {
  /** Current tour state */
  state: TourState
  /** Tour controls */
  controls: TourControls
  /** Tour options */
  options: TourOptions
}
