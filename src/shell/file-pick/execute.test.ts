import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FilePickPlan } from '../../core/models.js'
import { GitTestRig } from '../../test/git-test-rig.js'
import { executeFilePick } from './execute.js'

describe('executeFilePick', () => {
  let rig: GitTestRig

  beforeEach(async () => {
    rig = await GitTestRig.create()
  })

  afterEach(async () => {
    await rig.cleanup()
  })

  it('copies files from source as unstaged changes', async () => {
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature')
    await rig.createCommit('new-file.txt', 'feature content')
    await rig.checkout('main')

    process.chdir(rig.dir)
    const plan: FilePickPlan = {
      sourceBranch: 'feature',
      currentBranch: 'main',
      filesToCopy: [{ path: 'new-file.txt', status: 'A' }],
    }

    const result = await executeFilePick(plan)

    expect(result).toContain('Copied 1 file(s)')
    expect(await rig.fileExists('new-file.txt')).toBe(true)
    expect(await rig.getFileContent('new-file.txt')).toBe('feature content')
  })
})
