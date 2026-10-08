#!/usr/bin/env bash
# Mutation checks — see tests/mutation/run.mjs for the classification rules.
exec node "$(dirname "$0")/run.mjs" "$@"
