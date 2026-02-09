import { describe, expect, it } from 'vitest'
import {
  initState,
  selectFiles,
  selectSource,
  validateSource,
} from './file-pick-state.js'
import type { Branch, GitFile } from './models.js'

const branch = (name: string, isCurrent = false): Branch => ({
  name,
  isCurrent,
})

const file = (path: string, status: GitFile['status'] = 'A'): GitFile => ({
  path,
  status,
})

describe('file-pick-state', () => {
  describe('initState', () => {
    it('aborts on detached HEAD (empty currentBranch)', () => {
      const state = initState('', [branch('main')])
      expect(state.phase).toBe('aborted')
      if (state.phase === 'aborted') {
        expect(state.reason).toContain('detached HEAD')
      }
    })

    it('aborts when no other branches exist', () => {
      const state = initState('main', [branch('main', true)])
      expect(state.phase).toBe('aborted')
      if (state.phase === 'aborted') {
        expect(state.reason).toContain('No other branches')
      }
    })

    it('returns needs-source with other branches filtered', () => {
      const state = initState('main', [
        branch('main', true),
        branch('feature-a'),
      ])
      expect(state.phase).toBe('needs-source')
      if (state.phase === 'needs-source') {
        expect(state.currentBranch).toBe('main')
        expect(state.branches).toHaveLength(1)
        expect(state.branches[0].name).toBe('feature-a')
      }
    })
  })

  describe('validateSource', () => {
    const needsSource = {
      phase: 'needs-source' as const,
      currentBranch: 'main',
      branches: [branch('feature-a')],
    }

    it('returns aborted if source is the current branch', () => {
      const result = validateSource(needsSource, 'main')
      expect(result).toBeDefined()
      expect(result?.reason).toContain('cannot be the current branch')
    })

    it('returns aborted if source branch does not exist', () => {
      const result = validateSource(needsSource, 'non-existent')
      expect(result).toBeDefined()
      expect(result?.reason).toContain("'non-existent' does not exist")
    })

    it('returns undefined for a valid source branch', () => {
      const result = validateSource(needsSource, 'feature-a')
      expect(result).toBeUndefined()
    })
  })

  describe('selectSource', () => {
    const needsSource = {
      phase: 'needs-source' as const,
      currentBranch: 'main',
      branches: [branch('feature-a')],
    }

    it('aborts if no candidate files', () => {
      const state = selectSource(needsSource, 'feature-a', [])
      expect(state.phase).toBe('aborted')
      if (state.phase === 'aborted') {
        expect(state.reason).toContain('No copyable files found')
      }
    })

    it('aborts if all candidates are deleted', () => {
      const state = selectSource(needsSource, 'feature-a', [
        file('gone.txt', 'D'),
      ])
      expect(state.phase).toBe('aborted')
      if (state.phase === 'aborted') {
        expect(state.reason).toContain('No copyable files found')
      }
    })

    it('filters out deleted files from candidates', () => {
      const candidates = [file('a.txt', 'A'), file('gone.txt', 'D')]
      const state = selectSource(needsSource, 'feature-a', candidates)
      expect(state.phase).toBe('needs-file-selection')
      if (state.phase === 'needs-file-selection') {
        expect(state.candidates).toEqual([file('a.txt', 'A')])
      }
    })

    it('transitions to needs-file-selection', () => {
      const candidates = [file('a.txt')]
      const state = selectSource(needsSource, 'feature-a', candidates)
      expect(state.phase).toBe('needs-file-selection')
      if (state.phase === 'needs-file-selection') {
        expect(state.sourceBranch).toBe('feature-a')
        expect(state.candidates).toEqual(candidates)
      }
    })
  })

  describe('selectFiles', () => {
    const needsFiles = {
      phase: 'needs-file-selection' as const,
      currentBranch: 'main',
      sourceBranch: 'feature-a',
      candidates: [file('a.txt'), file('b.txt')],
    }

    it('aborts if no files selected', () => {
      const state = selectFiles(needsFiles, [])
      expect(state.phase).toBe('aborted')
      if (state.phase === 'aborted') {
        expect(state.reason).toContain('No files selected')
      }
    })

    it('transitions to plan-ready', () => {
      const selected = [file('a.txt')]
      const state = selectFiles(needsFiles, selected)
      expect(state.phase).toBe('plan-ready')
      if (state.phase === 'plan-ready') {
        expect(state.plan.filesToCopy).toEqual(selected)
      }
    })
  })
})
