import path from 'path';
import fs from 'fs';
import JSON5 from 'json5';
import { render } from '../lib/index';

const defaultSkinPath = path.join(__dirname, '../lib/default.svg');
const analogSkinPath = path.join(__dirname, '../lib/analog.svg');

function loadSkinData(skinPath: string): string {
    return fs.readFileSync(skinPath, 'utf-8');
}

function loadNetlist(jsonPath: string) {
    return JSON5.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

const digitalTests = ['generics', 'ports_splitjoin', 'up3down5', 'mux4', 'hyperedges', 'pc'];
const analogTests = ['and', 'common_emitter_full', 'mcu', 'resistor_divider', 'vcc_and_gnd'];

describe('digital examples', () => {
    const skinData = loadSkinData(defaultSkinPath);

    digitalTests.forEach((testName) => {
        test(`renders ${testName}`, async () => {
            const netlistPath = path.join(__dirname, 'digital', testName + '.json');
            const netlist = loadNetlist(netlistPath);
            const result = await render(skinData, netlist);
            expect(typeof result).toBe('string');
            expect((result as string).startsWith('<svg')).toBe(true);
            expect((result as string)).toContain('</svg>');
        }, 15000);
    });
});

describe('analog examples', () => {
    const skinData = loadSkinData(analogSkinPath);

    analogTests.forEach((testName) => {
        test(`renders ${testName}`, async () => {
            const netlistPath = path.join(__dirname, 'analog', testName + '.json');
            const netlist = loadNetlist(netlistPath);
            const result = await render(skinData, netlist);
            expect(typeof result).toBe('string');
            expect((result as string).startsWith('<svg')).toBe(true);
            expect((result as string)).toContain('</svg>');
        }, 15000);
    });
});
