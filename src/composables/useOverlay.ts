import { ref, readonly, onMounted, onUnmounted } from 'vue'

/**
 * Configuration options for the overlay
 */
export interface OverlayOptions {
  /** Padding around the highlighted element (default: 8) */
  padding?: number
  /** Border radius for the cutout (default: 4) */
  radius?: number
  /** Overlay background opacity 0-1 (default: 0.75) */
  opacity?: number
  /** Overlay background color (default: 'black') */
  color?: string
  /** Whether to animate transitions (default: true) */
  animate?: boolean
  /** Animation duration in ms (default: 300) */
  animationDuration?: number
}

/**
 * Return type of useOverlay composable
 */
export interface UseOverlayReturn {
  /** SVG path string for the overlay with cutout */
  path: Readonly<ReturnType<typeof ref<string>>>
  /** Whether the overlay is currently visible */
  isVisible: Readonly<ReturnType<typeof ref<boolean>>>
  /** Show the overlay with a cutout around the target rect */
  show: (targetRect: DOMRect, options?: OverlayOptions) => void
  /** Hide the overlay */
  hide: () => void
  /** Update the cutout position (call on resize/scroll) */
  refresh: (targetRect: DOMRect, options?: OverlayOptions) => void
  /** Get current overlay options */
  getOptions: () => Required<OverlayOptions>
}

/**
 * Generate SVG path with viewport coverage and rounded rectangle cutout
 *
 * Uses the even-odd fill rule: draws outer viewport rectangle, then inner
 * cutout rectangle. The overlapping region becomes transparent.
 *
 * Inspired by Driver.js overlay implementation.
 * @see https://github.com/kamranahmedse/driver.js/blob/master/src/overlay.ts
 */
function generateOverlayPath(
  viewportWidth: number,
  viewportHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): string {
  // Clamp radius to prevent rendering glitches when cutout is small
  const maxRadius = Math.min(width / 2, height / 2)
  const r = Math.max(0, Math.min(radius, maxRadius))

  // Outer path: full viewport rectangle (clockwise)
  // This covers the entire viewport
  const outer = `M${viewportWidth},0 L0,0 L0,${viewportHeight} L${viewportWidth},${viewportHeight} L${viewportWidth},0 Z`

  // Inner path: rounded rectangle cutout (counter-clockwise)
  // Using SVG arc commands for rounded corners
  // Format: a rx,ry x-axis-rotation large-arc-flag sweep-flag dx,dy
  const inner =
    r > 0
      ? // With rounded corners
        `M${x + r},${y} ` +
        `h${width - 2 * r} ` + // top edge
        `a${r},${r} 0 0 1 ${r},${r} ` + // top-right corner
        `v${height - 2 * r} ` + // right edge
        `a${r},${r} 0 0 1 -${r},${r} ` + // bottom-right corner
        `h-${width - 2 * r} ` + // bottom edge
        `a${r},${r} 0 0 1 -${r},-${r} ` + // bottom-left corner
        `v-${height - 2 * r} ` + // left edge
        `a${r},${r} 0 0 1 ${r},-${r} ` + // top-left corner
        `Z`
      : // Without rounded corners (simple rectangle)
        `M${x},${y} ` +
        `h${width} ` +
        `v${height} ` +
        `h-${width} ` +
        `v-${height} ` +
        `Z`

  return `${outer} ${inner}`
}

/**
 * Headless composable for overlay with spotlight cutout
 *
 * Creates an SVG path that covers the viewport with a transparent
 * cutout around the target element. Uses SVG's even-odd fill rule
 * for the cutout effect.
 *
 * @example
 * ```ts
 * const { path, isVisible, show, hide } = useOverlay()
 *
 * // Show overlay with cutout around element
 * const rect = element.getBoundingClientRect()
 * show(rect, { padding: 8, radius: 4 })
 *
 * // In template:
 * // <svg v-if="isVisible" ...>
 * //   <path :d="path" fill="rgba(0,0,0,0.75)" fill-rule="evenodd" />
 * // </svg>
 * ```
 */
export function useOverlay(): UseOverlayReturn {
  const path = ref('')
  const isVisible = ref(false)

  // Current options (with defaults)
  let currentOptions: Required<OverlayOptions> = {
    padding: 8,
    radius: 4,
    opacity: 0.75,
    color: 'black',
    animate: true,
    animationDuration: 300,
  }

  // Store current target rect for resize handling
  let currentTargetRect: DOMRect | null = null

  /**
   * Calculate and update the SVG path
   */
  function calculatePath(targetRect: DOMRect | null, options: OverlayOptions = {}) {
    // Merge options
    currentOptions = { ...currentOptions, ...options }

    if (!targetRect) {
      path.value = ''
      return
    }

    currentTargetRect = targetRect

    const { padding, radius } = currentOptions
    const { innerWidth: viewportW, innerHeight: viewportH } = window

    // Calculate cutout bounds with padding
    // Clamp to viewport to prevent negative dimensions
    const x = Math.max(0, targetRect.x - padding)
    const y = Math.max(0, targetRect.y - padding)
    const width = Math.max(0, Math.min(targetRect.width + padding * 2, viewportW - x))
    const height = Math.max(0, Math.min(targetRect.height + padding * 2, viewportH - y))

    // Skip if element is completely outside viewport
    if (width <= 0 || height <= 0) {
      path.value = ''
      return
    }

    path.value = generateOverlayPath(viewportW, viewportH, x, y, width, height, radius)
  }

  /**
   * Show the overlay with cutout around target element
   */
  function show(targetRect: DOMRect, options?: OverlayOptions) {
    calculatePath(targetRect, options)
    isVisible.value = true
  }

  /**
   * Hide the overlay
   */
  function hide() {
    isVisible.value = false
    currentTargetRect = null
  }

  /**
   * Refresh the overlay position (call on resize/scroll)
   */
  function refresh(targetRect: DOMRect, options?: OverlayOptions) {
    if (isVisible.value) {
      calculatePath(targetRect, options)
    }
  }

  /**
   * Get current overlay options
   */
  function getOptions(): Required<OverlayOptions> {
    return { ...currentOptions }
  }

  // Handle window resize - update viewport dimensions in path
  function handleResize() {
    if (isVisible.value && currentTargetRect) {
      // Recalculate with current target rect
      // Note: The actual target rect should be refreshed by the parent (useTour)
      // as the element may have moved. This just updates viewport dimensions.
      calculatePath(currentTargetRect)
    }
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    path: readonly(path),
    isVisible: readonly(isVisible),
    show,
    hide,
    refresh,
    getOptions,
  }
}
