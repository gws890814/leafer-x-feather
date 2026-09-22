import { Leafer } from 'leafer-ui'
import { FEATHER_FILTER_TYPE, createFeatherFilter } from '../src/index.ts'
import { createDemoSamples } from './samples.ts'
import { demoStyles } from './styles.ts'
import { runFeatherRegression } from './regression.ts'

document.head.append(Object.assign(document.createElement('style'), { textContent: demoStyles }))

const stage = document.querySelector<HTMLElement>('.stage')!
const view = document.querySelector<HTMLElement>('#app')!
const enabledButton = document.querySelector<HTMLButtonElement>('#enabled')!
const addButton = document.querySelector<HTMLButtonElement>('#add-layer')!
const layersElement = document.querySelector<HTMLElement>('#layers')!
const statusElement = document.querySelector<HTMLElement>('#status')!
const countElement = document.querySelector<HTMLElement>('#layer-count')!
const jsonElement = document.querySelector<HTMLElement>('#filter-json')!
const presetButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-radii]')]

const leafer = new Leafer({ view, fill: '#f4f5f8' })
const { scene, samples, layout } = createDemoSamples()
leafer.add(scene)

let enabled = true
let radii = [24]

function filterValue() {
  return createFeatherFilter(enabled ? radii : radii.map(() => 0))
}

function updatePreview() {
  const filter = filterValue()
  samples.forEach(sample => { sample.filter = filter })
  enabledButton.classList.toggle('on', enabled)
  enabledButton.setAttribute('aria-checked', String(enabled))
  countElement.textContent = `${radii.length} 层`
  statusElement.textContent = `${samples.length} 个节点 · ${enabled ? `${radii.filter(value => value > 0).length} 层生效` : '羽化关闭'}`
  jsonElement.textContent = JSON.stringify(filter, null, 2)
  presetButtons.forEach(button => {
    const preset = button.dataset.radii!.split(',').map(Number)
    button.classList.toggle('active', JSON.stringify(preset) === JSON.stringify(radii))
  })
  statusElement.dataset.filter = FEATHER_FILTER_TYPE
  statusElement.dataset.radius = radii.join(',')
  statusElement.dataset.enabled = String(enabled)
  statusElement.dataset.roundTrip = String(samples.every(sample =>
    JSON.stringify(sample.clone().filter) === JSON.stringify(filter)))
}

function updateRadius(index: number, value: number) {
  radii[index] = Math.max(0, Math.min(250, Number.isFinite(value) ? value : 0))
  const row = layersElement.children[index]
  if (row) {
    const [range, number] = row.querySelectorAll<HTMLInputElement>('input')
    if (range) range.value = String(radii[index])
    if (number) number.value = String(radii[index])
  }
  updatePreview()
}

function renderLayers() {
  layersElement.replaceChildren()
  radii.forEach((radius, index) => {
    const row = document.createElement('div')
    row.className = 'layer-row'
    const label = Object.assign(document.createElement('span'), { className: 'layer-index', textContent: String(index + 1) })
    const range = Object.assign(document.createElement('input'), {
      type: 'range', min: '0', max: '250', step: '1', value: String(radius),
    })
    const number = Object.assign(document.createElement('input'), {
      type: 'number', min: '0', max: '250', step: '1', value: String(radius),
    })
    const unit = Object.assign(document.createElement('span'), { className: 'unit', textContent: 'px' })
    const remove = Object.assign(document.createElement('button'), {
      type: 'button', className: 'remove-layer', textContent: '×', title: `删除第 ${index + 1} 层`,
      disabled: radii.length === 1,
    })
    range.setAttribute('aria-label', `第 ${index + 1} 层半径`)
    number.setAttribute('aria-label', `第 ${index + 1} 层半径数值`)
    remove.setAttribute('aria-label', `删除第 ${index + 1} 层`)
    range.addEventListener('input', () => updateRadius(index, range.valueAsNumber))
    number.addEventListener('input', () => updateRadius(index, number.valueAsNumber))
    remove.addEventListener('click', () => {
      radii.splice(index, 1)
      renderLayers()
      updatePreview()
    })
    row.append(label, range, number, unit, remove)
    layersElement.append(row)
  })
}

function setLayers(next: number[]) {
  radii = next.length ? next.map(value => Math.max(0, Math.min(250, Number(value) || 0))) : [0]
  renderLayers()
  updatePreview()
}

enabledButton.addEventListener('click', () => { enabled = !enabled; updatePreview() })
addButton.addEventListener('click', () => {
  radii.push(radii.at(-1) ?? 24)
  renderLayers()
  updatePreview()
})
presetButtons.forEach(button => button.addEventListener('click', () =>
  setLayers(button.dataset.radii!.split(',').map(Number))))

function fitScene() {
  const bounds = view.getBoundingClientRect()
  const compact = bounds.width < 700
  const dimensions = layout(compact)
  const padding = compact ? 18 : 42
  const scale = Math.min((bounds.width - padding * 2) / dimensions.width,
    (bounds.height - padding * 2) / dimensions.height, 1)
  scene.set({ scaleX: scale, scaleY: scale,
    x: Math.max(padding, (bounds.width - dimensions.width * scale) / 2),
    y: Math.max(padding, (bounds.height - dimensions.height * scale) / 2) })
}

const resizeObserver = new ResizeObserver(fitScene)
resizeObserver.observe(stage)
window.addEventListener('pagehide', () => { resizeObserver.disconnect(); leafer.destroy() }, { once: true })

renderLayers()
updatePreview()
fitScene()

Object.assign(window, { featherDemo: {
  leafer,
  samples,
  runRegression: runFeatherRegression,
  setRadius(radius: number) { setLayers([radius, ...radii.slice(1)]) },
  setLayers,
} })
