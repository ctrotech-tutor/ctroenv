# Chain Order Reference

## The Rule

**Validator-specific refinements MUST come before chainable methods.**

```ts
string().url().min(1).secret().describe("URL")  // ✅ correct
string().secret().url()                          // ❌ ERROR: .url() doesn't exist
```

## Why?

Chainable methods (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`) return `Validator<T> & ChainableMethods<T>` — a generic type that does NOT include validator-specific methods.

| Method | Returns | What you lose |
|--------|---------|---------------|
| `.secret()` | `Validator & ChainableMethods` | `StringValidator` / `NumberValidator` / `PickValidator` |
| `.optional()` | `Validator & ChainableMethods` | Same |
| `.default()` | `Validator & ChainableMethods` | Same |
| `.describe()` | `Validator & ChainableMethods` | Same |
| `.validate()` | `Validator & ChainableMethods` | Same |

## Validator-specific methods affected

### string()
`.url()` `.email()` `.port()` `.min(n)` `.max(n)` `.regex(p)`

### number()
`.int()` `.port()` `.positive()` `.min(n)` `.max(n)`

## Correct Patterns

```ts
// ✅ All refinements first, then chainable
string().url().email().min(10).max(255).secret().describe("Email")
number().int().port().positive().optional()

// ✅ All refinement-only (no chainable)
string().url().email().min(10)

// ✅ All chainable-only
string().optional().default("fallback").describe("Name")
```

## Incorrect Patterns

```ts
// ❌ Refinement after secret
string().secret().min(10).url()

// ❌ Refinement after optional
string().optional().min(5)

// ❌ Refinement after default
number().default(5).port()

// ❌ Refinement after describe
string().describe("host").url()
```

## Why this design?

1. **Zero deps** - avoids complex type composition
2. **Predictable** - same chain order for all validators
3. **Simple types** - easy to extend with custom validators

If this bothers you, create a helper:
```ts
function dbUrl() { return string().url().min(10) }
defineEnv({ URL: dbUrl().secret() })
```
