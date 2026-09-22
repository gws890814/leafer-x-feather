import type { ILeaferCanvas, IMatrixWithBoundsScaleData, IUI } from '@leafer-ui/interface';
/**
 * A separate material pass through the same native Leafer renderer. Changing
 * only computed paints preserves all geometry, masks, clipping and child order;
 * source pixels are never thresholded or repeatedly saturated into a selection.
 */
export declare function drawSelection(ui: IUI, canvas: ILeaferCanvas, world: IMatrixWithBoundsScaleData): void;
