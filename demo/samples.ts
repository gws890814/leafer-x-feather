import { Arrow } from '@leafer-in/arrow'
import { Group, Image as LeaferImage, Line, Path, Rect, Text, type UI } from 'leafer-ui'

export const DEMO_SCENE = {
  wide: { width: 1060, height: 620 },
  compact: { width: 620, height: 850 },
}

const LEAFER_IMAGE_URL = new URL('leafer.jpg', document.baseURI).href
const gradient = { type: 'linear' as const, from: 'left' as const, to: 'right' as const,
  stops: ['#6557df', '#e46675', '#f4be55'] }
const shadow = [{ x: 8, y: 11, blur: 20, color: '#1f243340', box: false }]

export function createDemoSamples() {
  const scene = new Group()
  const samples: UI[] = []
  const entries: Group[] = []
  const add = (label: string, node: UI) => {
    const entry = new Group()
    entry.add(new Text({ text: label, fill: '#535b6b', fontSize: 14, fontWeight: 600 }))
    entry.add(node)
    scene.add(entry)
    entries.push(entry)
    samples.push(node)
  }

  add('渐变 + 描边 + 阴影', new Rect({ y: 31, width: 250, height: 170,
    cornerRadius: [34, 8, 34, 8], fill: gradient, stroke: '#fff', strokeWidth: 8, shadow }))
  add('镂空路径', new Path({ y: 31, path: 'M0 0H250V180H0ZM65 46V134H185V46Z',
    windingRule: 'evenodd', fill: '#6fc49d', stroke: '#252938', strokeWidth: 8 }))
  add('箭头', new Arrow({ y: 109, width: 230, stroke: '#e66470', strokeWidth: 22,
    strokeCap: 'round', startArrow: 'none', endArrow: 'angle' }))

  add('原生图片', new LeaferImage({ y: 31, width: 250, height: 170,
    url: LEAFER_IMAGE_URL, cornerRadius: 24 }))
  add('粗线条', new Line({ y: 121, width: 250, stroke: gradient, strokeWidth: 30,
    strokeCap: 'round' }))
  add('自由路径', new Path({ y: 61,
    path: 'M0 112C34 0 84 186 137 58C177 -20 211 150 258 20', stroke: gradient,
    strokeWidth: 25, strokeCap: 'round', fill: undefined }))

  const layout = (compact: boolean) => {
    const columns = compact ? [35, 335] : [55, 405, 760]
    const rows = compact ? [35, 310, 585] : [42, 332]
    entries.forEach((entry, index) => entry.set({
      x: columns[index % columns.length],
      y: rows[Math.floor(index / columns.length)],
    }))
    return compact ? DEMO_SCENE.compact : DEMO_SCENE.wide
  }

  layout(false)
  return { scene, samples, layout }
}
