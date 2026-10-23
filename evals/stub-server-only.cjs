// Lets eval scripts import server modules outside Next (the "server-only" guard throws in plain Node).
/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require("module")
// ESM imports bypass Module._load. Register the same guard stub for them.
Module.register("./server-only-loader.mjs", require("node:url").pathToFileURL(__filename))
const load = Module._load
Module._load = function (request, ...rest) {
  return request === "server-only" ? {} : load.call(this, request, ...rest)
}
