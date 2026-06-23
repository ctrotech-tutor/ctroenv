export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const stride = n + 1
  const dp: number[] = new Array((m + 1) * stride).fill(0)

  for (let i = 0; i <= m; i++) dp[i * stride] = i
  for (let j = 0; j <= n; j++) dp[j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i * stride + j] = Math.min(
        dp[(i - 1) * stride + j]! + 1,
        dp[i * stride + j - 1]! + 1,
        dp[(i - 1) * stride + j - 1]! + cost,
      )
    }
  }

  return dp[m * stride + n]!
}

export function suggestKey(
  unknownKey: string,
  knownKeys: string[],
  maxDistance = 2,
): string | null {
  let best: string | null = null
  let bestDist = Infinity

  for (const known of knownKeys) {
    const dist = levenshtein(unknownKey, known)
    if (dist < bestDist && dist <= maxDistance) {
      bestDist = dist
      best = known
    }
  }

  return best
}
