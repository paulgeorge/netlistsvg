import path from 'path';
import fs from 'fs';
import { render, dumpLayout } from '../lib/index';

const defaultSkinPath = path.join(__dirname, '../lib/default.svg');
const analogSkinPath = path.join(__dirname, '../lib/analog.svg');
const mux4Path = path.join(__dirname, 'digital/mux4.json');
const andPath = path.join(__dirname, 'analog/and.json');

function loadSkinData(skinPath: string = defaultSkinPath): string {
    return fs.readFileSync(skinPath, 'utf-8');
}

function loadNetlist(netlistPath: string) {
    return JSON.parse(fs.readFileSync(netlistPath, 'utf-8'));
}

describe('render', () => {
    test('renders mux4 netlist to SVG string via promise', async () => {
        const skinData = loadSkinData();
        const netlist = loadNetlist(mux4Path);
        const result = await render(skinData, netlist);
        expect(typeof result).toBe('string');
        expect((result as string).startsWith('<svg')).toBe(true);
        expect((result as string)).toContain('</svg>');
    });

    test('renders mux4 netlist via callback', (done) => {
        const skinData = loadSkinData();
        const netlist = loadNetlist(mux4Path);
        render(skinData, netlist, (err, svgData) => {
            expect(err).toBeNull();
            expect(svgData).toBeDefined();
            expect(svgData!.startsWith('<svg')).toBe(true);
            done();
        });
    });

    test('renders analog netlist with analog skin', async () => {
        const skinData = loadSkinData(analogSkinPath);
        const netlist = loadNetlist(andPath);
        const result = await render(skinData, netlist);
        expect(typeof result).toBe('string');
        expect((result as string).startsWith('<svg')).toBe(true);
    });

    test('output SVG contains expected elements', async () => {
        const skinData = loadSkinData();
        const netlist = loadNetlist(mux4Path);
        const result = await render(skinData, netlist) as string;
        // should contain cell elements
        expect(result).toContain('cell_');
        // should contain line elements for wires
        expect(result).toContain('<line');
    });
});

describe('dumpLayout', () => {
    test('dumps prelayout JSON', (done) => {
        const skinData = loadSkinData();
        const netlist = loadNetlist(mux4Path);
        dumpLayout(skinData, netlist, true, (err, result) => {
            expect(err).toBeNull();
            expect(result).toBeDefined();
            const parsed = JSON.parse(result!);
            expect(parsed.id).toBe('MUX4');
            expect(parsed.children).toBeDefined();
            expect(parsed.edges).toBeDefined();
            done();
        });
    });

    test('dumps postlayout JSON via ELK', (done) => {
        const skinData = loadSkinData();
        const netlist = loadNetlist(mux4Path);
        dumpLayout(skinData, netlist, false, (err, result) => {
            expect(err).toBeNull();
            expect(result).toBeDefined();
            const parsed = JSON.parse(result!);
            // post-layout should have width/height set by ELK
            expect(parsed.width).toBeDefined();
            expect(parsed.height).toBeDefined();
            done();
        });
    }, 10000);
});
