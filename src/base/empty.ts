import { readOnly } from './read-only.js'

const EMPTY_ARRAY = readOnly([])
export function emptyArray<T>() {
  return EMPTY_ARRAY as readonly T[]
}

/* for potential future use:

const EMPTY_SET = readOnly(new Set([]))
export function emptySet<T>() {
  return EMPTY_SET as ReadonlySet<T>
}

const EMPTY_MAP = readOnly(new Map([]))
export function emptyMap<K, V>() {
  return EMPTY_MAP as ReadonlyMap<K, V>
}

*/
