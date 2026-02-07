import { describe, expect, it } from 'vitest'
import { parseBranchList, parseDiffNameStatus } from './git-parsing.js'

describe('git-parsing', () => {
  describe('parseDiffNameStatus', () => {
    it('should parse M and A status', () => {
      const output = 'M\tfile1.txt\nA\tfile2.txt'
      const result = parseDiffNameStatus(output)
      expect(result).toEqual([
        { status: 'M', path: 'file1.txt' },
        { status: 'A', path: 'file2.txt' },
      ])
    })

    it('should return empty array for empty input', () => {
      expect(parseDiffNameStatus('')).toEqual([])
      expect(parseDiffNameStatus('   ')).toEqual([])
    })

    it('should parse renames and copies', () => {
      // R100 old.txt new.txt
      const output = 'R100\told.txt\tnew.txt\nC100\tsrc.txt\tdest.txt'
      const result = parseDiffNameStatus(output)
      expect(result).toEqual([
        { status: 'R', path: 'new.txt', originalPath: 'old.txt' },
        { status: 'C', path: 'dest.txt', originalPath: 'src.txt' },
      ])
    })
  })

  describe('parseBranchList', () => {
    it('should parse custom format', () => {
      const output =
        'main||sha1|2023-01-01T00:00:00Z\nfeature|*|sha2|2023-01-02T00:00:00Z'
      const result = parseBranchList(output)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('main')
      expect(result[0].isCurrent).toBe(false)
      expect(result[1].name).toBe('feature')
      expect(result[1].isCurrent).toBe(true)
    })

    it('should return empty array for empty input', () => {
      expect(parseBranchList('')).toEqual([])
      expect(parseBranchList('   ')).toEqual([])
    })
  })
})
