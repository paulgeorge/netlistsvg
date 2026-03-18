# ELK Strategy Research for netlistsvg

Research into ELK's algorithm/strategy system, sub-strategies within the Layered algorithm, and what an "electronics schematic" preset would look like.

## 1. All Available ELK Algorithms

ELK provides ~15 layout algorithms. Only a subset are available in elkjs (the JS port used by netlistsvg). The Graphviz wrappers and libavoid require native binaries and are NOT available in elkjs.

### Available in elkjs

| Algorithm | ID | Purpose | Use When |
|---|---|---|---|
| **Layered** | `org.eclipse.elk.layered` | Hierarchical layout for directed graphs. Assigns nodes to layers, minimizes crossings, routes edges orthogonally. Based on Sugiyama framework. | Directed flow graphs, dataflow diagrams, **circuit schematics**, any graph with clear input→output flow. **This is our algorithm.** |
| **Force** | `org.eclipse.elk.force` | Force-directed layout simulating physical forces (Eades or Fruchterman-Reingold models). Nodes repel, edges attract. | Undirected graphs, social networks, organic-looking layouts. Not suitable for schematics (no directional flow). |
| **Stress** | `org.eclipse.elk.stress` | Stress minimization — tries to make Euclidean distances match graph-theoretic distances. Allows per-edge length control. | Graphs where distance = relationship strength. Better than Force for proportional layouts. Not suitable for schematics. |
| **Mr. Tree** | `org.eclipse.elk.mrtree` | Tree layout — computes spanning tree and arranges by parent-child hierarchy. | Pure tree structures, file system trees, org charts. Not for circuits (which have cycles/convergence). |
| **Box** | `org.eclipse.elk.box` | Packs nodes into compact rectangular arrangement. | Flat collections of elements, icon grids. No edge routing. |
| **Radial** | `org.eclipse.elk.radial` | Circular/radial arrangement around a center node. | Star topologies, dependency visualization from a root. Not for schematics. |
| **Rectpacking** | `org.eclipse.elk.rectpacking` | Rectangle packing optimization. | Space-efficient packing of rectangular elements. No edge routing. |
| **Fixed** | `org.eclipse.elk.fixed` | Preserves existing node positions, only routes edges. | When positions are already known (manual layout). |
| **Random** | `org.eclipse.elk.random` | Random placement. | Testing/debugging only. |
| **DisCo** | `org.eclipse.elk.disco` | Handles disconnected graph components by compacting their individual layouts together. | Post-processing for graphs with multiple disconnected subgraphs. |
| **SPOrE** | `org.eclipse.elk.sporeCompaction` / `org.eclipse.elk.sporeOverlap` | Overlap removal and compaction. | Post-processing to remove overlaps. |

### Not available in elkjs (require native binaries)

- Graphviz Dot, Neato, Circo, FDP, Twopi
- Libavoid (obstacle avoidance routing)

### Conclusion

**The Layered algorithm is the only viable choice for circuit schematics.** It's the only algorithm that provides: directional flow (left→right or top→down), layer assignment, crossing minimization, and orthogonal edge routing — all essential for readable schematics.

## 2. Layered Algorithm Sub-Strategies (Complete Catalog)

The ELK Layered algorithm runs in phases. Each phase has a configurable strategy.

### Phase 1: Cycle Breaking

**Option:** `org.eclipse.elk.layered.cycleBreaking.strategy`
**Default:** `GREEDY`

| Value | Description |
|---|---|
| `GREEDY` | Standard greedy cycle breaking. Reverses edges to eliminate cycles, minimizing reversed edges. **Best default for schematics.** |
| `DEPTH_FIRST` | DFS-based cycle detection. |
| `INTERACTIVE` | Preserves user-specified edge directions. |
| `MODEL_ORDER` | Respects input model ordering when breaking cycles. |
| `GREEDY_MODEL_ORDER` | Greedy + model order hybrid. |
| `SCC_CONNECTIVITY` | Strongly-connected-component based, using connectivity. |
| `SCC_NODE_TYPE` | SCC-based, using node type classification. |
| `DFS_NODE_ORDER` | DFS respecting node order. |
| `BFS_NODE_ORDER` | BFS respecting node order. |

**Recommendation for schematics:** `GREEDY` (default). Feedback loops in circuits are rare enough that the default handles them well.

### Phase 2: Layering (Layer Assignment)

**Option:** `org.eclipse.elk.layered.layering.strategy`
**Default:** `NETWORK_SIMPLEX`

