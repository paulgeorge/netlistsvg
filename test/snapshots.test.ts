import path from 'path';
import fs from 'fs';
import { render } from '../lib/index';

const defaultSkinPath = path.join(__dirname, '../lib/default.svg');
const analogSkinPath = path.join(__dirname, '../lib/analog.svg');

function loadSkinData(skinPath: string): string {
    return fs.readFileSync(skinPath, 'utf-8');
}

function loadNetlist(jsonPath: string) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

describe('SVG snapshot tests', () => {
    describe('digital', () => {
        const skinData = loadSkinData(defaultSkinPath);

        test('mux4 snapshot', async () => {
            const netlist = loadNetlist(path.join(__dirname, 'digital/mux4.json'));
            const result = await render(skinData, netlist) as string;
            expect(result).toMatchSnapshot();
        }, 15000);

        test('up3down5 snapshot', async () => {
            const netlist = loadNetlist(path.join(__dirname, 'digital/up3down5.json'));
            const result = await render(skinData, netlist) as string;
            expect(result).toMatchSnapshot();
        }, 15000);

        test('hyperedges snapshot', async () => {
            const netlist = loadNetlist(path.join(__dirname, 'digital/hyperedges.json'));
            const result = await render(skinData, netlist) as string;
            expect(result).toMatchSnapshot();
        }, 15000);
    });

    describe('analog', () => {
        const skinData = loadSkinData(analogSkinPath);

        test('resistor_divider snapshot', async () => {
            const netlist = loadNetlist(path.join(__dirname, 'analog/resistor_divider.json'));
            const result = await render(skinData, netlist) as string;
            expect(result).toMatchSnapshot();
        }, 15000);
    });
});
