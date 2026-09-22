import test from 'node:test'
import assert from 'node:assert/strict'
import { Filter } from '@leafer-ui/core'
import {
  FEATHER_FILTER_TYPE,
  LEGACY_FEATHER_FILTER_TYPE,
  MAX_FEATHER_RADIUS,
  createFeatherFilter,
  installFeather,
  featherRadii,
  featherSpread,
  isFeatherFilter,
  normalizeFeatherRadius,
} from '../src/index.ts'

test('normalizes a reversible document-unit radius', () => {
  assert.equal(normalizeFeatherRadius(-1), 0)
  assert.equal(normalizeFeatherRadius(18.5), 18.5)
  assert.equal(normalizeFeatherRadius(Number.NaN), 0)
  assert.equal(normalizeFeatherRadius(999), MAX_FEATHER_RADIUS)
  assert.deepEqual(createFeatherFilter(12.5), { type: FEATHER_FILTER_TYPE, radius: 12.5 })
  assert.deepEqual(createFeatherFilter([12, -3, 999]), { type: FEATHER_FILTER_TYPE, radius: [12, 0, MAX_FEATHER_RADIUS] })
  assert.deepEqual(featherRadii([0, 4, 0, -1, 9]), [4, 9])
})

test('recognizes the current and legacy native filter formats', () => {
  assert.equal(isFeatherFilter(createFeatherFilter([24, 12, 6])), true)
  assert.equal(isFeatherFilter({ type: LEGACY_FEATHER_FILTER_TYPE, radius: 24 }), true)
  assert.equal(isFeatherFilter({ type: 'blur', blur: 24 }), false)
  assert.equal(isFeatherFilter(null), false)
})

test('reserves the Gaussian feather support on both sides of the contour', () => {
  assert.equal(featherSpread(0), 0)
  assert.equal(featherSpread(12), 36)
  assert.equal(featherSpread(12.5), 38)
  assert.equal(featherSpread([12, 30, 12]), 90)
  assert.equal(featherSpread([0, 4]), featherSpread([4, 0]))
  assert.equal(featherSpread([1, 4]), 12)
  assert.deepEqual(createFeatherFilter(80), { type: FEATHER_FILTER_TYPE, radius: 80 })
})

test('registers once and includes the feather in native render bounds', () => {
  installFeather()
  installFeather()
  assert.ok(Filter.list[FEATHER_FILTER_TYPE])
  assert.equal(FEATHER_FILTER_TYPE, 'feather')
  assert.equal(Filter.list[LEGACY_FEATHER_FILTER_TYPE], Filter.list.feather)
  assert.equal(Filter.getSpread([createFeatherFilter(80)]), 240)
  assert.equal(Filter.getSpread([{ ...createFeatherFilter(80), visible: false }]), 0)
})
