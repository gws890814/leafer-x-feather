export * from './types.ts'
export * from './render.ts'
export * from './install.ts'

import { installFeather } from './install.ts'

// Serialized native filters render immediately after importing this package.
installFeather()
