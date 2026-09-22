import { WatchEvent } from '@leafer-ui/core'
import type { ILeaf, IWatchEvent } from '@leafer-ui/interface'

/** Native notifications include forceUpdate(), image completion and child edits. */
export class FeatherRevisions {
  private revisions = new WeakMap<ILeaf, number>()
  private roots = new WeakMap<ILeaf, { generation: number; fullGeneration: number }>()

  read(leaf: ILeaf, readsBackground: boolean) {
    const root = leaf.leafer
    if (!root) return undefined
    let state = this.roots.get(root)
    if (!state) {
      state = { generation: 0, fullGeneration: 0 }
      this.roots.set(root, state)
      const current = state
      root.on(WatchEvent.DATA, (event: IWatchEvent) => {
        current.generation++
        if (!root.watcher.config.usePartLayout) current.fullGeneration++
        for (const changed of event.data.updatedList.list) this.invalidate(changed)
      })
    }
    return `${state.fullGeneration}:${readsBackground ? state.generation : this.revisions.get(leaf) || 0}`
  }

  invalidate(leaf: ILeaf) {
    // Descendants change a container's pixels; viewport transforms do not
    // change descendants' pixels. Never invalidate downwards on zoom/pan.
    for (let current: ILeaf | undefined = leaf; current; current = current.parent) {
      this.revisions.set(current, (this.revisions.get(current) || 0) + 1)
    }
  }
}
