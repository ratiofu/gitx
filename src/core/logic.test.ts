import { describe, expect, it } from 'vitest'
import { computeSplitOperations } from './logic.js'
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
