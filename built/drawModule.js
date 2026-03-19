"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = drawModule;
exports.removeDummyEdges = removeDummyEdges;
const elkGraph_1 = require("./elkGraph");
const Skin_1 = __importDefault(require("./Skin"));
const onml = require("onml");
var WireDirection;
(function (WireDirection) {
    WireDirection[WireDirection["Up"] = 0] = "Up";
    WireDirection[WireDirection["Down"] = 1] = "Down";
    WireDirection[WireDirection["Left"] = 2] = "Left";
    WireDirection[WireDirection["Right"] = 3] = "Right";
})(WireDirection || (WireDirection = {}));
function drawModule(g, module) {
    const nodes = module.nodes.map((n) => {
        const kchild = g.children.find((c) => c.id === n.Key);
        return n.render(kchild);
    });
    removeDummyEdges(g);
    // Deduplicate junction points across all edges — snap to 2px grid
    // to catch near-miss duplicates (e.g. 112,182 vs 113,182)
    const seenJunctionsGlobal = new Set();
    const snapJunction = (v) => Math.floor(v / 3);
    let lines = g.edges.flatMap((e) => {
        const netId = elkGraph_1.ElkModel.wireNameLookup[e.id];
        if (!netId)
            return [];
        const numWires = netId.split(',').length - 2;
        const lineStyle = 'stroke-width: ' + (numWires > 1 ? 2 : 1);
        const netName = 'net_' + netId.slice(1, netId.length - 1) + ' width_' + numWires;
        return (e.sections || []).flatMap((s) => {
            let startPoint = s.startPoint;
            s.bendPoints = s.bendPoints || [];
            const bends = s.bendPoints.flatMap((b) => {
                // Skip zero-length segments
                if (startPoint.x === b.x && startPoint.y === b.y) {
                    startPoint = b;
                    return [];
                }
                const l = ['line', {
                        x1: startPoint.x,
                        x2: b.x,
                        y1: startPoint.y,
                        y2: b.y,
                        class: netName,
                        style: lineStyle,
                    }];
                startPoint = b;
                return [l];
            });
            if (e.junctionPoints) {
                const circles = e.junctionPoints.flatMap((j) => {
                    const key = snapJunction(j.x) + ',' + snapJunction(j.y);
                    if (seenJunctionsGlobal.has(key))
                        return [];
                    seenJunctionsGlobal.add(key);
                    return [['circle', {
                                cx: j.x,
                                cy: j.y,
                                r: (numWires > 1 ? 3 : 2),
                                style: 'fill:#000',
                                class: netName,
                            }]];
                });
                bends.push(...circles);
            }
            // Skip zero-length final segment
            if (startPoint.x === s.endPoint.x && startPoint.y === s.endPoint.y) {
                return bends;
            }
            const line = [['line', {
                        x1: startPoint.x,
                        x2: s.endPoint.x,
                        y1: startPoint.y,
                        y2: s.endPoint.y,
                        class: netName,
                        style: lineStyle,
                    }]];
            return bends.concat(line);
        });
    });
    let labels;
    for (const e of g.edges) {
        const netId = elkGraph_1.ElkModel.wireNameLookup[e.id];
        if (!netId)
            continue;
        const numWires = netId.split(',').length - 2;
        const netName = 'net_' + netId.slice(1, netId.length - 1) +
            ' width_' + numWires +
            ' busLabel_' + numWires;
        const eLabels = e.labels;
        if (eLabels !== undefined &&
            eLabels[0] !== undefined &&
            eLabels[0].text !== undefined) {
            const label = [
                ['rect',
                    {
                        x: eLabels[0].x + 1,
                        y: eLabels[0].y - 1,
                        width: (eLabels[0].text.length + 2) * 6 - 2,
                        height: 9,
                        class: netName,
                        style: 'fill: white; stroke: none',
                    },
                ], ['text',
                    {
                        x: eLabels[0].x,
                        y: eLabels[0].y + 7,
                        class: netName,
                    },
                    '/' + eLabels[0].text + '/',
                ],
            ];
            if (labels !== undefined) {
                labels = labels.concat(label);
            }
            else {
                labels = label;
            }
        }
    }
    if (labels !== undefined && labels.length > 0) {
        lines = lines.concat(labels);
    }
    const svgAttrs = Skin_1.default.skin[1];
    svgAttrs.width = g.width.toString();
    svgAttrs.height = g.height.toString();
    const styles = ['style', {}, ''];
    onml.t(Skin_1.default.skin, {
        enter: (node) => {
            if (node.name === 'style') {
                styles[2] += node.full[2];
            }
        },
    });
    const elements = [styles, ...nodes, ...lines];
    const ret = ['svg', svgAttrs, ...elements];
    return onml.s(ret);
}
function findBendNearDummy(net, dummyIsSource, dummyLoc) {
    const candidates = net.map((edge) => {
        const bends = edge.sections[0].bendPoints || [null];
        if (dummyIsSource) {
            return bends[0];
        }
        else {
            return bends[bends.length - 1];
        }
    }).filter((p) => p !== null);
    return candidates.reduce((min, pt) => {
        const minDist = Math.abs(dummyLoc.x - min.x) + Math.abs(dummyLoc.y - min.y);
        const ptDist = Math.abs(dummyLoc.x - pt.x) + Math.abs(dummyLoc.y - pt.y);
        return ptDist < minDist ? pt : min;
    });
}
function removeDummyEdges(g) {
    // go through each edge group for each dummy
    let dummyNum = 0;
    // loop until we can't find an edge group or we hit 10,000
    while (dummyNum < 10000) {
        const dummyId = '$d_' + String(dummyNum);
        // find all edges connected to this dummy
        const edgeGroup = g.edges.filter((e) => {
            return e.source === dummyId || e.target === dummyId;
        });
        if (edgeGroup.length === 0) {
            break;
        }
        let dummyIsSource;
        let dummyLoc;
        const firstEdge = edgeGroup[0];
        if (firstEdge.source === dummyId) {
            dummyIsSource = true;
            dummyLoc = firstEdge.sections[0].startPoint;
        }
        else {
            dummyIsSource = false;
            dummyLoc = firstEdge.sections[0].endPoint;
        }
        const newEnd = findBendNearDummy(edgeGroup, dummyIsSource, dummyLoc);
        for (const edge of edgeGroup) {
            const section = edge.sections[0];
            if (dummyIsSource) {
                section.startPoint = newEnd;
                if (section.bendPoints) {
                    section.bendPoints.shift();
                }
            }
            else {
                section.endPoint = newEnd;
                if (section.bendPoints) {
                    section.bendPoints.pop();
                }
            }
        }
        // delete junction point if necessary
        const directions = new Set(edgeGroup.flatMap((edge) => {
            const section = edge.sections[0];
            if (dummyIsSource) {
                // get first bend or endPoint
                if (section.bendPoints && section.bendPoints.length > 0) {
                    return [section.bendPoints[0]];
                }
                return section.endPoint;
            }
            else {
                if (section.bendPoints && section.bendPoints.length > 0) {
                    return [section.bendPoints[section.bendPoints.length - 1]];
                }
                return section.startPoint;
            }
        }).map((pt) => {
            if (pt.x > newEnd.x) {
                return WireDirection.Right;
            }
            if (pt.x < newEnd.x) {
                return WireDirection.Left;
            }
            if (pt.y > newEnd.y) {
                return WireDirection.Down;
            }
            return WireDirection.Up;
        }));
        if (directions.size < 3) {
            // remove junctions at or near newEnd (within 2px)
            edgeGroup.forEach((edge) => {
                if (edge.junctionPoints) {
                    edge.junctionPoints = edge.junctionPoints.filter((junct) => {
                        return Math.abs(junct.x - newEnd.x) > 2 || Math.abs(junct.y - newEnd.y) > 2;
                    });
                }
            });
        }
        // Remove zero-length segments created by dummy removal
        for (const edge of edgeGroup) {
            const section = edge.sections[0];
            if (section.startPoint.x === section.endPoint.x &&
                section.startPoint.y === section.endPoint.y &&
                (!section.bendPoints || section.bendPoints.length === 0)) {
                edge.sections = [];
            }
        }
        // Deduplicate junction points across edge group
        const seenJunctions = new Set();
        for (const edge of edgeGroup) {
            if (edge.junctionPoints) {
                edge.junctionPoints = edge.junctionPoints.filter((junct) => {
                    const key = Math.round(junct.x) + ',' + Math.round(junct.y);
                    if (seenJunctions.has(key))
                        return false;
                    seenJunctions.add(key);
                    return true;
                });
            }
        }
        dummyNum += 1;
    }
}
