import { Box, Creator, Group, Leafer, Rect, UI } from 'leafer-ui'
import { drawSelection } from '../src/selection.ts'
import { createFeatherFilter } from '../src/types.ts'

export async function runSelectionRegression(leafer: Leafer) {
  const results: { name: string; pass: boolean; details?: unknown }[] = []
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  const read = () => leafer.canvas.context.getImageData(0, 0, 600, 520)
  const alpha = (image: ImageData, x: number, y: number) => image.data[(y * image.width + x) * 4 + 3]!
  const difference = (a: ImageData, b: ImageData) => {
    let max = 0
    for (let i = 3; i < a.data.length; i += 4) max = Math.max(max, Math.abs(a.data[i]! - b.data[i]!))
    return max
  }
  const paint = async (node: UI) => {
    leafer.removeAll()
    leafer.add(node)
    leafer.forceRender(undefined, true)
    await frame()
    return read()
  }
  const raster = (node: UI, asSelection = true) => {
    const canvas = Creator.canvas!({ width: 600, height: 520, pixelRatio: 1, smooth: true,
      pixelSnap: leafer.canvas.pixelSnap })
    try {
      if (asSelection) drawSelection(node, canvas, node.__world)
      else node.__render(canvas, {})
      return canvas.context.getImageData(0, 0, 600, 520)
    } finally { canvas.destroy() }
  }
  const selection = (node: UI) => raster(node)

  const geometry = { x: 180.35, y: 130.7, width: 153.2, height: 167.9, cornerRadius: 23, rotation: 17 }
  const referenceEdge = new Rect({ ...geometry, fill: '#fff', stroke: '#fff', strokeWidth: 7 })
  await paint(referenceEdge)
  const expectedEdge = raster(referenceEdge, false)
  const faint = new Rect({ ...geometry, fill: '#6050a001', stroke: '#20309040', strokeWidth: 7, opacity: 0.3,
    filter: createFeatherFilter([12, 12]), shadow: { x: 25, y: 0, blur: 20, color: '#000' } })
  await paint(faint)
  const beforeJSON = JSON.stringify(faint.toJSON()), beforeFill = faint.__.fill
  const actualEdge = selection(faint)
  results.push({ name: 'selection preserves native antialias coverage independently of paint and node opacity',
    pass: difference(expectedEdge, actualEdge) <= 1 && actualEdge.data.some((value, index) => index % 4 === 3 && value > 0 && value < 255),
    details: { alphaError: difference(expectedEdge, actualEdge) } })
  results.push({ name: 'selection pass restores authored data and original computed paints',
    pass: JSON.stringify(faint.toJSON()) === beforeJSON && faint.__.fill === beforeFill })

  const bitmap = document.createElement('canvas')
  bitmap.width = bitmap.height = 240
  const context = bitmap.getContext('2d')!
  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(120, 120, 105, 0, Math.PI * 2)
  context.fill()
  context.clearRect(60, 60, 40, 40)
  context.clearRect(120, 160, 40, 20)
  context.fillStyle = 'rgba(255,255,255,0.00392156862745)'
  context.fillRect(120, 160, 40, 20)
  const image = new Rect({ x: 160, y: 140, width: 240, height: 240,
    fill: { type: 'image', url: bitmap.toDataURL(), mode: 'stretch', opacity: 0.25 }, filter: createFeatherFilter([12, 12]) })
  await paint(image)
  await new Promise<void>(resolve => leafer.waitViewCompleted(resolve))
  await frame()
  const imageJSON = JSON.stringify(image.toJSON())
  const imageSelection = selection(image)
  results.push({ name: 'image selection preserves transparent holes and low alpha instead of saturating them',
    pass: alpha(imageSelection, 235, 215) === 0 && alpha(imageSelection, 290, 310) === 1 && alpha(imageSelection, 280, 260) === 255,
    details: { hole: alpha(imageSelection, 235, 215), faint: alpha(imageSelection, 290, 310), opaque: alpha(imageSelection, 280, 260) } })
  results.push({ name: 'image selection keeps authored image opacity unchanged', pass: imageJSON === JSON.stringify(image.toJSON()) })

  const createNested = (fill: string, opacity: number) => {
    const box = new Box({ x: 160, y: 140, width: 160, height: 180, overflow: 'hide',
      filter: createFeatherFilter([12, 12]), opacity })
    const group = new Group({ x: 40, y: 30, opacity })
    group.add(new Rect({ width: 100, height: 100, fill, mask: true }))
    group.add(new Rect({ x: 20, y: -50, width: 180, height: 180, fill, opacity }))
    group.add(new Rect({ x: 20, y: 110, width: 80, height: 40, fill, visible: false }))
    box.add(new Group({ x: 0, children: [group] }))
    return box
  }
  const nested = createNested('#5030a040', 0.4)
  await paint(nested)
  const nestedJSON = JSON.stringify(nested.toJSON())
  const nestedSelection = selection(nested)
  const reference = createNested('#fff', 1)
  reference.filter = undefined
  await paint(reference)
  const nestedExpected = raster(reference, false)
  results.push({ name: 'selection follows nested native masks, clipping and hidden children',
    pass: difference(nestedSelection, nestedExpected) <= 1 && alpha(nestedSelection, 235, 185) === 255,
    details: { alphaError: difference(nestedSelection, nestedExpected), inside: alpha(nestedSelection, 235, 185) } })
  results.push({ name: 'nested selection leaves every child source property intact', pass: nestedJSON === JSON.stringify(nested.toJSON()) })
  return results
}
