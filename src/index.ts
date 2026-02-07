import { defineCommand, runMain } from 'citty'
import pkg from '../package.json' with { type: 'json' }
import { splitBranchCommand } from './shell/split-branch/index.js'

const main = defineCommand({
  meta: {
    name: 'gitx',
    version: pkg.version,
    description: 'Extended Git Operations CLI',
  },
  subCommands: {
    'split-branch': splitBranchCommand,
  },
})

runMain(main)
