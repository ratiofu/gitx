/**
 * Exits the current process with the given exit code.
 *
 * This function exists to make testing CLI commands easier by allowing
 * tests to mock this function rather than process.exit directly.
 */
export function exitProcessWithCode(code: number): never {
  process.exit(code)
}
