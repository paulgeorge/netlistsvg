# netlistsvg

Draws SVG schematics from Yosys JSON netlists. Uses ELK (Eclipse Layout Kernel) via elkjs for graph layout and an SVG skin system for visual theming.

## Build & Test

```bash
npm install          # install dependencies
npx tsc              # compile TypeScript to built/
npm test             # compile + lint + run jest tests + integration tests
npm run lint         # eslint on lib/**/*.ts and bin/**/*.js
```

## Project Structure

- `lib/` - TypeScript source (compiled to `built/`)
  - `index.ts` - main entry point, render() function
  - `FlatModule.ts` - flattens Yosys netlist into renderable module
  - `Cell.ts` - cell model (ports, connections, layout)
  - `elkGraph.ts` - builds ELK graph from flat module
  - `drawModule.ts` - renders ELK layout result to SVG
  - `Skin.ts` - SVG skin loading and component lookup
  - `YosysModel.ts` - Yosys JSON type definitions
  - `Port.ts` - port model
  - `default.svg` / `analog.svg` - built-in skin files
- `built/` - compiled JS output (checked in)
- `bin/` - CLI entry points (`netlistsvg.js`, `exportLayout.js`)
- `test/` - jest unit tests and integration test runner
- `demo/` - browser demo
- `examples/` - sample netlists (digital + analog)

## Conventions

- TypeScript strict mode
- Conventional commits (`feat:`, `fix:`, `docs:`, etc.), first line under 72 chars
- No lodash - use native JS/TS equivalents
- No Claude attribution in commits