| Value | Status | Description |
|---|---|---|
| `NETWORK_SIMPLEX` | Default | Minimizes total edge length across layers. Produces compact layouts. Good for digital circuits. |
| `LONGEST_PATH` | Stable | Places each node in the earliest possible layer based on longest path from sources. Spreads nodes out more. **Currently used for digital skin.** |
| `LONGEST_PATH_SOURCE` | Stable | Variant of LONGEST_PATH oriented from sources. |
| `COFFMAN_GRAHAM` | Advanced | Bounded-width layering — limits nodes per layer. Useful for very wide circuits. |
| `INTERACTIVE` | Advanced | Preserves user-specified layer assignments. |
| `STRETCH_WIDTH` | Experimental | Distributes nodes to even out layer widths. |
| `MIN_WIDTH` | Experimental | Minimizes diagram width. |
| `BF_MODEL_ORDER` | Experimental | Breadth-first, respecting model order. |
| `DF_MODEL_ORDER` | Experimental | Depth-first, respecting model order. |

**Related per-node options:**
- `org.eclipse.elk.layered.layering.layerConstraint`: `NONE`, `FIRST`, `FIRST_SEPARATE`, `LAST`, `LAST_SEPARATE`
  - `FIRST_SEPARATE`/`LAST_SEPARATE` create dedicated layers (used for VCC/GND power rails)
- `org.eclipse.elk.layered.layering.layerChoiceConstraint`: Force a node to a specific layer index
- `org.eclipse.elk.layered.layering.layerId`: Explicit layer ID assignment

**Recommendation for schematics:**
- Digital: `LONGEST_PATH` — spreads logic gates across layers, making signal flow clearer
- Analog: `NETWORK_SIMPLEX` — minimizes total wire length, keeps compact vertical layouts

### Phase 3: Crossing Minimization

**Option:** `org.eclipse.elk.layered.crossingMinimization.strategy`
**Default:** `LAYER_SWEEP`

| Value | Description |
|---|---|
| `LAYER_SWEEP` | Iterative layer-by-layer sweep using barycenter heuristic. The standard approach. |
| `MEDIAN_LAYER_SWEEP` | Variant using median positions instead of barycenter. |
| `INTERACTIVE` | Preserves user-specified node ordering within layers. |
| `NONE` | No crossing minimization. |

**Related options:**
- `greedySwitch.type`: `OFF`, `ONE_SIDED`, `TWO_SIDED` — post-sweep local optimization
- `greedySwitch.activationThreshold`: Node count threshold for activation (default 40)
- `forceNodeModelOrder`: `true`/`false` — force input model ordering
- `semiInteractive`: `true`/`false` — partial interactive mode
- `hierarchicalSweepiness`: 0.0-1.0 — influence of hierarchy on sweeping
- `inLayerPredOf`/`inLayerSuccOf`: Per-node constraints for within-layer ordering
- `positionChoiceConstraint`/`positionId`: Per-node position constraints

**Recommendation for schematics:** `LAYER_SWEEP` with `greedySwitch.type=TWO_SIDED`. This is what we already use — it's the best general approach for minimizing wire crossings.

### Phase 4: Node Placement

**Option:** `org.eclipse.elk.layered.nodePlacement.strategy`
**Default:** `BRANDES_KOEPF`

| Value | Description |
|---|---|
| `BRANDES_KOEPF` | Runs 4 alignment passes (up-left, up-right, down-left, down-right) and can average or pick best. Has port-alignment-within-blocks logic. Fast. |
| `NETWORK_SIMPLEX` | Optimizes global edge length using network simplex. Produces compact layouts. Supports `nodeFlexibility` per node. |
| `LINEAR_SEGMENTS` | Groups nodes into linear segments and places segments. Has `deflectionDampening` parameter. |
| `SIMPLE` | Basic placement without optimization. |
| `INTERACTIVE` | Preserves existing y-coordinates. |

**BK-specific options:**
- `bk.edgeStraightening`: `NONE`, `IMPROVE_STRAIGHTNESS`
- `bk.fixedAlignment`: `NONE`, `LEFTUP`, `RIGHTUP`, `LEFTDOWN`, `RIGHTDOWN`, `BALANCED`

**NS-specific options:**
- `networkSimplex.nodeFlexibility`: Per-node flexibility override
- `networkSimplex.nodeFlexibility.default`: `NONE`, `NODE_SIZE` (default: `NONE`)

**General options:**
- `favorStraightEdges`: `true`/`false` — prioritize straight edges over balanced placement

