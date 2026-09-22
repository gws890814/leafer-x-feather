import '@leafer-in/export'
import { Leafer, Rect, Path, Ellipse, Line, Group, Box, Image as LeaferImage, UI, Filter } from 'leafer-ui'
import type { ILeaferCanvas } from '@leafer-ui/interface'
import { createFeatherFilter } from '../src/types.ts'
import { runSelectionRegression } from './selection-regression.ts'

type Result = { name: string; pass: boolean; details?: unknown }
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

export async function runFeatherRegression() {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-2000px;top:0;width:600px;height:520px'
  document.body.append(host)
  const leafer = new Leafer({ view: host, width: 600, height: 520, pixelRatio: 1 })
  await new Promise<void>(resolve => leafer.waitViewReady(() => resolve()))
  const results: Result[] = []
  const base = { x: 160, y: 140, width: 240, height: 240, fill: '#785adc', filter: [createFeatherFilter(12)] }
  const assert = (name: string, pass: boolean, details?: unknown) => results.push({ name, pass, details })
  const read = () => leafer.canvas.context.getImageData(0, 0, 600, 520)
  const pixel = (image: ImageData, x: number, y: number) => Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4))
  const paint = async (node: UI) => {
    leafer.removeAll()
    leafer.add(node)
    leafer.forceRender(undefined, true)
    await frame()
    return read()
  }
  const maxDifference = (a: ImageData, b: ImageData) => {
    let max = 0
    for (let i = 0; i < a.data.length; i++) max = Math.max(max, Math.abs(a.data[i]! - b.data[i]!))
    return max
  }
  const visualDifference = (a: ImageData, b: ImageData) => {
    let max = 0
    for (let i = 0; i < a.data.length; i += 4) {
      max = Math.max(max, Math.abs(a.data[i + 3]! - b.data[i + 3]!))
      for (let c = 0; c < 3; c++) max = Math.max(max, Math.abs(a.data[i + c]! * a.data[i + 3]! / 255 - b.data[i + c]! * b.data[i + 3]! / 255))
    }
    return max
  }
  try {
    const node = new Rect(base)
    const image = await paint(node)
    const alphas = Array.from({ length: 81 }, (_, x) => pixel(image, x + 120, 260)[3]!)
    assert('contour crosses 50% alpha with a smooth transition on both sides',
      alphas[28]! > 0 && alphas[40]! > 115 && alphas[40]! < 145 && alphas[76]! > 250 &&
      alphas.every((alpha, i) => !i || (alpha >= alphas[i - 1]! && alpha - alphas[i - 1]! < 14)),
      { outside: alphas[28], contour: alphas[40], inside: alphas[76] })
    const edgeColours = [145, 152, 160, 172, 195].map(x => pixel(image, x, 260))
    assert('edge colors have no visible black or white fringe', edgeColours.every(([r, g, b, a]) => {
      const opacity = a! / 255
      return Math.abs(r! - 120) * opacity <= 3 && Math.abs(g! - 90) * opacity <= 3 && Math.abs(b! - 220) * opacity <= 3
    }), edgeColours)

    const translucent = await paint(new Rect({ ...base, fill: '#785adc80' }))
    assert('half-transparent fill is applied once', Math.abs(pixel(translucent, 280, 260)[3]! - 128) <= 1 &&
      Math.abs(pixel(translucent, 160, 260)[3]! - 66) <= 4,
    { center: pixel(translucent, 280, 260), contour: pixel(translucent, 160, 260) })

    const stacked = new Rect({ ...base, filter: createFeatherFilter([12, 12, 12]) })
    const stackedPixels = await paint(stacked)
    const singleEdge = pixel(image, 160, 260)[3]!
    const stackedEdge = pixel(stackedPixels, 160, 260)[3]!
    let singleAlpha = 0, stackedAlpha = 0, alphaIncreased = false
    for (let i = 3; i < image.data.length; i += 4) {
      singleAlpha += image.data[i]!
      stackedAlpha += stackedPixels.data[i]!
      if (stackedPixels.data[i]! > image.data[i]!) alphaIncreased = true
    }
    assert('additional masks attenuate the existing transition without dimming the interior',
      stackedAlpha < singleAlpha && !alphaIncreased && pixel(stackedPixels, 280, 260)[3]! === 255,
      { singleEdge, stackedEdge, singleAlpha, stackedAlpha })
    const expectedStackedEdge = 255 * (singleEdge / 255) ** 3
    assert('equal-radius layers multiply contour opacity instead of merely trimming faint outer pixels',
      Math.abs(stackedEdge - expectedStackedEdge) <= 2,
      { singleEdge, expectedStackedEdge, stackedEdge })
    assert('stack retains outward feather with a continuous contour',
      pixel(stackedPixels, 155, 260)[3]! > 0 &&
      Math.abs(stackedEdge - pixel(stackedPixels, 159, 260)[3]!) <=
        Math.abs(singleEdge - pixel(image, 159, 260)[3]!) + 1,
      { single: [pixel(image, 159, 260)[3], singleEdge], stacked: [pixel(stackedPixels, 159, 260)[3], stackedEdge] })
    const stackedClone = await paint(UI.one(stacked.toJSON()))
    assert('stack JSON round trip keeps every mask', maxDifference(stackedPixels, stackedClone) === 0)
    const nativeStack = await paint(new Rect({ ...base, filter: [createFeatherFilter(12), createFeatherFilter(12), createFeatherFilter(12)] }))
    assert('native filter list and compact stack produce identical pixels', visualDifference(nativeStack, stackedPixels) <= 1)
    const translucentStack = await paint(new Rect({ ...base, fill: '#785adc80', filter: createFeatherFilter([12, 12, 12]) }))
    assert('stack applies paint opacity once', Math.abs(pixel(translucentStack, 280, 260)[3]! - 128) <= 1)
    stacked.filter = createFeatherFilter(12)
    await paint(stacked)
    const removedLayer = read()
    assert('removing masks restores the single layer without accumulated damage', maxDifference(removedLayer, image) === 0)

    // Recording 21:09:37: 24px + fourth layer 0 -> 1 must retain the wide halo.
    const first24 = await paint(new Rect({ ...base, filter: createFeatherFilter(24) }))
    const zeroLayer = await paint(new Rect({ ...base, filter: createFeatherFilter([24, 0]) }))
    assert('adding a zero-radius layer is an exact identity', maxDifference(first24, zeroLayer) === 0)
    const smallFourth = await paint(new Rect({ ...base, filter: createFeatherFilter([24, 0, 0, 1]) }))
    const beforeHalo = pixel(first24, 145, 260)[3]!, afterHalo = pixel(smallFourth, 145, 260)[3]!
    assert('24px plus a 1px fourth layer retains the expanded soft edge',
      afterHalo >= beforeHalo * 0.94 && visualDifference(first24, smallFourth) <= 4,
      { beforeHalo, afterHalo, difference: visualDifference(first24, smallFourth) })
    const expectedHalo = beforeHalo * (1 - 1 / 24 + beforeHalo / 255 / 24)
    assert('unequal radii apply the specified independent mask strength', Math.abs(afterHalo - expectedHalo) <= 1,
      { afterHalo, expectedHalo })
    for (const from of [[24, 0], [24, 0, 9], [24, 50, 9, 0], [0, 4]]) {
      const slot = from.indexOf(0)
      let previous = await paint(new Rect({ ...base, filter: createFeatherFilter(from) }))
      const initialHalo = pixel(previous, 145, 260)[3]!
      const changes: number[] = []
      for (const radius of [0.125, 0.25, 0.5, 0.75, 1]) {
        const radii = from.map((value, index) => index === slot ? radius : value)
        const next = await paint(new Rect({ ...base, filter: createFeatherFilter(radii) }))
        changes.push(visualDifference(previous, next))
        previous = next
      }
      const limit = Math.ceil(64 * 0.25 / Math.max(...from)) + 2
      assert(`zero-to-positive changes remain small without animation (${from.join(',')})`,
        changes.every(change => change <= limit), { changes, limit, initialHalo, finalHalo: pixel(previous, 145, 260)[3] })
    }
    const orderReference = await paint(new Rect({ ...base, filter: createFeatherFilter([24, 9, 1]) }))
    const orderDifferences: number[] = []
    for (const radii of [[1, 24, 9], [9, 1, 24], [0, 9, 24, 0, 1]]) {
      orderDifferences.push(visualDifference(orderReference, await paint(new Rect({ ...base, filter: createFeatherFilter(radii) }))))
    }
    assert('shared range is independent of layer order and inactive positions', orderDifferences.every(value => value <= 1), orderDifferences)

    const editing = new Rect({ ...base, filter: createFeatherFilter([24, 0]) })
    await paint(editing)
    editing.filter = createFeatherFilter([24, 1])
    leafer.forceRender(undefined, true)
    const immediate = read()
    const expectedEdit = await paint(new Rect({ ...base, filter: createFeatherFilter([24, 1]) }))
    assert('editing and fresh import render identical pixels immediately', visualDifference(immediate, expectedEdit) <= 1)
    const immediateExport = leafer.syncExport('canvas', { screenshot: true })
    const exportCanvas = immediateExport.data as ILeaferCanvas
    const exportPixels = exportCanvas.context.getImageData(0, 0, 600, 520)
    exportCanvas.destroy()
    assert('native export equals the immediate viewport result', visualDifference(exportPixels, expectedEdit) <= 1)

    // Zero and disabled layers are identities regardless of their position.
    const radius4 = await paint(new Rect({ ...base, filter: createFeatherFilter(4) }))
    const zeroPositions: { slot: number; identity: number }[] = []
    for (let slot = 0; slot < 4; slot++) {
      const radii = [4, 0, 0]
      radii.splice(slot, 0, 0)
      const zero = await paint(new Rect({ ...base, filter: createFeatherFilter(radii) }))
      zeroPositions.push({ slot, identity: visualDifference(radius4, zero) })
    }
    assert('zero slots at any position preserve the effective feather',
      zeroPositions.every(item => item.identity === 0), zeroPositions)
    const nativeZero = await paint(new Rect({ ...base, filter: [createFeatherFilter(0), createFeatherFilter(4)] }))
    const nativeOne = await paint(new Rect({ ...base, filter: [createFeatherFilter(1), createFeatherFilter(4)] }))
    assert('enabling a small leading layer retains the larger layer outward range',
      visualDifference(nativeZero, radius4) === 0 && pixel(nativeOne, 155, 260)[3]! > 0 &&
      pixel(nativeOne, 155, 260)[3]! >= pixel(nativeZero, 155, 260)[3]! * 0.7)
    const nativeDisabled = await paint(new Rect({ ...base,
      filter: [{ ...createFeatherFilter(1), visible: false }, createFeatherFilter(4)] }))
    assert('disabled leading native filters preserve the effective feather', visualDifference(nativeDisabled, radius4) === 0)
    const secondZero = await paint(new Rect({ ...base, filter: createFeatherFilter([4, 0, 9]) }))
    const withoutMiddle = await paint(new Rect({ ...base, filter: createFeatherFilter([4, 9]) }))
    assert('a zero middle layer is an identity between two active layers', visualDifference(secondZero, withoutMiddle) <= 1)

    const plain = new Rect({ ...base, filter: undefined })
    const plainImage = await paint(plain)
    plain.filter = base.filter
    await frame()
    plain.filter = undefined
    await frame()
    assert('disabling feather restores the original render exactly', maxDifference(plainImage, read()) === 0)

    const clone = UI.one(node.toJSON())
    const clonePixels = await paint(clone)
    let firstDifference: unknown
    for (let i = 0; i < image.data.length; i++) if (image.data[i] !== clonePixels.data[i]) {
      const x = Math.floor(i / 4) % 600, y = Math.floor(i / 2400)
      firstDifference = { x, y, a: pixel(image, x, y), b: pixel(clonePixels, x, y) }
      break
    }
    assert('native JSON round trip restores feathered pixels exactly', maxDifference(image, clonePixels) === 0,
      { difference: maxDifference(image, clonePixels), firstDifference, json: node.toJSON(), original: pixel(image, 160, 260), clone: pixel(clonePixels, 160, 260) })

    const withShadow = [{ x: 18, y: 24, blur: 14, color: '#101020b0', box: false }]
    const effectCases = [
      { name: 'outer box=false', effects: { shadow: withShadow } },
      { name: 'outer box=true', effects: { shadow: withShadow.map(item => ({ ...item, box: true })) } },
      { name: 'inner', effects: { innerShadow: withShadow } },
      { name: 'multiple outer and inner', effects: { shadow: [...withShadow, { x: -10, y: 3, blur: 10, spread: 0, color: '#e0306040', box: false }], innerShadow: withShadow } },
    ]
    for (const { name, effects } of effectCases) {
      const actual = await paint(new Rect({ ...base, ...effects }))
      await paint(new Rect(base))
      const raster = (leafer.canvas.view as HTMLCanvasElement).toDataURL()
      const reference = new LeaferImage({ x: 0, y: 0, width: 600, height: 520, url: raster, ...effects })
      await paint(reference)
      await new Promise<void>(resolve => leafer.waitViewCompleted(() => resolve()))
      await frame()
      const expected = read()
      let worst = 0
      let location: unknown
      for (let y = 90; y < 445; y++) for (let x = 105; x < 475; x++) {
        const a = pixel(actual, x, y), b = pixel(expected, x, y)
        // Compare premultiplied pixels, avoiding noise in near-zero alpha RGB.
        const difference = Math.max(Math.abs(a[3]! - b[3]!), ...[0, 1, 2].map(c => Math.abs(a[c]! * a[3]! / 255 - b[c]! * b[3]! / 255)))
        if (difference > worst) { worst = difference; location = { x, y, actual: a, expected: b } }
      }
      assert(`native shadow follows feather alpha (${name})`, worst <= 10, { worst, location })
    }

    const checker = document.createElement('canvas')
    checker.width = checker.height = 240
    const checkerContext = checker.getContext('2d')!
    for (let y = 0; y < 240; y += 8) for (let x = 0; x < 240; x += 8) {
      checkerContext.fillStyle = ((x + y) / 8) % 2 ? '#fcfafa' : '#174528'
      checkerContext.fillRect(x, y, 8, 8)
    }
    const textured = new Rect({ ...base, fill: { type: 'image', url: checker.toDataURL(), mode: 'stretch' }, filter: undefined })
    await paint(textured)
    await new Promise<void>(resolve => leafer.waitViewCompleted(() => resolve()))
    const textureBefore = read()
    textured.filter = base.filter
    await frame()
    const textureAfter = read()
    let textureDifference = 0
    for (let y = 200; y < 300; y++) for (let x = 220; x < 320; x++) {
      const a = pixel(textureBefore, x, y), b = pixel(textureAfter, x, y)
      for (let c = 0; c < 4; c++) textureDifference = Math.max(textureDifference, Math.abs(a[c]! - b[c]!))
    }
    assert('image fill details stay sharp inside the contour', textureDifference === 0, { textureDifference })
    textured.filter = createFeatherFilter([12, 12, 24])
    await frame()
    const stackTexture = read()
    let stackColourDifference = 0
    for (let y = 200; y < 300; y++) for (let x = 220; x < 320; x++) {
      const a = pixel(textureBefore, x, y), b = pixel(stackTexture, x, y)
      for (let c = 0; c < 3; c++) stackColourDifference = Math.max(stackColourDifference, Math.abs(a[c]! - b[c]!))
    }
    assert('mixed radius stack preserves original image detail and RGB', stackColourDifference <= 1, { stackColourDifference })

    const nativeImage = new LeaferImage({ x: 160, y: 140, width: 240, height: 240,
      url: checker.toDataURL(), filter: createFeatherFilter(80) })
    await paint(nativeImage)
    await new Promise<void>(resolve => leafer.waitViewCompleted(resolve))
    await frame()
    const featheredImage = read()
    assert('native Image feather crosses its contour without a hard edge',
      pixel(featheredImage, 120, 260)[3]! > 0 &&
      pixel(featheredImage, 159, 260)[3]! > 60 && pixel(featheredImage, 159, 260)[3]! < 190 &&
      Math.abs(pixel(featheredImage, 160, 260)[3]! - pixel(featheredImage, 159, 260)[3]!) < 8 &&
      pixel(featheredImage, 200, 260)[3]! > pixel(featheredImage, 160, 260)[3]!)
    const restoredImage = UI.one(nativeImage.toJSON())
    await paint(restoredImage)
    await new Promise<void>(resolve => leafer.waitViewCompleted(resolve))
    await frame()
    assert('native Image feather survives JSON round trip', visualDifference(featheredImage, read()) <= 1)

    const thickLine = await paint(new Line({ x: 160, y: 260, width: 240, stroke: '#785adc', strokeWidth: 40, strokeCap: 'round', filter: [createFeatherFilter(6)] }))
    assert('line feather follows actual stroke width', pixel(thickLine, 280, 240)[3]! > 110 && pixel(thickLine, 280, 240)[3]! < 150 && pixel(thickLine, 280, 230)[3]! > 0 && pixel(thickLine, 280, 260)[3]! > 250)

    const paintFilter = 'feather-test-paint'
    Filter.register(paintFilter, {
      getSpread: () => 0,
      apply(_filter, _ui, _world, canvas) {
        canvas.save()
        canvas.resetTransform()
        canvas.fillWorld(canvas.bounds, '#d04060', 'source-in')
        canvas.restore()
      },
    })
    const filtered = await paint(new Rect({ ...base, shadow: withShadow, filter: [{ type: paintFilter }, ...base.filter] }))
    assert('filters before feather are retained after foreground reconstruction', pixel(filtered, 280, 260).slice(0, 3).join() === '208,64,96')
    delete Filter.list[paintFilter]

    const hole = await paint(new Path({ x: 130, y: 100, path: 'M0 0H320V320H0ZM90 90V230H230V90Z', windingRule: 'evenodd', fill: '#785adc', filter: base.filter }))
    assert('holes fade on both sides of their actual contours', pixel(hole, 235, 260)[3]! > 0 && pixel(hole, 220, 260)[3]! > 110 && pixel(hole, 220, 260)[3]! < 145 && pixel(hole, 290, 260)[3]! === 0)

    const edited = new Path({ x: 80.25, y: 80.5, path: 'M30 0H370Q400 0 400 30V240Q400 270 370 270L297 227L30 270Q0 270 0 240V30Q0 0 30 0Z', fill: '#6c5ce7', filter: [createFeatherFilter(43.5)], scale: 0.85 })
    const angled = await paint(edited)
    let fringeError = 0
    let fringeLocation: unknown
    for (let i = 0; i < angled.data.length; i += 4) if (angled.data[i + 3]! >= 15) {
      const alpha = angled.data[i + 3]! / 255
      const error = Math.max(Math.abs(angled.data[i]! - 108), Math.abs(angled.data[i + 1]! - 92), Math.abs(angled.data[i + 2]! - 231)) * alpha
      if (error > fringeError) {
        fringeError = error
        fringeLocation = { x: i / 4 % angled.width, y: Math.floor(i / 4 / angled.width), pixel: Array.from(angled.data.slice(i, i + 4)) }
      }
    }
    assert('edited diagonal and curved edges have no visible extrapolated color streaks', fringeError <= 30, { fringeError, fringeLocation })

    const editedJSON = edited.toJSON()
    edited.path = 'M0 0H400V270H0Z'
    await frame()
    edited.set(editedJSON)
    await frame()
    assert('restoring an edited path restores feather appearance', visualDifference(angled, read()) <= 2,
      { difference: visualDifference(angled, read()), before: editedJSON, after: edited.toJSON() })

    const parent = new Group({ x: 80, y: 10, scale: 1.2, rotation: 12 })
    parent.add(new Ellipse({ x: 70, y: 70, width: 230, height: 160, fill: '#785adc', filter: base.filter, shadow: withShadow }))
    const beforeMove = await paint(parent)
    parent.x = 110
    parent.y = 30
    await frame()
    const afterMove = read()
    let shiftError = 0
    for (let y = 35; y < 450; y++) for (let x = 40; x < 500; x++) {
      const before = pixel(beforeMove, x, y), after = pixel(afterMove, x + 30, y + 20)
      shiftError = Math.max(shiftError, Math.abs(before[3]! - after[3]!))
    }
    assert('rotated group movement preserves feather and shadow alignment', shiftError <= 2, { shiftError })
    assert('movement clears old pixels', pixel(afterMove, 20, 20)[3] === 0)

    const large = new Rect({ x: -500, y: -500, width: 2000, height: 2000, fill: '#785adc', filter: [createFeatherFilter(40)] })
    const clipped = await paint(large)
    assert('offscreen geometry does not create a feather edge at the viewport', [[0, 0], [599, 0], [0, 519], [599, 519]].every(([x, y]) => pixel(clipped, x!, y!)[3] === 255))

    // A small 1x canvas misses the native shadow kernel limit seen on Retina
    // editor viewports. Compare identical document points, not screen points.
    const zoomHost = document.createElement('div')
    document.body.append(zoomHost)
    const zoomTree = new Leafer({ view: zoomHost, width: 1400, height: 900, pixelRatio: 2 })
    try {
      await new Promise<void>(resolve => zoomTree.waitViewReady(() => resolve()))
      for (const radius of [80, 160]) {
        const zoomNode = new Path({ x: 700.25, y: 450.25,
          path: 'M0 -100L86.6025 -50V50L0 100L-86.6025 50V-50Z',
          fill: '#7acbab', filter: [createFeatherFilter(radius)] })
        zoomTree.add(zoomNode)
        const zoomSamples: number[][] = []
        for (const scale of [0.5, 1, 2, 4, 8, 16]) {
          zoomNode.scale = scale
          zoomTree.forceRender(undefined, true)
          zoomSamples.push([0, 20].map(x => zoomTree.canvas.context.getImageData(1400 + x * scale * 2, 900, 1, 1).data[3]!))
        }
        assert(`document-point feather alpha stays stable across zoom levels (radius ${radius}, 2x pixels)`,
          zoomSamples[0]![0]! > 30 && zoomSamples[0]![0]! < 150 &&
          [0, 1].every(index => Math.max(...zoomSamples.map(row => row[index]!)) - Math.min(...zoomSamples.map(row => row[index]!)) <= 4),
          { zoomSamples })
        zoomTree.removeAll()
      }
    } finally {
      zoomTree.destroy()
      zoomHost.remove()
    }

    const nestedGroup = new Group()
    const nested = new Box({ x: 160, y: 140, width: 240, height: 240, filter: base.filter })
    const nestedChild = new Rect({ x: 40, y: 40, width: 140, height: 140, fill: '#e03060' })
    nested.add(nestedGroup)
    nestedGroup.add(nestedChild)
    const beforeChild = await paint(nested)
    nestedChild.fill = '#17b978'
    await frame()
    assert('nested child colour edits invalidate the feathered container',
      pixel(beforeChild, 280, 260).join() !== pixel(read(), 280, 260).join() && pixel(read(), 280, 260)[1]! > 170)
    nestedChild.visible = false
    await frame()
    assert('hiding a nested child removes it from the feathered container', pixel(read(), 280, 260)[3] === 0)
    nestedGroup.remove(nestedChild)
    nestedGroup.add(new Rect({ x: 40, y: 40, width: 140, height: 140, fill: '#2456e0' }))
    await frame()
    assert('replacing nested children refreshes the feathered container', pixel(read(), 280, 260)[2]! > 200)

    const imageURL = (color: string) => 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="' + color + '"/></svg>')
    const asynchronous = new Rect({ ...base, fill: { type: 'image', url: imageURL('#e03060'), mode: 'stretch' } })
    await paint(asynchronous)
    await new Promise<void>(resolve => leafer.waitViewCompleted(resolve))
    await frame()
    assert('an image loaded after the first feather render updates its surface', pixel(read(), 280, 260)[0]! > 200)
    asynchronous.fill = { type: 'image', url: imageURL('#17b978'), mode: 'stretch' }
    await new Promise<void>(resolve => leafer.waitViewCompleted(resolve))
    await frame()
    assert('replacing an asynchronous image invalidates its feather surface', pixel(read(), 280, 260)[1]! > 170)

    const changing = new Rect(base)
    await paint(changing)
    const manager = leafer.canvasManager as typeof leafer.canvasManager & { list: ILeaferCanvas[] }
    const pooledBefore = manager.list.length
    for (let radius = 1; radius <= 24; radius++) {
      changing.filter = [createFeatherFilter(radius)]
      await frame()
    }
    const poolGrowth = manager.list.length - pooledBefore
    assert('radius scrubbing reuses tiles instead of retaining every size', poolGrowth <= 2, { poolGrowth })

    await paint(new Rect(base))
    const exported = await leafer.export('canvas', { screenshot: true, pixelRatio: 2 })
    const exportedCanvas = exported.data as ILeaferCanvas
    assert('native 2x export succeeds', !exported.error && Boolean(exportedCanvas?.context), exported.error ? String(exported.error) : undefined)
    if (exportedCanvas?.context) {
      const exportPixels = exportedCanvas.context.getImageData(0, 0, 1200, 1040)
      const edge = pixel(exportPixels, 320, 520)[3]!
      assert('2x export preserves document-unit feather radius', edge > 115 && edge < 140 && pixel(exportPixels, 296, 520)[3]! > 20 && pixel(exportPixels, 296, 520)[3]! < 60, { edge })
      exportedCanvas.destroy()
    }
    results.push(...await runSelectionRegression(leafer))
    return results
  } finally {
    leafer.destroy()
    host.remove()
  }
}
