import { build } from 'vite'
import { fileURLToPath } from 'node:url'
import { isAbsolute } from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))
const externalizeDependencies = id => !id.startsWith('\0') && !id.startsWith('.') && !isAbsolute(id)

await build({ configFile: false, root, publicDir: false, build: {
  lib: {
    entry: `${root}src/index.ts`,
    name: 'LeaferX.feather',
    formats: ['es', 'cjs', 'iife'],
    fileName: format => format === 'es' ? 'index.js' : format === 'cjs' ? 'index.cjs' : 'feather.global.js',
  },
  rollupOptions: {
    external: externalizeDependencies,
    output: { globals: { '@leafer-in/filter': 'LeaferUI', '@leafer-ui/core': 'LeaferUI' } },
  },
} })