**Recommendation for schematics:**
- Digital: `NETWORK_SIMPLEX` with `favorStraightEdges=true` — minimizes total wire length, keeps signal paths straight
- Analog: `NETWORK_SIMPLEX` with `favorStraightEdges=true` — same reasoning. BK was tested but caused VIN positioning regression (61px drop) that's worse than the 10px cosmetic kink NS produces.

### Phase 5: Edge Routing

**Option:** `org.eclipse.elk.edgeRouting`
**Default:** `UNDEFINED` (algorithm-dependent)

| Value | Description |
|---|---|
| `UNDEFINED` | Let the algorithm choose. |
| `POLYLINE` | Straight line segments with bends. |
| `ORTHOGONAL` | Only horizontal and vertical segments (right angles). **Standard for schematics.** |
| `SPLINES` | Smooth curves (cubic splines). |

**Spline-specific options:**
- `splines.mode`: `CONSERVATIVE`, `SLOPPY` (default: `SLOPPY`)
- `splines.sloppy.layerSpacingFactor`: 0.0-1.0 (default: `0.2`)

**Polyline-specific options:**
- `polyline.slopedEdgeZoneWidth`: width of sloped zones (default: `2.0`)

**Self-loop options:**
- `selfLoopDistribution`: `NORTH`, `EQUALLY`
- `selfLoopOrdering`: `STACKED`, `SEQUENCED`

**Recommendation for schematics:** `ORTHOGONAL`. This is non-negotiable for circuit schematics — wires must be horizontal/vertical with right-angle bends.

### Phase 6: Compaction (Post-Processing)

**Option:** `org.eclipse.elk.layered.compaction.postCompaction.strategy`
**Default:** `NONE`

| Value | Description |
|---|---|
| `NONE` | No compaction. Preserves node placement phase results exactly. |
| `LEFT` | Compact toward left. |
| `RIGHT` | Compact toward right. |
| `LEFT_RIGHT_CONSTRAINT_LOCKING` | Bidirectional with constraint locking. |
| `LEFT_RIGHT_CONNECTION_LOCKING` | Bidirectional with connection locking. |
| `EDGE_LENGTH` | Compact to minimize total edge length. |

**Related options:**
- `connectedComponents`: `true`/`false` — compact connected components
- `postCompaction.constraints`: `SCANLINE`, `QUADRATIC`

**WARNING:** Post-compaction can BREAK alignment guarantees from the node placement phase. When using BRANDES_KOEPF, compaction must be `NONE` or it will destroy within-layer alignment. With NETWORK_SIMPLEX, `EDGE_LENGTH` can help but may shift power rails out of alignment.

**Recommendation for schematics:**
- Digital: `NONE` — preserve NS placement results
- Analog: `EDGE_LENGTH` — helps compact vertical analog layouts. BUT must be tested carefully with power rail constraints.

### Other Phases / Options

**Graph Wrapping:** `org.eclipse.elk.layered.wrapping.strategy`
- `OFF` (default), `SINGLE_EDGE`, `MULTI_EDGE`
- Wraps long graphs into multiple rows. Not useful for schematics.

**Layer Unzipping:** `org.eclipse.elk.layered.layerUnzipping.strategy`
- `NONE` (default)
- Experimental feature for splitting layers. Not useful for schematics.

**Model Order:** `org.eclipse.elk.layered.considerModelOrder.strategy`
- `NONE`, `NODES_AND_EDGES`, `PREFER_EDGES`, `PREFER_NODES`
- Controls how much the original JSON ordering influences layout.
- `NODES_AND_EDGES` can help preserve intended component ordering in analog circuits.

## 3. Does an Electronics/Schematic Strategy Exist?

**No.** ELK has no built-in layout algorithm or strategy specifically designed for electronic schematics, circuit diagrams, or PCB layouts. ELK is a general-purpose graph layout framework originating from the Eclipse IDE ecosystem (primarily for software engineering diagrams like class diagrams, state machines, and dataflow graphs).

The closest match is the **Layered algorithm**, which was designed for Sugiyama-style hierarchical layouts. This works well for schematics because:
- Circuits have directional signal flow (input → output)
- Components naturally form layers (input ports → logic/components → output ports)
- Orthogonal edge routing matches schematic wire conventions

However, ELK has no awareness of:
- Power rail semantics (VCC should be at top, GND at bottom)
- Component types (resistor, capacitor, transistor orientation)
- Schematic conventions (signal flow direction, bus grouping)
- Analog vs digital layout differences

