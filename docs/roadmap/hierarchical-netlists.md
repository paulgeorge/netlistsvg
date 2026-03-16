# Hierarchical Netlists

**Priority**: HIGH — most requested feature (issue #64, PR #92)

## What It Does

Renders nested/hierarchical module schematics from Yosys JSON netlists. Instead of showing submodules as opaque boxes, it expands them inline to show their internal circuitry. Submodules are rendered with colored backgrounds to visually distinguish hierarchy levels.

## PR #92 Approach (by djwubs, May 2020)

### Configuration File

A new `--config` CLI option accepts a JSON config file (`lib/config.json` as default):

```json
{
  "hierarchy": {
    "enable": "off",          // "off" | "all" | "level" | "modules"
    "expandLevel": 0,         // max depth for "level" mode
    "expandModules": {
      "types": [],            // expand by module type
      "ids": []               // expand by instance name
    },
    "colour": ["#e9e9e9"]    // background colors per depth level
  },
  "top": {
    "enable": false,
    "module": ""              // override top module selection
  }
}
```

### Implementation Summary

- New `ConfigModel.ts` — types and loading for the config file
- `FlatModule.ts` — modified to recursively flatten submodules based on config, tracking hierarchy depth
- `Cell.ts` / `Port.ts` — extended to carry hierarchy context (parent module, depth level)
- `elkGraph.ts` — builds nested ELK compound graphs with child nodes for expanded submodules
- `drawModule.ts` — renders nested SVG groups with colored background rectangles per depth
- `Skin.ts` — generic node template reused for submodule boxes
- `index.ts` — threads config through the render pipeline, adds `--config` CLI arg
- `YosysModel.ts` — minor type additions for multi-module netlists
- `default.svg` — white fill added to components so hierarchy background doesn't bleed through

### Additional Changes in PR #92

- Wires to splits/joins forced horizontal
- Split inputs and join outputs centered on component height
- Updated README with skin file docs, Yosys usage guide, config file docs

## Why It Couldn't Be Merged Directly

1. **Scale**: ~4500 lines across 33 files — touches nearly every core file
2. **Conflicts**: Does not apply cleanly to current master. Conflicts in README.md, Cell.ts, FlatModule.ts, drawModule.ts, elkGraph.ts, YosysModel.ts, default.svg, and more
3. **Pre-modernization**: Written against the pre-modernization codebase (lodash still present, older dependency versions)
4. **Built files**: Includes compiled JS in `built/` which would conflict with any other changes
5. **Minor issues**: Typo in README ("This hould work"), bundled non-hierarchy changes

## Key Files That Would Need Changes

| File | Changes Needed |
|------|---------------|
| `lib/index.ts` | Accept config param, thread through render pipeline |
| `lib/FlatModule.ts` | Recursive module flattening with depth tracking |
| `lib/Cell.ts` | Hierarchy context (parent, depth) on cells |
| `lib/elkGraph.ts` | Nested ELK compound node graphs |
| `lib/drawModule.ts` | Nested SVG group rendering with background colors |
| `lib/Skin.ts` | Generic node as submodule template |
| `lib/YosysModel.ts` | Multi-module netlist types |
| `bin/netlistsvg.js` | `--config` CLI option |
| New: `lib/ConfigModel.ts` | Config types and loader |
| New: `lib/config.json` | Default config file |

## Implementation Plan

1. **Add config system**: Create `ConfigModel.ts` with types and default config. Add `--config` CLI flag. Thread config through `render()`.
2. **Extend Yosys model**: Update `YosysModel.ts` to handle multi-module netlists (already partially there).
3. **Recursive flattening**: Modify `FlatModule.ts` to recursively process submodules when config enables hierarchy. Track depth per cell.
4. **Nested ELK layout**: Extend `elkGraph.ts` to build compound nodes for expanded submodules using ELK's hierarchical layout support.
5. **Nested SVG rendering**: Update `drawModule.ts` to render nested SVG groups with colored backgrounds.
6. **Skin updates**: Add white fill to `default.svg` components. Ensure generic template works as submodule container.
7. **Tests**: Add hierarchy test cases with multi-module netlists.
8. **Docs**: Update README with config file documentation.

Steps 1-2 can be done independently. Steps 3-5 are the core work and should be done together. Steps 6-8 are polish.
