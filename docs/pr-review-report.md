# Upstream PR Review Report

Review of open PRs on [nturley/netlistsvg](https://github.com/nturley/netlistsvg).

## Applied PRs

### PR #151: Fix --layout option returning undefined
- **Status**: APPLIED
- **Type**: Bug fix
- **Change**: When pre-computed ELK layout data was provided via `--layout`, `drawModule()` result was discarded instead of being resolved through the promise chain. Fix captures and resolves the return value.
- **Risk**: Low -- small, targeted fix to promise resolution.

### PR #137: README update for Homebrew
- **Status**: APPLIED
- **Type**: Documentation
- **Change**: Adds a section to README documenting that netlistsvg is available via Homebrew on macOS and Linux.
- **Risk**: None -- documentation only.

### PR #121: Refactor FlatModule.gather from stack to heap
- **Status**: APPLIED
- **Type**: Bug fix (stack overflow prevention)
- **Change**: Converts the recursive `gather()` function in FlatModule to an iterative loop using a while loop with mutable state. This prevents stack overflow errors when processing large netlists. Also removes lodash dependency from Cell.ts and updates several other files.
- **Risk**: Medium -- changes core algorithm logic, but preserves same behavior. Applied cleanly including built files.

### PR #75: Add value to generic part
- **Status**: APPLIED
- **Type**: Feature (analog skin)
- **Change**: Adds a `value` text label to the generic analog component template, positioned below the existing `ref` label.
- **Risk**: Low -- only modifies the analog SVG skin template.

## Skipped PRs

### PR #124: Nix flake support
- **Status**: SKIPPED
- **Reason**: Adds auto-generated nix files (node2nix output) referencing `nodejs-12_x` which is long EOL. The generated `node-packages.nix` and `node-env.nix` files are large and would become stale immediately. Nix support could be revisited with a simpler flake that doesn't vendor generated nix expressions.

### PR #92: Hierarchical netlists (major feature)
- **Status**: SKIPPED
- **Reason**: Very large PR (~4500 lines) that touches nearly every file in the project. Does not apply cleanly -- conflicts in README.md, Cell.ts, FlatModule.ts, drawModule.ts, elkGraph.ts, YosysModel.ts, default.svg, and more. Contains a typo ("This hould work"). The feature (hierarchical schematic expansion with config file) is valuable but requires a dedicated effort to port forward, resolve conflicts, and validate correctness.

### PR #40: Auto orient analog components
- **Status**: SKIPPED
- **Reason**: Very old PR (pre-TypeScript conversion). Targets `lib/index.js` which no longer exists. References example files that have been removed. The approach is computationally expensive -- it tries all 2^n orientation combinations of analog components and picks the one with fewest bend points. Would need a complete rewrite to work with the current TypeScript codebase.

## Summary

| PR | Title | Decision | Applied |
|----|-------|----------|---------|
| #151 | Fix --layout option | MERGE | Yes |
| #137 | README Homebrew | MERGE | Yes |
| #121 | Gather stack-to-heap | MERGE | Yes |
| #75 | Generic value label | MERGE | Yes |
| #124 | Nix flake | SKIP | No |
| #92 | Hierarchical netlists | SKIP | No |
| #40 | Auto orient analog | SKIP | No |
