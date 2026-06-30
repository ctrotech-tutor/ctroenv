import type { EnvMeta } from "../types"

export function createMeta(values: Record<string, unknown>): EnvMeta {
  const meta: EnvMeta = {
    get(key: string): string | undefined {
      const v = values[key]
      return v !== undefined ? String(v) : undefined
    },
    has(key: string): boolean {
      return key in values
    },
    keys(): string[] {
      return Object.keys(values)
    },
    toJSON(): Record<string, string | undefined> {
      const result: Record<string, string | undefined> = {}
      for (const [k, v] of Object.entries(values)) {
        result[k] = v !== undefined ? String(v) : undefined
      }
      return result
    },
  }
  return meta
}

export interface ExtraMethod {
  (): void
  name: string
}

export function createMaskedEnv(
  values: Record<string, unknown>,
  secretKeys: Set<string>,
  defaultMask: string,
  configurableMask?: string,
  extraMethods?: Record<string, ExtraMethod>,
): Record<string, unknown> & { meta: EnvMeta } {
  const meta = createMeta(values)

  function maskFor(key: string | symbol): string {
    if (typeof key !== "string") return defaultMask
    return secretKeys.has(key) ? (configurableMask ?? defaultMask) : defaultMask
  }

  function ownKeys(): (string | symbol)[] {
    const keys: (string | symbol)[] = [...Reflect.ownKeys(values), "meta"]
    if (extraMethods) {
      for (const name of Object.keys(extraMethods)) {
        if (!keys.includes(name)) keys.push(name)
      }
    }
    return keys
  }

  const proxy = new Proxy(values, {
    get(_target, key, _receiver) {
      if (key === "meta") return meta
      if (extraMethods && key in extraMethods) return extraMethods[key as string]
      if (key === Symbol.for("nodejs.util.inspect.custom")) {
        return (_depth: number, _opts: unknown) => {
          const obj: Record<string, unknown> = {}
          for (const k of ownKeys()) {
            if (k === "meta" || k === Symbol.for("nodejs.util.inspect.custom")) continue
            if (extraMethods && typeof k === "string" && k in extraMethods) {
              obj[k] = extraMethods[k]
              continue
            }
            if (typeof k === "string" && secretKeys.has(k)) {
              obj[k] = maskFor(k)
            } else if (typeof k === "string") {
              obj[k] = Reflect.get(values, k)
            }
          }
          return obj
        }
      }
      if (typeof key === "string" && secretKeys.has(key)) return maskFor(key)
      return Reflect.get(values, key)
    },
    has(_target, key) {
      if (key === "meta") return true
      if (extraMethods && key in extraMethods) return true
      return Reflect.has(values, key)
    },
    ownKeys() {
      return ownKeys()
    },
    getOwnPropertyDescriptor(_target, key) {
      if (key === "meta" || (extraMethods && key in extraMethods)) {
        return {
          configurable: true,
          enumerable: false,
          writable: false,
          value: key === "meta" ? meta : extraMethods?.[key as string],
        }
      }
      const desc = Reflect.getOwnPropertyDescriptor(values, key)
      if (desc && typeof key === "string" && secretKeys.has(key)) {
        return { ...desc, value: maskFor(key) }
      }
      return desc
    },
    set() {
      throw new TypeError("Cannot assign to read-only property")
    },
    deleteProperty() {
      throw new TypeError("Cannot delete property of frozen object")
    },
  })

  return proxy as Record<string, unknown> & { meta: EnvMeta }
}
