'use strict';

import ELK = require('elkjs');
import onml = require('onml');

import { FlatModule } from './FlatModule';
import Yosys from './YosysModel';
import Skin from './Skin';
import { ElkModel, buildElkGraph } from './elkGraph';
import drawModule from './drawModule';

const elk = new ELK();

type ICallback = (error: Error | null, result?: string) => void;

/**
 * After ELK layout, align nodes within the same layer so connected ports
 * share the same perpendicular coordinate. This prevents visual kinks when
 * nodes of different sizes are in the same layer.
 *
 * For DOWN direction: layers are horizontal rows, so we align the y-coordinate
 * of ports within a layer.
 */
function alignPortsInLayers(graph: ElkModel.Graph, direction: string): void {
    if (direction !== 'DOWN') {
        return;
    }
    const children = graph.children;
    if (!children || children.length < 2) return;

    // Helper: extract node ID from edge source/target
    function getEdgeNodeIds(edge: ElkModel.Edge | ElkModel.ExtendedEdge): { sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string } | null {
        const ext = edge as ElkModel.ExtendedEdge;
        const simple = edge as ElkModel.Edge;
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
    const layers: ElkModel.Cell[][] = [];
    let currentLayer: ElkModel.Cell[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const prevY = sorted[i - 1].y || 0;
        const currY = sorted[i].y || 0;
        if (currY - prevY < 15) {
            currentLayer.push(sorted[i]);
        } else {
            layers.push(currentLayer);
            currentLayer = [sorted[i]];
        }
    }
    layers.push(currentLayer);

    // For each layer with multiple nodes, align ports
    for (const layer of layers) {
        if (layer.length < 2) continue;
        const nodeIds = new Set(layer.map(c => c.id));

        // Collect all port absolute y positions for edges touching this layer
        const portYs: number[] = [];
        for (const edge of graph.edges) {
            const ids = getEdgeNodeIds(edge);
            if (!ids) continue;
            const sections = (edge as ElkModel.Edge).sections;
            if (!sections || sections.length === 0) continue;
            if (nodeIds.has(ids.sourceNodeId)) {
                portYs.push(sections[0].startPoint.y);
            }
            if (nodeIds.has(ids.targetNodeId)) {
                portYs.push(sections[0].endPoint.y);
            }
        }
        if (portYs.length === 0) continue;

        // Median y is the alignment target
        portYs.sort((a, b) => a - b);
        const targetY = portYs[Math.floor(portYs.length / 2)];

        // For each node, find its connected port and compute the shift
        for (const node of layer) {
            if (node.y === undefined) continue;

            // Find which port connects to an inter-layer edge
            let connPort: ElkModel.Port | null = null;
            for (const edge of graph.edges) {
                const ids = getEdgeNodeIds(edge);
                if (!ids) continue;
                let portId: string | null = null;
                if (ids.sourceNodeId === node.id) portId = ids.sourcePortId;
                else if (ids.targetNodeId === node.id) portId = ids.targetPortId;
                if (portId) {
                    connPort = node.ports.find(p => p.id === portId) || null;
                    if (connPort) break;
                }
            }
            if (!connPort || connPort.y === undefined) continue;

            const currentAbsY = node.y + connPort.y;
            const shift = targetY - currentAbsY;
            if (shift === 0) continue;

            // Shift the node
            node.y += shift;

            // Update all edge section endpoints that reference this node's ports
            for (const edge of graph.edges) {
                const ids = getEdgeNodeIds(edge);
                if (!ids) continue;
                const sections = (edge as ElkModel.Edge).sections;
                if (!sections) continue;
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

function createFlatModule(skinData: string, yosysNetlist: Yosys.Netlist): FlatModule {
    Skin.skin = onml.p(skinData);
    const layoutProps = Skin.getProperties();
    const flatModule = new FlatModule(yosysNetlist);
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

export function dumpLayout(skinData: string, yosysNetlist: Yosys.Netlist, prelayout: boolean, done: ICallback) {
    const flatModule = createFlatModule(skinData, yosysNetlist);
    const kgraph: ElkModel.Graph = buildElkGraph(flatModule);
    if (prelayout) {
        done(null, JSON.stringify(kgraph, null, 2));
        return;
    }
    const layoutProps = Skin.getProperties();
    const promise = elk.layout(kgraph, { layoutOptions: layoutProps.layoutEngine });
    promise.then((graph: ElkModel.Graph) => {
        const dir = (layoutProps.layoutEngine as ElkModel.LayoutOptions)['org.eclipse.elk.direction'] || 'RIGHT';
        alignPortsInLayers(graph, String(dir));
        done(null, JSON.stringify(graph, null, 2));
    }).catch((reason) => {
        done(reason instanceof Error ? reason : new Error(String(reason)));
    });
}

export function render(skinData: string, yosysNetlist: Yosys.Netlist, done?: ICallback, elkData?: ElkModel.Graph) {
    const flatModule = createFlatModule(skinData, yosysNetlist);
    const kgraph: ElkModel.Graph = buildElkGraph(flatModule);
    const layoutProps = Skin.getProperties();

    let promise: Promise<string | void>;
    // if we already have a layout then use it
    if (elkData) {
        promise = new Promise<string>((resolve) => {
            const result = drawModule(elkData, flatModule);
            resolve(result);
        });
    } else {
        // otherwise use ELK to generate the layout
        promise = elk.layout(kgraph, { layoutOptions: layoutProps.layoutEngine })
            .then((g: ElkModel.Graph) => {
                const dir = (layoutProps.layoutEngine as ElkModel.LayoutOptions)['org.eclipse.elk.direction'] || 'RIGHT';
                alignPortsInLayers(g, String(dir));
                return drawModule(g, flatModule);
            });
    }

    // support legacy callback style
    if (typeof done === 'function') {
        promise.then((output) => {
            done(null, output as string);
            return output;
        }).catch((reason) => {
            done(reason instanceof Error ? reason : new Error(String(reason)));
        });
    }
    return promise;
}