**All of this domain knowledge must be encoded in netlistsvg's code** — which is exactly what we do with layer constraints for power rails, skin-based component templates, and direction settings.

## 4. Creating a Custom Strategy

### Can you create custom algorithm configurations in elkjs?

**No preset/profile mechanism exists.** elkjs does not support named configuration bundles or "strategy presets." Every ELK option must be passed individually as a layout option on the graph, node, or edge.

The practical approach (which netlistsvg already uses) is:
1. **Graph-level options** in the skin SVG `<s:layoutEngine>` element
2. **Per-node options** in `Cell.ts:buildElkChild()` (e.g., layer constraints for power rails)
3. **Per-edge options** in `elkGraph.ts:route()` (e.g., priority, thickness)

This IS our "custom strategy" — a well-tuned set of options applied at the right granularity.

### Can you write custom layout algorithms for elkjs?

**Not practically.** ELK's extension mechanism uses Java-based Eclipse plug-ins with `.melk` metadata files. This requires:
1. Eclipse Plugin Development Environment
2. ELK Metadata Language (`.melk`) files
3. Java implementation of `AbstractLayoutProvider`
4. Compilation and bundling

elkjs is a GWT-compiled JavaScript port of the Java ELK. You cannot inject custom Java processors into the compiled JS bundle. To extend elkjs, you would need to:
1. Fork the ELK Java source
2. Add your algorithm/processor in Java
3. Recompile with GWT to produce a new elkjs bundle

This is not a practical path for netlistsvg.

### What IS practical?

The approach we're already taking:
1. **Skin-level presets** — each skin file (`default.svg`, `analog.svg`) contains a `<s:layoutEngine>` element that serves as the "strategy preset" for that domain
2. **Code-level per-node constraints** — `Cell.ts` applies domain-specific constraints (power rail layer assignment) based on component type
3. **Code-level per-edge options** — `elkGraph.ts` sets priority and thickness per edge

This three-tier approach is the correct architecture. We just need to tune the options.

## 5. Proposed "Electronics Schematic" Presets

### Base Algorithm

**`org.eclipse.elk.layered`** — confirmed as the only viable choice (see Section 1).

### Digital Schematic Preset (left → right)

For combinational/sequential logic circuits with clear input→output signal flow.

```xml
<s:layoutEngine
    org.eclipse.elk.layered.layering.strategy="LONGEST_PATH"
    org.eclipse.elk.layered.nodePlacement.strategy="NETWORK_SIMPLEX"
    org.eclipse.elk.layered.nodePlacement.favorStraightEdges="true"
    org.eclipse.elk.layered.crossingMinimization.strategy="LAYER_SWEEP"
    org.eclipse.elk.layered.crossingMinimization.greedySwitch.type="TWO_SIDED"
    org.eclipse.elk.edgeRouting="ORTHOGONAL"
    org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers="35"
    org.eclipse.elk.spacing.nodeNode="35"
    org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers="10"
    org.eclipse.elk.spacing.edgeEdge="8"
/>
```

**Rationale:**
- `LONGEST_PATH` layering: spreads gates across layers for clear signal flow visualization
- `NETWORK_SIMPLEX` placement: minimizes total wire length, keeps signal paths compact
- `favorStraightEdges`: prioritizes straight wires over balanced vertical centering
- `LAYER_SWEEP` + `TWO_SIDED` greedy switch: strong crossing minimization
- `ORTHOGONAL` routing: required for schematic wire conventions
- Spacing: 35px between nodes (enough room for labels), 8px between parallel wires

**This matches our current `default.svg` — no changes needed.**

### Analog Schematic Preset (top → down)

For analog circuits with power rails, passive components, and transistors.

```xml
<s:layoutEngine
    org.eclipse.elk.direction="DOWN"
    org.eclipse.elk.layered.layering.strategy="NETWORK_SIMPLEX"
    org.eclipse.elk.layered.nodePlacement.strategy="NETWORK_SIMPLEX"
    org.eclipse.elk.layered.nodePlacement.favorStraightEdges="true"
    org.eclipse.elk.layered.crossingMinimization.strategy="LAYER_SWEEP"
    org.eclipse.elk.layered.crossingMinimization.greedySwitch.type="TWO_SIDED"
    org.eclipse.elk.layered.compaction.postCompaction.strategy="EDGE_LENGTH"
    org.eclipse.elk.layered.considerModelOrder.strategy="NODES_AND_EDGES"
    org.eclipse.elk.edgeRouting="ORTHOGONAL"
    org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers="20"
    org.eclipse.elk.spacing.nodeNode="35"
    org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers="10"
    org.eclipse.elk.spacing.edgeEdge="8"
/>
```

