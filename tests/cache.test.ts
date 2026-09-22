import test from 'node:test'
import assert from 'node:assert/strict'
import type { ILeaf, IWatchEvent } from '@leafer-ui/interface'
import { FeatherRevisions } from '../src/cache.ts'

function scene(partLayout = true) {
  let notify: (event: IWatchEvent) => void = () => undefined
  let subscriptions = 0
  const root = { watcher: { config: { usePartLayout: partLayout } },
    on(_type: string, listener: typeof notify) { subscriptions++; notify = listener } } as unknown as ILeaf
  const group = { leafer: root, parent: root } as ILeaf
  const leaf = { leafer: root, parent: group } as ILeaf
  const sibling = { leafer: root, parent: root } as ILeaf
  return { root, group, leaf, sibling, subscriptions: () => subscriptions,
    change: (...list: ILeaf[]) => notify({ data: { updatedList: { list } } } as IWatchEvent) }
}

test('viewport changes reuse descendants; child changes invalidate only their ancestor chain', () => {
  const cache = new FeatherRevisions(), tree = scene()
  const read = () => [tree.group, tree.leaf, tree.sibling].map(node => cache.read(node, false))
  const initial = read()
  tree.change(tree.root)
  assert.deepEqual(read(), initial)
  tree.change(tree.leaf)
  const changed = read()
  assert.notEqual(changed[0], initial[0])
  assert.notEqual(changed[1], initial[1])
  assert.equal(changed[2], initial[2])
  assert.equal(tree.subscriptions(), 1)
})

test('forceUpdate and image completion need only the native updated leaf notification', () => {
  const cache = new FeatherRevisions(), tree = scene()
  const initial = cache.read(tree.leaf, false)
  tree.change(tree.leaf)
  assert.notEqual(cache.read(tree.leaf, false), initial)
})

test('filters reading background invalidate when a sibling changes', () => {
  const cache = new FeatherRevisions(), tree = scene()
  const initial = cache.read(tree.leaf, true)
  tree.change(tree.sibling)
  assert.notEqual(cache.read(tree.leaf, true), initial)
})

test('full-layout roots without per-leaf updates invalidate all cached surfaces', () => {
  const cache = new FeatherRevisions(), tree = scene(false)
  const initial = cache.read(tree.leaf, false)
  tree.change()
  assert.notEqual(cache.read(tree.leaf, false), initial)
})

test('detached exports never reuse a surface without a watcher', () => {
  assert.equal(new FeatherRevisions().read({} as ILeaf, false), undefined)
})
