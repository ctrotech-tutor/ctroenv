# Error Codes Reference

## CtroEnvError

Thrown by `defineEnv()` when validation fails.

```ts
class CtroEnvError extends Error {
  readonly errors: ValidationError[]
}
```

## ValidationError Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Env variable name |
| `message` | `string` | Human-readable error message |
| `code` | `ErrorCode` | Machine-readable code |
| `value` | `unknown` | Raw value (masked with "********" for secret keys) |
| `suggestion` | `string \| undefined` | Fix hint |

## Error Codes

| Code | Meaning | Factory | When |
|------|---------|---------|------|
| `missing_required` | Required variable not found in source | `errMissing(key)` | `.optional()` not set and no `.default()` and not in source |
| `type_mismatch` | Wrong JavaScript type | `errType(key, received, expected)` | Non-string for string validator, non-number for number, etc. |
| `invalid_value` | Refinement/regex/pick check failed | `errInvalid(key, value, msg)` | `.url()`, `.email()`, `.min()`, `.port()`, `.positive()`, `.regex()`, pick, etc. |
| `validation_failed` | Custom `.validate(fn)` returned error | — | `.validate(fn)` returns error result |


## Usage

```ts
import { CtroEnvError, formatErrors } from "@ctroenv/core"

try {
  const env = defineEnv(schema, { source })
} catch (e) {
  if (e instanceof CtroEnvError) {
    console.error(formatErrors(e.errors))
    // Grouped by code type, color-coded:
    //   ✖ missing_required (2)
    //     • DATABASE_URL
    //     • JWT_SECRET
    //   ✖ invalid_value (1)
    //     • PORT: "abc" is not a valid port number
  }
}
```

## formatErrors() display

- Groups by error code
- Colors: red keys, bold headings, dim values
- Respects `NO_COLOR`, `CI`, `TERM=dumb` env vars
- Secret values always show "********"
