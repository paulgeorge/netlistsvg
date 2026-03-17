import path from 'path';
import fs from 'fs';
import json5 from 'json5';
import onml = require('onml');
import { ElkModel, buildElkGraph } from '../lib/elkGraph';
import { FlatModule } from '../lib/FlatModule';
import Skin from '../lib/Skin';
import Yosys from '../lib/YosysModel';

function loadSkin(skinFile: string = 'default.svg') {
    const skinPath = path.join(__dirname, '../lib', skinFile);
    Skin.skin = onml.p(fs.readFileSync(skinPath, 'utf-8'));
}

function loadNetlist(testFile: string): Yosys.Netlist {
    const testPath = path.join(__dirname, 'digital', testFile + '.json');
    return json5.parse(fs.readFileSync(testPath, 'utf-8'));
}

function createModule(testFile: string): FlatModule {
    loadSkin();
    const netlist = loadNetlist(testFile);
    const layoutProps = Skin.getProperties();
    const flatModule = new FlatModule(netlist);
    if (layoutProps.constants !== false) {
        flatModule.addConstants();
    }
    if (layoutProps.splitsAndJoins !== false) {
        flatModule.addSplitsJoins();
    }
    flatModule.createWires();
    return flatModule;
}

describe('elkGraph', () => {
    beforeEach(() => {
        // Reset module-level state
        ElkModel.wireNameLookup = {};
        ElkModel.dummyNum = 0;
        ElkModel.edgeIndex = 0;
    });

    test('buildElkGraph returns a valid graph for mux4', () => {
        const module = createModule('mux4');
        const graph = buildElkGraph(module);
        expect(graph.id).toBe('MUX4');
        expect(graph.children.length).toBeGreaterThan(0);
        expect(graph.edges.length).toBeGreaterThan(0);
    });

    test('buildElkGraph children have required properties', () => {
        const module = createModule('mux4');
        const graph = buildElkGraph(module);
        for (const child of graph.children) {
            expect(child.id).toBeDefined();
            expect(typeof child.width).toBe('number');
            expect(typeof child.height).toBe('number');
            expect(Array.isArray(child.ports)).toBe(true);
        }
    });

    test('buildElkGraph edges have required properties', () => {
        const module = createModule('mux4');
        const graph = buildElkGraph(module);
        for (const edge of graph.edges) {
            expect(edge.id).toBeDefined();
            expect(edge.id.startsWith('e')).toBe(true);
        }
    });

    test('buildElkGraph resets edge and dummy counters', () => {
        const module = createModule('mux4');
        buildElkGraph(module);
        // Build again - counters should reset
        const graph2 = buildElkGraph(module);
        expect(graph2.edges[0]?.id).toBe('e0');
    });

    test('buildElkGraph handles hyperedges with dummy nodes', () => {
        const module = createModule('hyperedges');
        const graph = buildElkGraph(module);
        // hyperedges should create dummy nodes
        const dummyChildren = graph.children.filter((c) => c.id.startsWith('$d_'));
        expect(dummyChildren.length).toBeGreaterThan(0);
        // dummy nodes should have zero width/height
        for (const dc of dummyChildren) {
            expect(dc.width).toBe(0);
            expect(dc.height).toBe(0);
        }
    });

    test('wireNameLookup is populated after building graph', () => {
        const module = createModule('mux4');
        buildElkGraph(module);
        expect(Object.keys(ElkModel.wireNameLookup).length).toBeGreaterThan(0);
    });

    test('buildElkGraph for up3down5 produces valid graph', () => {
        const module = createModule('up3down5');
        const graph = buildElkGraph(module);
        expect(graph.id).toBeDefined();
        expect(graph.children.length).toBeGreaterThan(0);
    });
});
