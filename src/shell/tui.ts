import {
  cancel,
  group as clackGroup,
  confirm,
  isCancel,
  multiselect,
  note,
  type Option,
  type PromptGroup,
  type PromptGroupOptions,
  select,
  text,
} from '@clack/prompts'

/**
 * TUI Wrappers using @clack/prompts
 *
 * We wrap these to ensure consistent handling of cancellation (Ctrl+C).
 */

export function handleCancel(value: unknown) {
  if (isCancel(value)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
}

// Wrapper for individual selects
export async function selectOption<T extends string>(
  message: string,
  options: Option<T>[],
): Promise<T> {
  const result = await select({
    message,
    options,
  })
  handleCancel(result)
  return result as T
}

// Wrapper for individual multiselects
export async function multiSelect<T extends string>(
  message: string,
  options: Option<T>[],
): Promise<T[]> {
  const result = await multiselect({
    message,
    options,
    required: false,
  })
  handleCancel(result)
  return result as T[]
}

// Wrapper for individual text input
export async function askText(
  message: string,
  placeholder?: string,
  validate?: (value: string | undefined) => string | Error | undefined,
): Promise<string> {
  const result = await text({
    message,
    placeholder,
    validate,
  })
  handleCancel(result)
  return result as string
}

// Wrapper for individual confirm
export async function confirmAction(message: string): Promise<boolean> {
  const result = await confirm({
    message,
  })
  handleCancel(result)
  return result as boolean
}

export function showNote(message: string, title?: string) {
  note(message, title)
}

/**
 * Validates that a string is a valid git branch name
 * (Simplified regex, can be expanded)
 */
export const isValidBranchName = (value: string): string | undefined => {
  if (!value) {
    return 'Branch name is required'
  }
  if (/[^a-zA-Z0-9-._/]/.test(value)) {
    return 'Branch name contains invalid characters'
  }
  if (value.startsWith('/') || value.endsWith('/')) {
    return 'Branch name cannot start or end with /'
  }
  if (value.includes('//')) {
    return 'Branch name cannot contain multiple slashes'
  }
  return undefined
}

/**
 * Wrapper for clack.group that provides default cancellation handling.
 * Use this for multi-step prompts to avoid repeating handleCancel.
 */
export async function group<T>(
  prompts: PromptGroup<T>,
  options?: PromptGroupOptions<T>,
): Promise<T> {
  // We need to cast the result because clack's group return type is complex (Pretty<...>)
  // and we want to return a cleaner Promise<T> for the consumer.
  return clackGroup(prompts, {
    onCancel:
      options?.onCancel ??
      (() => {
        cancel('Operation cancelled.')
        process.exit(0)
      }),
  }) as Promise<T>
}

// Export raw prompts for use within groups (they don't need handleCancel when inside group)
export const p = {
  text,
  select,
  multiselect,
  confirm,
  cancel,
  isCancel,
}
