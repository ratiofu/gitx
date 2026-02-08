import { defineCommand, runMain } from 'citty'
import pkg from '../package.json' with { type: 'json' }
import { filePickCommand, fpCommandAlias } from './shell/file-pick/index.js'

const main = defineCommand({
  meta: {
    name: 'gitx',
    version: pkg.version,
    description: 'Extended Git Operations CLI',
  },
  subCommands: {
    'file-pick': filePickCommand,
    fp: fpCommandAlias,
  },
})

runMain(main)
