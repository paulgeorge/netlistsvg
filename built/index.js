'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumpLayout = dumpLayout;
exports.render = render;
const ELK = require("elkjs");
const onml = require("onml");
const FlatModule_1 = require("./FlatModule");
const Skin_1 = __importDefault(require("./Skin"));
const elkGraph_1 = require("./elkGraph");
const drawModule_1 = __importDefault(require("./drawModule"));
const elk = new ELK();
/**
 * After ELK layout, align nodes within the same layer so connected ports
 * share the same perpendicular coordinate. This prevents visual kinks when
 * nodes of different sizes are in the same layer.
 *
 * For DOWN direction: layers are horizontal rows, so we align the y-coordinate
 * of ports within a layer.
 */
function alignPortsInLayers(graph, direction) {
    if (direction !== 'DOWN') {
        return;
    }
    const children = graph.children;
    if (!children || children.length < 2)
        return;
    // Helper: extract node ID from edge source/target
    function getEdgeNodeIds(edge) {
        const ext = edge;
        const simple = edge;
        if (ext.sources && ext.targets) {
            return {
                sourceNodeId: ext.sources[0].split('.')[0],
                sourcePortId: ext.sources[0],
                targetNodeId: ext.targets[0].split('.')[0],
                targetPortId: ext.targets[0],
            };
        }
        if (simple.source && simple.target) {
            return {
                sourceNodeId: simple.source,
                sourcePortId: simple.sourcePort,
                targetNodeId: simple.target,
                targetPortId: simple.targetPort,
            };
        }
        return null;
    }
    // Group nodes into layers by y-proximity
    const sorted = [...children].sort((a, b) => (a.y || 0) - (b.y || 0));
    const layers = [];
    let currentLayer = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const prevY = sorted[i - 1].y || 0;
        const currY = sorted[i].y || 0;
        if (currY - prevY < 15) {
            currentLayer.push(sorted[i]);
        }
        else {
            layers.push(currentLayer);
            currentLayer = [sorted[i]];
        }
    }
    layers.push(currentLayer);
    // For each layer with multiple nodes, align ports
    for (const layer of layers) {
        if (layer.length < 2)
            continue;
        const nodeIds = new Set(layer.map(c => c.id));
        // Collect all port absolute y positions for edges touching this layer
        const portYs = [];
        for (const edge of graph.edges) {
            const ids = getEdgeNodeIds(edge);
            if (!ids)
                continue;
            const sections = edge.sections;
            if (!sections || sections.length === 0)
                continue;
            if (nodeIds.has(ids.sourceNodeId)) {
                portYs.push(sections[0].startPoint.y);
            }
            if (nodeIds.has(ids.targetNodeId)) {
                portYs.push(sections[0].endPoint.y);
            }
        }
        if (portYs.length === 0)
            continue;
        // Median y is the alignment target
        portYs.sort((a, b) => a - b);
        const targetY = portYs[Math.floor(portYs.length / 2)];
        // For each node, find its connected port and compute the shift
        for (const node of layer) {
            if (node.y === undefined)
                continue;
            // Find which port connects to an inter-layer edge
            let connPort = null;
            for (const edge of graph.edges) {
                const ids = getEdgeNodeIds(edge);
                if (!ids)
                    continue;
                let portId = null;
                if (ids.sourceNodeId === node.id)
                    portId = ids.sourcePortId;
                else if (ids.targetNodeId === node.id)
                    portId = ids.targetPortId;
                if (portId) {
                    connPort = node.ports.find(p => p.id === portId) || null;
                    if (connPort)
                        break;
                }
            }
            if (!connPort || connPort.y === undefined)
                continue;
            const currentAbsY = node.y + connPort.y;
            const shift = targetY - currentAbsY;
            if (shift === 0)
                continue;
            // Shift the node
            node.y += shift;
            // Update all edge section endpoints that reference this node's ports
            for (const edge of graph.edges) {
                const ids = getEdgeNodeIds(edge);
                if (!ids)
                    continue;
                const sections = edge.sections;
                if (!sections)
                    continue;
                for (const section of sections) {
                    if (ids.sourceNodeId === node.id) {
                        section.startPoint.y += shift;
                        // Also shift the first bend point if it shares the start y
                        if (section.bendPoints && section.bendPoints.length > 0 &&
                            section.bendPoints[0].y === section.startPoint.y - shift) {
                            section.bendPoints[0].y += shift;
                        }
                    }
                    if (ids.targetNodeId === node.id) {
                        section.endPoint.y += shift;
                        if (section.bendPoints && section.bendPoints.length > 0) {
                            const lastBend = section.bendPoints[section.bendPoints.length - 1];
                            if (lastBend.y === section.endPoint.y - shift) {
                                lastBend.y += shift;
                            }
                        }
                    }
                }
            }
        }
    }
}
function createFlatModule(skinData, yosysNetlist) {
    Skin_1.default.skin = onml.p(skinData);
    const layoutProps = Skin_1.default.getProperties();
    const flatModule = new FlatModule_1.FlatModule(yosysNetlist);
    // this can be skipped if there are no 0's or 1's
    if (layoutProps.constants !== false) {
        flatModule.addConstants();
    }
    // this can be skipped if there are no splits or joins
    if (layoutProps.splitsAndJoins !== false) {
        flatModule.addSplitsJoins();
    }
    flatModule.createWires();
    return flatModule;
}
function dumpLayout(skinData, yosysNetlist, prelayout, done) {
    const flatModule = createFlatModule(skinData, yosysNetlist);
    const kgraph = (0, elkGraph_1.buildElkGraph)(flatModule);
    if (prelayout) {
        done(null, JSON.stringify(kgraph, null, 2));
        return;
    }
    const layoutProps = Skin_1.default.getProperties();
    const promise = elk.layout(kgraph, { layoutOptions: layoutProps.layoutEngine });
    promise.then((graph) => {
        const dir = layoutProps.layoutEngine['org.eclipse.elk.direction'] || 'RIGHT';
        alignPortsInLayers(graph, String(dir));
        done(null, JSON.stringify(graph, null, 2));
    }).catch((reason) => {
        done(reason instanceof Error ? reason : new Error(String(reason)));
    });
}
function render(skinData, yosysNetlist, done, elkData) {
    const flatModule = createFlatModule(skinData, yosysNetlist);
    const kgraph = (0, elkGraph_1.buildElkGraph)(flatModule);
    const layoutProps = Skin_1.default.getProperties();
    let promise;
    // if we already have a layout then use it
    if (elkData) {
        promise = new Promise((resolve) => {
            const result = (0, drawModule_1.default)(elkData, flatModule);
            resolve(result);
        });
    }
    else {
        // otherwise use ELK to generate the layout
        promise = elk.layout(kgraph, { layoutOptions: layoutProps.layoutEngine })
            .then((g) => {
            const dir = layoutProps.layoutEngine['org.eclipse.elk.direction'] || 'RIGHT';
            alignPortsInLayers(g, String(dir));
            return (0, drawModule_1.default)(g, flatModule);
        });
    }
    // support legacy callback style
    if (typeof done === 'function') {
        promise.then((output) => {
            done(null, output);
            return output;
        }).catch((reason) => {
            done(reason instanceof Error ? reason : new Error(String(reason)));
        });
    }
    return promise;
}
