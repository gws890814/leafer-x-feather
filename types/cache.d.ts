import type { ILeaf } from '@leafer-ui/interface';
/** Native notifications include forceUpdate(), image completion and child edits. */
export declare class FeatherRevisions {
    private revisions;
    private roots;
    read(leaf: ILeaf, readsBackground: boolean): string | undefined;
    invalidate(leaf: ILeaf): void;
}
