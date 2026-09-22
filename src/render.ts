import '@leafer-in/filter'
import { BoundsHelper, Creator, Effect, Export, Filter, Matrix, Platform } from '@leafer-ui/core'
import type { IBoundsData, ILeaferCanvas, IMatrixWithBoundsScaleData, IUI, ICachedShape, IFilter } from '@leafer-ui/interface'
import { FeatherRevisions } from './cache.ts'
import { featherRadii } from './types.ts'
import { drawSelection } from './selection.ts'

type FeatherSurface = { canvas: ILeaferCanvas; bounds: IBoundsData; key: string; root: IUI['leafer'] }
const surfaces = new WeakMap<IUI, Map<number, FeatherSurface>>()
const revisions = new FeatherRevisions()

// Three Gaussian standard deviations cover the visible 8-bit alpha transition.
export function featherSpread(radius: number | readonly number[]) {
  return Math.ceil(Math.max(0, ...featherRadii(radius)) * 3)
}

function createCanvas(bounds: IBoundsData, pixelRatio: number) {
  // Pixel readback is intentionally disabled. willReadFrequently forces
  // browsers onto a slower software-backed canvas.
  return Creator.canvas!({ width: bounds.width, height: bounds.height, pixelRatio, smooth: true })
}

/** Native geometry/paints in object coordinates, without baking in viewport zoom. */
function drawForeground(ui: IUI, canvas: ILeaferCanvas, world: IMatrixWithBoundsScaleData) {
  const data = ui.__
  const useEffect = data.__useEffect
  const fastShadow = data.__isFastShadow
  const matrix = new Matrix(world).divide(ui.__world).withScale()
  canvas.setWorld(world)
  try {
    data.__useEffect = false
    data.__isFastShadow = false
    ui.__draw(canvas, { matrix })
  } finally {
    data.__useEffect = useEffect
    data.__isFastShadow = fastShadow
    canvas.resetTransform()
  }
}

function cachedAlpha(canvas: ILeaferCanvas, world: IMatrixWithBoundsScaleData): ICachedShape {
  return { canvas, worldCanvas: canvas, bounds: canvas.bounds,
    shapeBounds: canvas.bounds, renderBounds: world, scaleX: 1, scaleY: 1 }
}

/**
 * All layers share the largest feather radius R. Each radius r contributes
 * M = 1 - r/R + (r/R) * F(R). Their masks multiply, so r=0 is the identity
 * without a time-dependent transition or a narrow mask clipping a wider halo.
 * One maximum-radius layer is already in the outward colour surface; the
 * remaining masks only attenuate alpha. Source colours are restored once.
 */
function featherSurface(source: ILeaferCanvas, output: ILeaferCanvas, radii: number[], drawCoverage: (canvas: ILeaferCanvas) => void) {
  if (!radii.length) { output.copyWorld(source); return }
  output.resetTransform()
  const radius = radii[0]!
  output.setWorldBlur(radius)
  output.drawImage(source.view as HTMLCanvasElement, 0, 0)
  output.filter = 'none'
  if (radii.length > 1) {
    const coverage = createCanvas(source.bounds, source.pixelRatio)
    const mask = createCanvas(source.bounds, source.pixelRatio)
    try {
      drawCoverage(coverage)
      mask.setWorldBlur(radius)
      mask.drawImage(coverage.view as HTMLCanvasElement, 0, 0)
      mask.filter = 'none'
      // Store 1-F once. Removing r/R of it is exactly multiplication by M,
      // using only LeaferCanvas compositing, with no extra blur per layer.
      coverage.clear()
      coverage.fillWorld(coverage.bounds, '#fff')
      coverage.copyWorld(mask, undefined, undefined, 'destination-out')
      for (const layerRadius of radii.slice(1)) {
        output.opacity = layerRadius / radius
        output.copyWorld(coverage, undefined, undefined, 'destination-out')
      }
    } finally {
      output.opacity = 1
      coverage.destroy()
      mask.destroy()
    }
  }
  output.copyWorld(source, source.bounds, source.bounds, 'source-atop')
}

