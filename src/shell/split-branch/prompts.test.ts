import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Branch, GitFile, SplitOperation } from '../../core/models.js'
import * as tui from '../tui.js'
import {
  confirmExecution,
  promptDestinationBranch,
  promptFilesToCopy,
  promptFilesToRemove,
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
        { path: 'file1.txt', status: 'M' } as unknown as GitFile,
        { path: 'file2.txt', status: 'A' } as unknown as GitFile,
      ]

      vi.mocked(tui.multiSelect).mockResolvedValueOnce(['file1.txt'])

      const result = await promptFilesToCopy(files)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('file1.txt')
      expect(tui.multiSelect).toHaveBeenCalledWith(
        expect.stringContaining('Select files to MOVE'),
        expect.any(Array),
      )
    })
  })

  describe('promptFilesToRemove', () => {
    it('returns filtered list of files to remove based on user selection', async () => {
      const files: GitFile[] = [
        { path: 'file1.txt', status: 'M' } as unknown as GitFile,
        { path: 'file2.txt', status: 'A' } as unknown as GitFile,
      ]

      vi.mocked(tui.multiSelect).mockResolvedValueOnce(['file2.txt'])

      const result = await promptFilesToRemove(files)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('file2.txt')
      expect(tui.multiSelect).toHaveBeenCalledWith(
        expect.stringContaining('Select files to REMOVE'),
        expect.any(Array),
      )
    })
  })

  describe('promptDestinationBranch', () => {
    it('validates new branch name', async () => {
      const branches: Branch[] = [{ name: 'existing', isCurrent: false }]

      // Mock selectOption to return 'NEW'
      vi.mocked(tui.selectOption).mockResolvedValueOnce('NEW')

      // Mock isValidBranchName behavior
      vi.mocked(tui.isValidBranchName).mockImplementation((name) => {
        if (!name) {
          return 'Branch name is required.'
        }
        if (name.includes(' ')) {
          return 'Branch name must not contain spaces.'
        }
        return undefined
      })

      // Mock askText to capture the validation callback
      let validationCallback:
        | ((value: string | undefined) => string | Error | undefined)
        | undefined
      vi.mocked(tui.askText).mockImplementation(
        async (_msg, _initial, validate) => {
          validationCallback = validate
          return 'new-feature'
        },
      )

      const result = await promptDestinationBranch(branches)
      expect(result).toBe('new-feature')

      // Verify validation logic
      expect(validationCallback).toBeDefined()

      // Test invalid name
      expect(validationCallback?.('')).toBe('Branch name is required.')

      expect(validationCallback?.('invalid name')).toBe(
        'Branch name must not contain spaces.',
      )

      // Test existing branch
      expect(validationCallback?.('existing')).toBe('Branch already exists.')

      // Test valid name
      expect(validationCallback?.('valid-name')).toBeUndefined()
    })

    it('returns existing branch if selected', async () => {
      const branches: Branch[] = [{ name: 'existing', isCurrent: false }]
      vi.mocked(tui.selectOption).mockResolvedValueOnce('existing')

      const result = await promptDestinationBranch(branches)
      expect(result).toBe('existing')
    })
  })

  describe('showPlan', () => {
    it('displays summary with copy operations', () => {
      const ops = [
        { type: 'copy', file: { path: 'a' } },
        { type: 'copy', file: { path: 'b' } },
      ] as unknown as SplitOperation[]

      showPlan('main', 'feature', ops)

      expect(tui.showNote).toHaveBeenCalledWith(
        expect.stringContaining('Copying 2 file(s)'),
        'Review',
      )
    })

    it('displays summary with remove operations', () => {
      const ops = [
        { type: 'copy', file: { path: 'a' } },
        { type: 'remove-source', file: { path: 'a' } },
      ] as unknown as SplitOperation[]

      showPlan('main', 'feature', ops)

      expect(tui.showNote).toHaveBeenCalledWith(
        expect.stringContaining('Removing 1 file(s)'),
        'Review',
      )
    })
  })

  describe('confirmations', () => {
    it('confirmExecution calls confirmAction', async () => {
      vi.mocked(tui.confirmAction).mockResolvedValueOnce(true)
      expect(await confirmExecution()).toBe(true)
      expect(tui.confirmAction).toHaveBeenCalledWith(
        expect.stringContaining('Proceed'),
      )
    })
  })
})
