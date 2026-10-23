export function resolve(specifier, context, nextResolve) {
  return specifier === "server-only"
    ? { url: "data:text/javascript,export {};", shortCircuit: true }
    : nextResolve(specifier, context)
}
