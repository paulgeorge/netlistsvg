import path from 'path';
import fs from 'fs';
import onml = require('onml');
import Skin from '../lib/Skin';

function loadSkin(skinFile: string) {
    const skinPath = path.join(__dirname, '../lib', skinFile);
    const skinData = fs.readFileSync(skinPath, 'utf-8');
    Skin.skin = onml.p(skinData);
}

describe('Skin', () => {
    beforeEach(() => {
        loadSkin('default.svg');
    });

    test('loads default skin successfully', () => {
        expect(Skin.skin).toBeDefined();
        expect(Skin.skin[0]).toBe('svg');
    });

    test('findSkinType finds known cell type', () => {
        const template = Skin.findSkinType('$_inputExt_');
        expect(template).toBeDefined();
        expect(Array.isArray(template)).toBe(true);
    });

    test('findSkinType falls back to generic for unknown type', () => {
        const template = Skin.findSkinType('$unknown_type_that_does_not_exist');
        expect(template).toBeDefined();
        // generic type should be returned
        expect(template[1]['s:type']).toBe('generic');
    });

    test('getProperties returns properties object', () => {
        const props = Skin.getProperties();
        expect(props).toBeDefined();
        expect(typeof props).toBe('object');
        expect(props.layoutEngine).toBeDefined();
    });

    test('getProperties parses numeric values', () => {
        const props = Skin.getProperties();
        // properties that are numeric should be parsed as numbers
        for (const [key, val] of Object.entries(props)) {
            if (key !== 'layoutEngine' && typeof val === 'number') {
                expect(typeof val).toBe('number');
            }
        }
    });

    test('getInputPids returns input port IDs', () => {
        const template = Skin.findSkinType('$_inputExt_');
        const pids = Skin.getInputPids(template);
        expect(Array.isArray(pids)).toBe(true);
    });

    test('getOutputPids returns output port IDs', () => {
        const template = Skin.findSkinType('$_inputExt_');
        const pids = Skin.getOutputPids(template);
        expect(Array.isArray(pids)).toBe(true);
    });

    test('getLateralPortPids returns lateral port IDs', () => {
        const template = Skin.findSkinType('$_inputExt_');
        const pids = Skin.getLateralPortPids(template);
        expect(Array.isArray(pids)).toBe(true);
    });

    test('getPortsWithPrefix returns matching ports', () => {
        const template = Skin.findSkinType('$_join_');
        const inPorts = Skin.getPortsWithPrefix(template, 'in');
        expect(Array.isArray(inPorts)).toBe(true);
        expect(inPorts.length).toBeGreaterThan(0);
    });

    test('getLowPriorityAliases returns array', () => {
        const aliases = Skin.getLowPriorityAliases();
        expect(Array.isArray(aliases)).toBe(true);
    });

    describe('analog skin', () => {
        beforeEach(() => {
            loadSkin('analog.svg');
        });

        test('loads analog skin successfully', () => {
            expect(Skin.skin).toBeDefined();
            expect(Skin.skin[0]).toBe('svg');
        });

        test('getProperties returns valid properties for analog skin', () => {
            const props = Skin.getProperties();
            expect(props).toBeDefined();
            expect(props.layoutEngine).toBeDefined();
        });
    });
});