**Rationale:**
- `direction=DOWN`: analog circuits flow top-to-bottom (VCC→components→GND)
- `NETWORK_SIMPLEX` layering: compact layer assignment, works well with power rail constraints
- `NETWORK_SIMPLEX` placement: best overall results for analog. BK was tested and rejected due to 61px VIN regression (see Section 5.1 below)
- `EDGE_LENGTH` compaction: helps compact vertical layouts. Safe with NS placement.
- `NODES_AND_EDGES` model order: respects JSON ordering for component placement
- Tighter between-layer spacing (20px vs 35px): analog components are often small (symbols)

**This matches our current `analog.svg` — no changes needed.**

### Per-Node Constraints (in Cell.ts)

Applied programmatically based on component type:

| Component Type | Constraint | Purpose |
|---|---|---|
| `vcc`, `vee` | `layerConstraint=FIRST_SEPARATE`, `nodeFlexibility=NONE` | Force all VCC/VEE to top-most dedicated layer, prevent vertical drift |
| `gnd` | `layerConstraint=LAST_SEPARATE`, `nodeFlexibility=NONE` | Force all GND to bottom-most dedicated layer, prevent vertical drift |
| All nodes | `portConstraints=FIXED_POS` | Ports stay at skin-defined positions (critical for component symbols) |

**These are already implemented in `Cell.ts` lines 211-221.**

### Per-Edge Options (in elkGraph.ts)

| Edge Type | Option | Purpose |
|---|---|---|
| Non-DFF edges | `priority.direction=10` | Higher priority for main signal edges |
| Bus edges | `edge.thickness` scaled by width | Visual width for multi-bit buses |

### 5.1 Why BRANDES_KOEPF Was Rejected for Analog

BK was tested (commit 8976f77) to fix a 10px port stagger between R1 and VOUT in the audio filter schematic. Results:

| Metric | NETWORK_SIMPLEX | BRANDES_KOEPF |
|---|---|---|
| R1↔VOUT port stagger | 10px (cosmetic kink) | ~4px (improved) |
| VIN y-position | y=22 (aligned with R1) | y=83 (61px below R1) |
| Signal flow clarity | Good (VIN→R1→VOUT horizontal) | Poor (VIN drops below signal path) |

The 10px cosmetic kink is acceptable. The 61px VIN displacement is a structural regression that misrepresents circuit signal flow.

## 6. Options NOT Currently Used But Worth Knowing

These options could be useful for future edge cases:

| Option | Value | Use Case |
|---|---|---|
| `layered.thoroughness` | 1-100 (default 7) | Increase for complex circuits with many crossings |
| `layered.priority.straightness` | 0+ per edge | Per-edge straightness priority (could fix specific kinks) |
| `layered.priority.shortness` | 0+ per edge | Per-edge shortness priority |
| `layered.mergeEdges` | true/false | Merge parallel edges (could help bus routing) |
| `layered.highDegreeNodes.treatment` | true/false | Special handling for high-fanout nodes |
| `portAlignment.default` | JUSTIFIED/BEGIN/CENTER/END | Port alignment within node side |
| `layered.layering.layerChoiceConstraint` | integer | Force specific nodes to specific layers |
| `layered.crossingMinimization.inLayerPredOf` | node ID | Force within-layer ordering constraints |
| `layered.wrapping.strategy` | SINGLE_EDGE/MULTI_EDGE | Wrap very wide circuits into rows |

## 7. Summary

1. **ELK Layered is the correct and only viable algorithm** for circuit schematics in elkjs.
2. **No electronics-specific strategy exists** in ELK — domain knowledge must be encoded in netlistsvg.
3. **Custom elkjs algorithms are not practical** — the correct approach is well-tuned options at graph/node/edge levels.
4. **Our current configuration is already close to optimal:**
   - Digital preset: `default.svg` with LONGEST_PATH + NETWORK_SIMPLEX placement
   - Analog preset: `analog.svg` with DOWN direction + NETWORK_SIMPLEX + EDGE_LENGTH compaction
   - Per-node: Power rail layer constraints in `Cell.ts`
   - Per-edge: Priority and thickness in `elkGraph.ts`
5. **Future improvements** should focus on per-node and per-edge options rather than changing global strategies, which have too many side effects.
