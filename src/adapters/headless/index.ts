/**
 * Headless adapter - provides render functions without any UI library dependency
 *
 * Use this adapter when you want full control over the UI or when using
 * a UI library that doesn't have a dedicated adapter.
 */

import { h, defineComponent, type PropType, Teleport } from 'vue'
import type { TourRenderProps, TourState, TourControls, TourOptions } from '../../core/types'

export interface HeadlessSlotProps extends TourRenderProps {
  /** Close/skip the tour */
  close: () => void
}

/**
 * Headless tour overlay component
 *
 * Renders nothing by default - use the default slot to provide your own UI.
 *
 * @example
 * ```vue
 * <SherpaHeadless :state="state" :controls="controls" :options="options">
 *   <template #default="{ state, controls, close }">
 *     <div v-if="state.status === 'active'" class="my-overlay">
 *       <div class="my-popover">
 *         <h3>{{ state.currentStep?.title }}</h3>
 *         <p>{{ state.currentStep?.content }}</p>
 *         <button @click="controls.next()">Next</button>
 *       </div>
 *     </div>
 *   </template>
 * </SherpaHeadless>
 * ```
 */
export const SherpaHeadless = defineComponent({
  name: 'SherpaHeadless',
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
      required: true,
    },
    /** Teleport target for the overlay */
    teleportTo: {
      type: String,
      default: 'body',
    },
  },
  setup(props, { slots }) {
    return () => {
      if (props.state.status !== 'active' || !slots.default) {
        return null
      }

      const slotProps: HeadlessSlotProps = {
        state: props.state,
        controls: props.controls,
        options: props.options,
        close: props.controls.skip,
      }

      return h(
        Teleport,
        { to: props.teleportTo },
        slots.default(slotProps)
      )
    }
  },
})

export default SherpaHeadless
