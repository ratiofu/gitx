import { describe, expect, it } from 'vitest'
import { computeSplitOperations, resolveSplitContext } from './logic.js'
import type { GitFile } from './models.js'

describe('computeSplitOperations', () => {
  const mockFile = (
    path: string,
    status: GitFile['status'] = 'M',
  ): GitFile => ({
    path,
    status,
  })

  const options = {
    sourceBranch: 'main',
    newBranch: 'feature-new',
  }

  it('generates copy operations for selected files', () => {
    const files = [mockFile('file1.txt'), mockFile('file2.txt')]
    const { operations } = computeSplitOperations(files, [], options)

    expect(operations).toHaveLength(2)
    expect(operations[0]).toMatchObject({
      type: 'copy',
      file: files[0],
      sourceBranch: 'main',
      destinationBranch: 'feature-new',
    })
    expect(operations[1]).toMatchObject({
      type: 'copy',
      file: files[1],
    })
  })

  it('generates remove-source operations for files marked for removal', () => {
    const files = [mockFile('file1.txt')]
    const { operations } = computeSplitOperations(files, files, options)

    expect(operations).toHaveLength(2)
    expect(operations[0].type).toBe('copy')
    expect(operations[1].type).toBe('remove-source')
    expect(operations[1].file).toEqual(files[0])
  })

  it('warns and skips removal if file is NOT copied', () => {
    // Edge case: Remove a file that wasn't copied
    const copy = [mockFile('keep.txt')]
    const remove = [mockFile('delete.txt')]

    const { operations, warnings } = computeSplitOperations(
      copy,
      remove,
      options,
    )

    // Should have 1 copy op, 0 remove ops
    expect(operations).toHaveLength(1)
    expect(operations[0].file.path).toBe('keep.txt')
    expect(operations[0].type).toBe('copy')

    // Should have warning
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Cannot remove "delete.txt"')
  })
})

describe('resolveSplitContext', () => {
  const current = 'main'

  it('defaults source to current branch', () => {
    const result = resolveSplitContext({}, current)
    expect(result.sourceBranch).toBe(current)
    expect(result.currentBranchIsSource).toBe(true)
  })

  it('uses provided source branch', () => {
    const result = resolveSplitContext({ source: 'feature' }, current)
    expect(result.sourceBranch).toBe('feature')
    expect(result.currentBranchIsSource).toBe(false)
  })

  it('leaves destination empty if source is current (requires prompt)', () => {
    const result = resolveSplitContext({}, current)
    expect(result.destinationBranch).toBe('')
  })

  it('defaults destination to current if source is different', () => {
    const result = resolveSplitContext({ source: 'feature' }, current)
    expect(result.destinationBranch).toBe(current)
  })

  it('uses provided destination branch', () => {
    const result = resolveSplitContext({ destination: 'feature-2' }, current)
    expect(result.destinationBranch).toBe('feature-2')
  })

  it('handles both source and destination provided', () => {
    const result = resolveSplitContext(
      { source: 'feat-a', destination: 'feat-b' },
      current,
    )
    expect(result.sourceBranch).toBe('feat-a')
    expect(result.destinationBranch).toBe('feat-b')
    expect(result.currentBranchIsSource).toBe(false)
  })
})
