import {
  createValidator, applyChain, parseOk, singleError, errType, errInvalid,
} from "@ctroenv/core"

function hexColor() {
  const base = createValidator<string>(
    (input, ctx) => {
      if (typeof input !== "string")
        return singleError(errType(ctx.key, typeof input, "hex color"))
      if (!/^#[0-9a-fA-F]{3,8}$/.test(input))
        return singleError(errInvalid(ctx.key, input, "not a valid hex color"))
      return parseOk(input)
    },
    { typeLabel: "hexcolor" },
  )
  return applyChain(base)
}

const env = defineEnv({
  BRAND_PRIMARY: hexColor().default("#1d4ed8"),
  BRAND_SECONDARY: hexColor().optional(),
})

function semver() {
  const base = createValidator<string>(
    (input, ctx) => {
      if (typeof input !== "string")
        return singleError(errType(ctx.key, typeof input, "semver"))
      if (!/^\d+\.\d+\.\d+$/.test(input))
        return singleError(errInvalid(ctx.key, input, "not valid semver"))
      return parseOk(input)
    },
    { typeLabel: "semver" },
  )
  return applyChain(base)
}
