import '@leafer-in/filter'
import { Filter } from '@leafer-ui/core'
import type { IFilter } from '@leafer-ui/interface'
import { applyFeather, featherSpread } from './render.ts'
import {
  FEATHER_FILTER_TYPE,
  LEGACY_FEATHER_FILTER_TYPE,
  featherRadii,
  isFeatherFilter,
  type IFeatherFilter,
} from './types.ts'

const INSTALLED = Symbol.for('@cgon/leafer-x-feather.installed')

/** Register the native Leafer filter. Repeated calls are safe. */
export function installFeather() {
  const state = Filter as unknown as Record<symbol, boolean>
  if (state[INSTALLED]) return

  Filter.register(FEATHER_FILTER_TYPE, {
    apply(filter, ui, world, current, origin, shape) {
      const feather = filter as IFeatherFilter
      const filters = ui.__.filter || []
      const index = filters.indexOf(filter)
      let start = index
      let end = index + 1

      while (start > 0 && isFeatherFilter(filters[start - 1])) start--
      while (end < filters.length && isFeatherFilter(filters[end])) end++

      // Adjacent legacy filter objects are treated as one compact radius stack.
      if (index >= 0 && index < end - 1) return
      const radii = index < 0
        ? (filter.visible === false ? [] : featherRadii(feather.radius))
        : filters.slice(start, end)
          .filter(item => item.visible !== false)
          .flatMap(item => featherRadii((item as IFeatherFilter).radius))
      const preceding = start > 0 ? filters.slice(0, start) as IFilter[] : []
      applyFeather(current, ui, world, radii, preceding, origin, shape)
    },
    getSpread(filter) {
      const feather = filter as IFeatherFilter
      return filter.visible === false ? 0 : featherSpread(feather.radius)
    },
  })

  // Keep documents saved by versions before 0.1.7 renderable.
  Filter.register(LEGACY_FEATHER_FILTER_TYPE, Filter.list[FEATHER_FILTER_TYPE]!)
  state[INSTALLED] = true
}
