# Phase 6: New Validators (Corrected)

**Branch:** `phase/06-validators`
**Target tag:** `v1.8.0`
**Packages affected:** `core`

---

## Deep Review Results

Research conducted against: envalid v8, Zod v4, convict v6, common .env patterns, existing ctroenv architecture.

### Changes from Original Plan

| Item | Original | Corrected | Rationale |
|------|----------|-----------|-----------|
| `semver()` | Accepts ranges (>=, ~, ^) | Strict semver only, no ranges | Ranges are for dependency specs, not env vars |
| `ip()` | Basic | URL-constructor IPv6 validation | Cross-runtime safe, no Node-specific APIs |
| `uuid()` | v4/v5 only | v1-v8 + nil UUID + GUID permissive | Follows Zod v4's RFC 9562 approach |
| `hostname()` | Not in plan | **ADD** as string refinement | Envalid's `host()` equivalent, very common pattern |
| `json()` | Not in plan | **SKIP** | Transformer not validator, type system complexity |
| Size limit | 5.5 KB | **Bump to 6.5 KB** | New validators add ~1.45 KB gzip |

---

## 6.1 semver()

A semver version validator — accepts strict version strings only (no range operators).

```ts
semver(): SemverValidator
```

**Accepts:** `1.2.3`, `1.2.3-alpha`, `1.2.3-alpha.1`, `1.2.3+build.1`, `1.2.3-alpha.1+build.1`
**Rejects:** `>=1.0.0`, `~1.2.0`, `^1.0.0`, `v1.2.3`, `1.2`, `1`

**Implementation:** Pure regex per semver spec. No dependencies.

**Files:**
- `packages/core/src/validators/semver.ts` — new

---

## 6.2 ip()

IP address validator supporting IPv4, IPv6, or both.

```ts
ip(): IpValidator                              // IPv4 or IPv6
ip({ version: "4" }): IpValidator              // IPv4 only
ip({ version: "6" }): IpValidator              // IPv6 only
// Convenience aliases:
ipv4(): IpValidator                            // same as ip({ version: "4" })
ipv6(): IpValidator                            // same as ip({ version: "6" })
```

**IPv4:** Regex-based decimal-dotted quad validation.
**IPv6:** URL constructor approach (`new URL("http://[addr]")`) — works cross-runtime (Deno, Bun, Workers, Node). No zone IDs (not useful in env vars).

**Edge cases:** IPv4-mapped IPv6 (`::ffff:192.0.2.1`), compressed (`::1`), leading zeros. Zone IDs rejected.

**Files:**
- `packages/core/src/validators/ip.ts` — new

---

## 6.3 uuid()

UUID validator supporting versions 1-8 with optional version filtering, plus a permissive GUID variant.

```ts
uuid(): UuidValidator                                // any version 1-8
uuid({ version: "4" }): UuidValidator                // v4 only
uuid({ version: "7" }): UuidValidator                // v7 only (time-ordered)
guid(): UuidValidator                                // permissive: any 8-4-4-4-12 hex
```

**UUID regex:** RFC 9562/4122 compliant — validates variant bits (10xx) in position 19. Nil UUID (`00000000-...`) accepted.
**GUID:** Any 8-4-4-4-12 hex pattern without variant bit checking.

**Files:**
- `packages/core/src/validators/uuid.ts` — new

---

## 6.4 hostname() string refinement

Add `.hostname()` method to `StringValidator` — validates RFC 952/1123 hostnames.

```ts
string().hostname()  // e.g., "localhost", "api.example.com", "my-service.internal"
```

**Validation rules:**
- Total length ≤ 253 characters
- Each label: 1-63 characters, alphanumeric start/end, only alphanumeric + hyphens
- FQDN trailing dot allowed (`example.com.`)
- Single-label hostnames allowed (`localhost`, `my-service`)

**Files:**
- `packages/core/src/validators/string.ts` — add `.hostname()` method

---

## Verification

```bash
npx vitest run packages/core
npx tsc --noEmit -p packages/core/tsconfig.json
npx @biomejs/biome check packages/core/src
cd packages/core && npx size-limit
```
