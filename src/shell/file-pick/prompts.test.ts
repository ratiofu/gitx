import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Branch, FilePickPlan, GitFile } from '../../core/models.js'
import * as tui from '../tui.js'
import {
  confirmExecution,
  promptFilesToCopy,
  promptFilesToRemove,
  promptSourceBranch,
  showPlan,
} from './prompts.js'

vi.mock('../tui.js')

describe('prompts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('promptFilesToCopy', () => {
    it('returns filtered list of files based on user selection', async () => {
      const files: GitFile[] = [
        { path: 'file1.txt', status: 'M' },
        { path: 'file2.txt', status: 'A' },
      ]
      vi.mocked(tui.multiSelect).mockResolvedValueOnce(['file1.txt'])

      const result = await promptFilesToCopy(files)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('file1.txt')
      expect(tui.multiSelect).toHaveBeenCalledWith(
        expect.stringContaining('Select files to COPY'),
        expect.any(Array),
      )
    })
  })

  describe('promptFilesToRemove', () => {
    it('returns filtered list of files to remove', async () => {
      const files: GitFile[] = [
        { path: 'file1.txt', status: 'M' },
        { path: 'file2.txt', status: 'A' },
      ]
      vi.mocked(tui.multiSelect).mockResolvedValueOnce(['file2.txt'])

      const result = await promptFilesToRemove(files)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('file2.txt')
      expect(tui.multiSelect).toHaveBeenCalledWith(
        expect.stringContaining('Select files to DELETE'),
        expect.any(Array),
      )
    })
  })

  describe('promptSourceBranch', () => {
    it('returns selected branch', async () => {
      const branches: Branch[] = [
        { name: 'feature-a', isCurrent: false },
        { name: 'feature-b', isCurrent: false },
      ]
      vi.mocked(tui.selectOption).mockResolvedValueOnce('feature-a')

      const result = await promptSourceBranch(branches)

      expect(result).toBe('feature-a')
      expect(tui.selectOption).toHaveBeenCalledWith(
        expect.stringContaining('Source branch'),
        expect.any(Array),
      )
    })
  })

  describe('showPlan', () => {
    it('displays summary with copy operations', () => {
      const plan: FilePickPlan = {
        sourceBranch: 'feature-a',
        currentBranch: 'main',
        filesToCopy: [
          { path: 'a.txt', status: 'M' },
          { path: 'b.txt', status: 'A' },
        ],
        filesToDelete: [],
      }
      showPlan(plan)

      expect(tui.showNote).toHaveBeenCalledWith(
        expect.stringContaining('Copying 2 file(s)'),
        'Review',
      )
    })

    it('displays summary with delete operations', () => {
      const plan: FilePickPlan = {
        sourceBranch: 'feature-a',
        currentBranch: 'main',
        filesToCopy: [
          { path: 'a.txt', status: 'M' },
          { path: 'b.txt', status: 'A' },
        ],
        filesToDelete: [{ path: 'a.txt', status: 'M' }],
      }
      showPlan(plan)

      expect(tui.showNote).toHaveBeenCalledWith(
        expect.stringContaining('Deleting 1 file(s)'),
        'Review',
      )
    })
  })

  describe('confirmExecution', () => {
    it('calls confirmAction', async () => {
      vi.mocked(tui.confirmAction).mockResolvedValueOnce(true)
      expect(await confirmExecution()).toBe(true)
      expect(tui.confirmAction).toHaveBeenCalledWith(
        expect.stringContaining('Proceed'),
      )
    })
  })
})
