// Full (Node) entry: plugin + source. Client bundles resolve the `default`
// export condition to `./browser`, which re-exports the source only.
export { type CtroEnvPluginOptions, ctroenvPlugin } from "./plugin"
export { viteSource } from "./source"
