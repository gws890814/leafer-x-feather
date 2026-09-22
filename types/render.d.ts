import '@leafer-in/filter';
import type { ILeaferCanvas, IMatrixWithBoundsScaleData, IUI, ICachedShape, IFilter } from '@leafer-ui/interface';
export declare function featherSpread(radius: number | readonly number[]): number;
export declare function applyFeather(current: ILeaferCanvas, ui: IUI, world: IMatrixWithBoundsScaleData, radius: number | readonly number[], preceding?: IFilter[], origin?: ILeaferCanvas, _shape?: ICachedShape): void;
