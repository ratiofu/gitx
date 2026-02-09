import * as clack from '@clack/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tui from './tui.js'

type Clack = typeof import('@clack/prompts')

// Mock entire clack module
vi.mock('@clack/prompts', async () =>
  (await import('vitest-mock-extended')).mockDeep<Clack>(),
)

describe('TUI Wrappers', () => {
  beforeEach(() => {
    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(
      () => ({}) as unknown as never,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleCancel', () => {
    it('exits process if value is cancel symbol', () => {
      vi.mocked(clack.isCancel).mockReturnValue(true)
      tui.handleCancel('some-symbol')
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(clack.cancel).toHaveBeenCalled()
    })

    it('does nothing if value is not cancel symbol', () => {
      vi.mocked(clack.isCancel).mockReturnValue(false)
      tui.handleCancel('valid-input')
      expect(process.exit).not.toHaveBeenCalled()
    })
  })

  describe('Wrappers', () => {
    it('selectOption calls clack.select and checks cancel', async () => {
      vi.mocked(clack.select).mockResolvedValue('value')
      vi.mocked(clack.isCancel).mockReturnValue(false)

      const res = await tui.selectOption('msg', [{ value: 'a', label: 'A' }])

      expect(clack.select).toHaveBeenCalledWith({
        message: 'msg',
        options: [{ value: 'a', label: 'A' }],
      })
      expect(res).toBe('value')
    })

    it('askText calls clack.text', async () => {
      vi.mocked(clack.text).mockResolvedValue('input')
      vi.mocked(clack.isCancel).mockReturnValue(false)

      await tui.askText('msg')
      expect(clack.text).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'msg' }),
      )
    })

    it('confirmAction calls clack.confirm', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(true)
      vi.mocked(clack.isCancel).mockReturnValue(false)

      await tui.confirmAction('msg')
      expect(clack.confirm).toHaveBeenCalledWith({ message: 'msg' })
    })

    it('multiSelect calls clack.multiselect', async () => {
      vi.mocked(clack.multiselect).mockResolvedValue(['a', 'b'])
      vi.mocked(clack.isCancel).mockReturnValue(false)

      const res = await tui.multiSelect('msg', [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ])

      expect(clack.multiselect).toHaveBeenCalledWith({
        message: 'msg',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        required: false,
      })
      expect(res).toEqual(['a', 'b'])
    })

    it('showNote calls clack.note', () => {
      tui.showNote('msg', 'title')
      expect(clack.note).toHaveBeenCalledWith('msg', 'title')
    })
  })

  describe('group wrapper', () => {
    it('calls clack.group with onCancel handler', async () => {
      // Return empty object as "results"
      vi.mocked(clack.group).mockResolvedValue({} as never)

      await tui.group({})

      expect(clack.group).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          onCancel: expect.any(Function),
        }),
      )
    })

    it('default onCancel exits process', async () => {
      vi.mocked(clack.group).mockResolvedValue({} as never)
      await tui.group({})

      const onCancel = vi.mocked(clack.group).mock.calls[0][1]?.onCancel
      expect(onCancel).toBeDefined()
      if (onCancel) {
        onCancel({ results: {} })
        expect(process.exit).toHaveBeenCalledWith(0)
        expect(clack.cancel).toHaveBeenCalled()
      }
    })

    it('uses provided onCancel if given', async () => {
      const customCancel = vi.fn()
      await tui.group({}, { onCancel: customCancel })

      expect(clack.group).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          onCancel: customCancel,
        }),
      )
    })
  })

  describe('isValidBranchName', () => {
    it('validates correct names', () => {
      expect(tui.isValidBranchName('feature/foo')).toBeUndefined()
      expect(tui.isValidBranchName('main')).toBeUndefined()
      expect(tui.isValidBranchName('v1.0')).toBeUndefined()
    })

    it('rejects invalid names', () => {
      expect(tui.isValidBranchName('')).toMatch(/required/)
      expect(tui.isValidBranchName('foo bar')).toMatch(/invalid characters/)
      expect(tui.isValidBranchName('/foo')).toMatch(/start or end/)
      expect(tui.isValidBranchName('foo//bar')).toMatch(/multiple slashes/)
    })
  })
})
