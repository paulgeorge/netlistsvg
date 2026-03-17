import { ElkModel } from './elkGraph';
import { FlatModule } from './FlatModule';
import Cell from './Cell';
import Skin from './Skin';

import onml = require('onml');

enum WireDirection {
    Up, Down, Left, Right,
}

export default function drawModule(g: ElkModel.Graph, module: FlatModule) {
    const nodes: onml.Element[] = module.nodes.map((n: Cell) => {
        const kchild = g.children.find((c) => c.id === n.Key)!;
        return n.render(kchild);
    });
    removeDummyEdges(g);
    let lines: onml.Element[] = (g.edges as ElkModel.Edge[]).flatMap((e: ElkModel.Edge) => {
        const netId = ElkModel.wireNameLookup[e.id];
        if (!netId) return [];
        const numWires = netId.split(',').length - 2;
        const lineStyle = 'stroke-width: ' + (numWires > 1 ? 2 : 1);
        const netName = 'net_' + netId.slice(1, netId.length - 1) + ' width_' + numWires;
        return (e.sections || []).flatMap((s: ElkModel.Section) => {
            let startPoint = s.startPoint;
            s.bendPoints = s.bendPoints || [];
            let bends: any[] = s.bendPoints.map((b) => {
                const l = ['line', {
                    x1: startPoint.x,
                    x2: b.x,
                    y1: startPoint.y,
                    y2: b.y,
                    class: netName,
                    style: lineStyle,
                }];
                startPoint = b;
                return l;
            });
            if (e.junctionPoints) {
                const circles: any[] = e.junctionPoints.map((j: ElkModel.WirePoint) =>
                    ['circle', {
                        cx: j.x,
                        cy: j.y,
                        r: (numWires > 1 ? 3 : 2),
                        style: 'fill:#000',
                        class: netName,
                    }]);
                bends = bends.concat(circles);
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
    let labels: any[] | undefined;
    for (const e of g.edges) {
        const netId = ElkModel.wireNameLookup[e.id];
        if (!netId) continue;
        const numWires = netId.split(',').length - 2;
        const netName = 'net_' + netId.slice(1, netId.length - 1) +
            ' width_' + numWires +
            ' busLabel_' + numWires;
        const eLabels = (e as ElkModel.ExtendedEdge).labels;
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
            } else {
                labels = label;
            }
        }
    }
    if (labels !== undefined && labels.length > 0) {
        lines = lines.concat(labels);
    }
    const svgAttrs = Skin.skin[1] as onml.Attributes;
    svgAttrs.width = g.width!.toString();
    svgAttrs.height = g.height!.toString();

    const styles: any[] = ['style', {}, ''];
    onml.t(Skin.skin, {
        enter: (node: any) => {
            if (node.name === 'style') {
                styles[2] += node.full[2];
            }
        },
    });
    const elements: any[] = [styles, ...nodes, ...lines];
    const ret: any[] = ['svg', svgAttrs, ...elements];
    return onml.s(ret as onml.Element);
}

function findBendNearDummy(
        net: ElkModel.Edge[],
        dummyIsSource: boolean,
        dummyLoc: ElkModel.WirePoint): ElkModel.WirePoint {
    const candidates = net.map( (edge) => {
        const bends = edge.sections![0].bendPoints || [null];
        if (dummyIsSource) {
            return bends[0];
        } else {
            return bends[bends.length - 1];
        }
    }).filter((p) => p !== null);
    return candidates.reduce((min, pt) => {
        const minDist = Math.abs(dummyLoc.x - min.x) + Math.abs(dummyLoc.y - min.y);
        const ptDist = Math.abs(dummyLoc.x - pt.x) + Math.abs(dummyLoc.y - pt.y);
        return ptDist < minDist ? pt : min;
    });
}

export function removeDummyEdges(g: ElkModel.Graph) {
    // go through each edge group for each dummy
    let dummyNum: number = 0;
    // loop until we can't find an edge group or we hit 10,000
    while (dummyNum < 10000) {
        const dummyId: string = '$d_' + String(dummyNum);
        // find all edges connected to this dummy
        const edgeGroup = (g.edges as ElkModel.Edge[]).filter((e) => {
            return e.source === dummyId || e.target === dummyId;
        });
        if (edgeGroup.length === 0) {
            break;
        }
        let dummyIsSource: boolean;
        let dummyLoc: ElkModel.WirePoint;
        const firstEdge = edgeGroup[0];
        if (firstEdge.source === dummyId) {
            dummyIsSource = true;
            dummyLoc = firstEdge.sections![0].startPoint;
        } else {
            dummyIsSource = false;
            dummyLoc = firstEdge.sections![0].endPoint;
        }
        const newEnd: ElkModel.WirePoint = findBendNearDummy(edgeGroup, dummyIsSource, dummyLoc);
        for (const edge of edgeGroup) {
            const section = edge.sections![0];
            if (dummyIsSource) {
                section.startPoint = newEnd;
                if (section.bendPoints) {
                    section.bendPoints.shift();
                }
            } else {
                section.endPoint = newEnd;
                if (section.bendPoints) {
                    section.bendPoints.pop();
                }
            }
        }
        // delete junction point if necessary
        const directions = new Set(edgeGroup.flatMap((edge) => {
            const section = edge.sections![0];
            if (dummyIsSource) {
                // get first bend or endPoint
                if (section.bendPoints && section.bendPoints.length > 0) {
                    return [section.bendPoints[0]];
                }
                return section.endPoint;
            } else {
                if (section.bendPoints && section.bendPoints.length > 0) {
                    return [section.bendPoints[section.bendPoints.length - 1]];
                }
                return section.startPoint;
            }
        }).map( (pt) => {
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
            // remove junctions at newEnd
            edgeGroup.forEach((edge) => {
                if (edge.junctionPoints) {
                    edge.junctionPoints = edge.junctionPoints.filter((junct) => {
                        return junct.x !== newEnd.x || junct.y !== newEnd.y;
                    });
                }
            });
        }
        dummyNum += 1;
    }
}
