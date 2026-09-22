import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const packageRoot = resolve(import.meta.dirname, '..')

test('published runtime is independent from Studio, Vue and Editor', async () => {
  const source = await readFile(resolve(packageRoot, 'dist/index.js'), 'utf8')
  assert.doesNotMatch(source, /@choo\/leafer-x-studio-displays|leafer-editor|from\s*["']vue["']/)
  assert.match(source, /leafer-x-feather/)
})

test('package metadata exposes only the public runtime surface', async () => {
  const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'))

  assert.equal(packageJson.license, 'MIT')
  assert.equal(packageJson.publishConfig.access, 'public')
  assert.deepEqual(packageJson.exports['./package.json'], './package.json')
  assert.deepEqual(packageJson.files, [
    'dist', 'types', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE',
  ])
  assert.equal(packageJson.files.includes('src'), false)
  assert.deepEqual(packageJson.sideEffects, [
    './dist/index.js', './dist/index.cjs', './dist/feather.global.js',
  ])
})

test('generated declarations expose installation and filter helpers', async () => {
  const declaration = await readFile(resolve(packageRoot, 'types/index.d.ts'), 'utf8')
  assert.match(declaration, /export \* from '\.\/install\.ts'/)
  assert.match(declaration, /export \* from '\.\/types\.ts'/)
})

test('the package builds without monorepo-only imports', async () => {
  const buildScript = await readFile(resolve(packageRoot, 'build.mjs'), 'utf8')
  assert.doesNotMatch(buildScript, /\.\.\/\.\.\//)
})

test('built ESM and CommonJS entry points expose the public API', async () => {
  const esm = await import(resolve(packageRoot, 'dist/index.js'))
  const cjs = createRequire(import.meta.url)(resolve(packageRoot, 'dist/index.cjs'))

  for (const entry of [esm, cjs]) {
    assert.equal(typeof entry.installFeather, 'function')
    assert.equal(typeof entry.createFeatherFilter, 'function')
    assert.deepEqual(entry.createFeatherFilter([24, 12]), {
      type: 'feather', radius: [24, 12],
    })
  }
})
