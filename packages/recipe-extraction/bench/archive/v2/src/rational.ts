// Archive shim: the archived v2 scorer imports "../src/rational" relative to its own folder; this
// re-exports the package's live exact-arithmetic module.
export * from "../../../../src/rational";