function renderSurface(ui: IUI, world: IMatrixWithBoundsScaleData,
  bounds: IBoundsData, pixelRatio: number, radii: number[],
  preceding: IFilter[], origin?: ILeaferCanvas) {
  const source = createCanvas(bounds, pixelRatio)
  let output = createCanvas(bounds, pixelRatio)
  let result = output
  const localWorld = { a: 1, b: 0, c: 0, d: 1, e: -bounds.x, f: -bounds.y,
    x: 0, y: 0, width: bounds.width, height: bounds.height, scaleX: 1, scaleY: 1 }
  const originalWorld = ui.__nowWorld
  const data = ui.__ as typeof ui.__ & { _shadow: typeof ui.__.shadow; _innerShadow: typeof ui.__.innerShadow }
  const shadow = data._shadow, innerShadow = data._innerShadow
  try {
    ui.__nowWorld = localWorld
    drawForeground(ui, source, localWorld)
    if (preceding.length) {
      const alpha = createCanvas(bounds, pixelRatio)
      const background = createCanvas(bounds, pixelRatio)
      try {
        alpha.copyWorld(source, source.bounds, source.bounds)
        if (origin) {
          background.setWorld(new Matrix(localWorld).divide(world).withScale())
          background.drawImage(origin.view as HTMLCanvasElement, 0, 0, origin.width, origin.height)
        }
        source.setWorld(localWorld)
        Filter.apply(preceding, ui, localWorld, source, background, cachedAlpha(alpha, localWorld))
        source.resetTransform()
      } finally {
        alpha.destroy()
        background.destroy()
      }
    }
    featherSurface(source, output, radii, canvas => drawSelection(ui, canvas, localWorld))

    // Preserve explicitly screen-fixed shadows in object coordinates.
    const scale = Math.max(1, Math.abs(world.scaleX))
    const localShadows = (effects: typeof shadow) => effects?.map(effect => effect.scaleFixed
      ? { ...effect, x: (effect.x || 0) / scale, y: (effect.y || 0) / scale,
        blur: (effect.blur || 0) / scale, spread: (effect.spread || 0) / scale, scaleFixed: false }
      : effect)
    data._shadow = localShadows(shadow)
    data._innerShadow = localShadows(innerShadow)
    if (data.shadow || data.innerShadow) {
      result = createCanvas(bounds, pixelRatio)
      const alphaShape = cachedAlpha(output, localWorld)
      result.setWorld(localWorld)
      if (data.shadow) Effect.shadow(ui, result, alphaShape)
      result.copyWorldByReset(output, output.bounds, output.bounds)
      if (data.innerShadow) Effect.innerShadow(ui, result, alphaShape)
    }
    return result
  } catch (error) {
    result.destroy()
    throw error
  } finally {
    data._shadow = shadow
    data._innerShadow = innerShadow
    ui.__nowWorld = originalWorld
    source.destroy()
    if (result !== output) output.destroy()
  }
}

export function applyFeather(current: ILeaferCanvas, ui: IUI, world: IMatrixWithBoundsScaleData,
  radius: number | readonly number[], preceding: IFilter[] = [], origin?: ILeaferCanvas, _shape?: ICachedShape) {
  // Canonical order makes equivalent stacks identical even at 8-bit precision.
  const radii = featherRadii(radius).sort((a, b) => b - a)
  if (!radii.length) return
  const revision = revisions.read(ui, !!preceding.length)
  const render = ui.__layout.renderBounds
  // Follow Leafer's image cache budget instead of allocating an unbounded
  // bitmap for a very large document node. This budget is independent of zoom.
  const ratio = Math.min(current.pixelRatio,
    Math.sqrt(Platform.image.maxCacheSize / ((render.width + 2) * (render.height + 2))))
  // Object-space rounding keeps the sampled contour and gradient stable while
  // zooming or panning, including colours at the same document point.
  const x = Math.floor(render.x * ratio) / ratio, y = Math.floor(render.y * ratio) / ratio
  const bounds = { x, y, width: Math.ceil((render.x + render.width - x) * ratio) / ratio,
    height: Math.ceil((render.y + render.height - y) * ratio) / ratio }
  if (!bounds.width || !bounds.height) return
  const fixedShadow = [...ui.__.shadow || [], ...ui.__.innerShadow || []].some(effect => effect.scaleFixed)
  const key = [revision, radii.join(','), ratio, x, y, bounds.width, bounds.height,
    fixedShadow ? Math.max(1, Math.abs(world.scaleX)) : 0,
    // Preceding custom filters may read background pixels in world coordinates.
    ...(preceding.length ? [world.a, world.b, world.c, world.d, world.e, world.f] : [])].join(':')
  let nodeSurfaces = surfaces.get(ui)
  if (!nodeSurfaces) surfaces.set(ui, nodeSurfaces = new Map())
  // Separate native filter groups have distinct inputs. Export uses its own
  // final surface, without replacing a live viewport's differently sized cache.
  let surface = nodeSurfaces.get(preceding.length)
  if (Export.running || revision === undefined || !surface?.canvas.view || surface.key !== key || surface.root !== ui.leafer) {
    const canvas = renderSurface(ui, world, bounds, ratio, radii, preceding, origin)
    if (!Export.running) surface?.canvas.destroy()
    surface = { canvas, bounds, key, root: ui.leafer }
    if (!Export.running) nodeSurfaces.set(preceding.length, surface)
  }
  current.save()
  try {
    current.resetTransform()
    current.clearWorld(BoundsHelper.getOuterOf(surface.bounds, world))
    current.setWorld(world)
    const view = surface.canvas.view as HTMLCanvasElement
    current.drawImage(view, 0, 0, view.width, view.height,
      surface.bounds.x, surface.bounds.y, surface.bounds.width, surface.bounds.height)
  } finally {
    current.restore()
    if (Export.running) surface.canvas.destroy()
  }
}
