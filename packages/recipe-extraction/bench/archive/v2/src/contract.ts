// Archive shim: the archived v2 scorer (bench/archive/v2/bench/*.ts, byte-identical copies) imports
// "../src/contract" relative to its own folder; this re-exports the package's live contract module.
export * from "../../../../src/contract";
