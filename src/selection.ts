import { Matrix } from '@leafer-ui/core'
import type { IImagePaint, ILeafPaint, ILeaferCanvas, IMatrixWithBoundsScaleData, IUI } from '@leafer-ui/interface'

type SelectionData = IUI['__'] & {
  _fill: IUI['__']['fill']
  _stroke: IUI['__']['stroke']
}

/** Geometry coverage is independent of authored paint opacity and RGB. */
function selectionPaint(paint: string | ILeafPaint[] | undefined): string | ILeafPaint[] | undefined {
  if (!paint) return paint
  if (typeof paint === 'string') return '#fff'
  return paint.map(item => {
    if (item.image) {
      if (item.originPaint?.opacity === undefined || item.originPaint.opacity === 1) return item
      // Keep native image alpha, crop, repeat, transforms and stroke styles.
      // Reuse the loaded image, but request its native pattern without authored
      // paint opacity. Never reuse a pattern with that opacity already baked in.
      return { ...item, originPaint: { ...item.originPaint as IImagePaint, opacity: 1, sync: true },
        style: undefined, patternId: undefined, patternTask: undefined, transform: undefined }
    }
    return { type: 'solid' as const, style: '#fff', strokeStyle: item.strokeStyle,
      originPaint: { ...item.originPaint, type: 'solid', color: '#fff', opacity: 1 } }
  })
}

/**
 * A separate material pass through the same native Leafer renderer. Changing
 * only computed paints preserves all geometry, masks, clipping and child order;
 * source pixels are never thresholded or repeatedly saturated into a selection.
 */
export function drawSelection(ui: IUI, canvas: ILeaferCanvas, world: IMatrixWithBoundsScaleData) {
  const restore: Array<() => void> = []
  const prepare = (node: IUI) => {
    const data = node.__ as SelectionData
    if (data.__needComputePaint) data.__computePaint()
    const fill = data._fill, stroke = data._stroke
    const useEffect = data.__useEffect, fastShadow = data.__isFastShadow
    const nowWorld = node.__nowWorld
    restore.push(() => {
      data._fill = fill
      data._stroke = stroke
      data.__useEffect = useEffect
      data.__isFastShadow = fastShadow
      node.__nowWorld = nowWorld
    })
    data._fill = selectionPaint(fill)
    data._stroke = selectionPaint(stroke)
    data.__useEffect = data.__isFastShadow = false
    if (node.isBranch) node.children?.forEach(prepare)
  }
  canvas.save()
  try {
    prepare(ui)
    ui.__nowWorld = world
    canvas.setWorld(world)
    canvas.opacity = 1
    ui.__draw(canvas, { matrix: new Matrix(world).divide(ui.__world).withScale(), ignoreOpacity: true })
  } finally {
    for (const reset of restore.reverse()) reset()
    canvas.restore()
    canvas.resetTransform()
  }
}
