// The test worker under Base's demo wrapper, with Platter's demo seed (RER_DEMO=1 in the harness bindings).
import { withDemo } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import worker from './worker'
import { seedDemo } from '../src/demo'
export default withDemo(worker, { seed: seedDemo })
