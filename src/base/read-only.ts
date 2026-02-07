type SpecificReadonly<T> = T extends (infer U)[]
  ? readonly U[]
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<K, V>
    : T extends Set<infer U>
      ? ReadonlySet<U>
      : Readonly<T>

export function readOnly<T>(value: T) {
  return Object.freeze(value) as SpecificReadonly<T>
}
