import type { IFilter } from '@leafer-ui/interface';
export declare const FEATHER_FILTER_TYPE = "feather";
export declare const LEGACY_FEATHER_FILTER_TYPE = "leafer-x-feather";
export declare const MAX_FEATHER_RADIUS = 250;
export type FeatherRadiusInput = number | readonly number[];
/** Radius is expressed in Leafer document units and never mutates source geometry. */
export interface IFeatherFilter extends IFilter {
    type: typeof FEATHER_FILTER_TYPE;
    radius: number | number[];
}
export declare function normalizeFeatherRadius(value: unknown): number;
export declare function featherRadii(radius: FeatherRadiusInput): number[];
export declare function createFeatherFilter(radius: FeatherRadiusInput): IFeatherFilter;
export declare function isFeatherFilter(value: unknown): value is IFeatherFilter;
