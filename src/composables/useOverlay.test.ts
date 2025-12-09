import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOverlay } from './useOverlay'

// Mock window dimensions
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

vi.stubGlobal('window', mockWindow)

describe('useOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should start with empty path and not visible', () => {
      const { path, isVisible } = useOverlay()

      expect(path.value).toBe('')
      expect(isVisible.value).toBe(false)
    })
  })

  describe('show()', () => {
    it('should generate path and set visible to true', () => {
      const { path, isVisible, show } = useOverlay()

      const rect = {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      } as DOMRect

      show(rect)

      expect(isVisible.value).toBe(true)
      expect(path.value).not.toBe('')
    })

    it('should include viewport dimensions in outer path', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect)

      // Outer path should contain viewport dimensions
      expect(path.value).toContain('M1024,0')
      expect(path.value).toContain('L0,768')
    })

    it('should apply padding to cutout', () => {
      const { path, show } = useOverlay()

      // With default padding of 8
      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect)

      // Cutout should start at x - padding = 92
      // With radius 4, the path starts at x + radius = 96
      expect(path.value).toContain('M96,92')
    })

    it('should respect custom padding option', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect, { padding: 16 })

      // Cutout should start at x - padding = 84
      // With default radius 4, the path starts at x + radius = 88
      expect(path.value).toContain('M88,84')
    })

    it('should generate rounded corners with radius option', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect, { radius: 8 })

      // Path should contain arc commands with radius 8
      expect(path.value).toContain('a8,8')
    })

    it('should generate rectangular cutout when radius is 0', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect, { radius: 0 })

      // Path should NOT contain arc commands
      expect(path.value).not.toContain('a0,0')
      // Should be simple h/v commands
      expect(path.value).toMatch(/M\d+,\d+ h\d+ v\d+ h-\d+ v-\d+ Z/)
    })

    it('should clamp radius to half of smallest dimension', () => {
      const { path, show } = useOverlay()

      // Small element with huge radius - should be clamped
      show({ x: 100, y: 100, width: 20, height: 10 } as DOMRect, {
        padding: 0,
        radius: 100, // Way too big
      })

      // Max radius should be min(20/2, 10/2) = 5
      expect(path.value).toContain('a5,5')
    })
  })

  describe('hide()', () => {
    it('should set visible to false', () => {
      const { isVisible, show, hide } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect)
      expect(isVisible.value).toBe(true)

      hide()
      expect(isVisible.value).toBe(false)
    })
  })

  describe('refresh()', () => {
    it('should update path when visible', () => {
      const { path, show, refresh } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect)
      const initialPath = path.value

      refresh({ x: 200, y: 200, width: 200, height: 50 } as DOMRect)

      expect(path.value).not.toBe(initialPath)
    })

    it('should not update path when not visible', () => {
      const { path, refresh } = useOverlay()

      refresh({ x: 200, y: 200, width: 200, height: 50 } as DOMRect)

      expect(path.value).toBe('')
    })
  })

  describe('getOptions()', () => {
    it('should return current options with defaults', () => {
      const { getOptions } = useOverlay()

      const options = getOptions()

      expect(options.padding).toBe(8)
      expect(options.radius).toBe(4)
      expect(options.opacity).toBe(0.75)
      expect(options.color).toBe('black')
      expect(options.animate).toBe(true)
      expect(options.animationDuration).toBe(300)
    })

    it('should return merged options after show()', () => {
      const { show, getOptions } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect, {
        padding: 16,
        radius: 8,
      })

      const options = getOptions()

      expect(options.padding).toBe(16)
      expect(options.radius).toBe(8)
      // Defaults preserved
      expect(options.opacity).toBe(0.75)
    })
  })

  describe('SVG path structure', () => {
    it('should have fill-rule compatible structure (outer + inner paths)', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect)

      // Should have two Z closures (outer and inner paths)
      const zCount = (path.value.match(/Z/g) || []).length
      expect(zCount).toBe(2)
    })

    it('should start with viewport coverage (outer path)', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 100, width: 200, height: 50 } as DOMRect)

      // First part should be the outer viewport rectangle
      expect(path.value).toMatch(/^M1024,0 L0,0 L0,768 L1024,768 L1024,0 Z/)
    })
  })

  describe('edge cases', () => {
    it('should handle element at viewport edge (left)', () => {
      const { path, show } = useOverlay()

      show({ x: 0, y: 100, width: 200, height: 50 } as DOMRect, { padding: 8 })

      // X should be clamped to 0, not negative
      expect(path.value).toMatch(/M\d+,\d+/) // Should still generate valid path
    })

    it('should handle element at viewport edge (top)', () => {
      const { path, show } = useOverlay()

      show({ x: 100, y: 0, width: 200, height: 50 } as DOMRect, { padding: 8 })

      // Y should be clamped to 0
      expect(path.value).toMatch(/M\d+,\d+/)
    })

    it('should handle element extending beyond viewport', () => {
      const { path, show } = useOverlay()

      show({ x: 900, y: 700, width: 200, height: 100 } as DOMRect, { padding: 8 })

      // Should still generate valid path (width/height clamped)
      expect(path.value).toMatch(/M\d+,\d+/)
    })
  })
})
