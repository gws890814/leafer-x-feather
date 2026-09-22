import type { IFilter } from '@leafer-ui/interface'

export const FEATHER_FILTER_TYPE = 'feather'
export const LEGACY_FEATHER_FILTER_TYPE = 'leafer-x-feather'
export const MAX_FEATHER_RADIUS = 250

export type FeatherRadiusInput = number | readonly number[]

/** Radius is expressed in Leafer document units and never mutates source geometry. */
export interface IFeatherFilter extends IFilter {
  type: typeof FEATHER_FILTER_TYPE
  radius: number | number[]
}

export function normalizeFeatherRadius(value: unknown) {
  const radius = Number(value)
  return Number.isFinite(radius) ? Math.max(0, Math.min(MAX_FEATHER_RADIUS, radius)) : 0
}

export function featherRadii(radius: FeatherRadiusInput): number[] {
  return (Array.isArray(radius) ? radius : [radius]).map(normalizeFeatherRadius).filter(value => value > 0)
}

export function createFeatherFilter(radius: FeatherRadiusInput): IFeatherFilter {
  return { type: FEATHER_FILTER_TYPE, radius: Array.isArray(radius)
    ? radius.map(normalizeFeatherRadius) : normalizeFeatherRadius(radius) }
}

export function isFeatherFilter(value: unknown): value is IFeatherFilter {
  if (!value || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  return type === FEATHER_FILTER_TYPE || type === LEGACY_FEATHER_FILTER_TYPE
}
