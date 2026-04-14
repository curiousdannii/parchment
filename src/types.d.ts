// Types for Emglken modules

type EmglkenEngineConstructor = (opts: {wasmBinary: Uint8Array<ArrayBuffer>}) => Promise<EmglkenEngine>

interface EmglkenEngine {
    start(opts: EmglkenEngineOptions): void
}

interface EmglkenEngineOptions {
    arguments: string[],
}

declare module 'emglken/build/bocfel-noz6.js' {
    const Bocfel: EmglkenEngineConstructor
    export default Bocfel
}

declare module 'emglken/build/glulxe.js' {
    const Glulxe: EmglkenEngineConstructor
    export default Glulxe
}