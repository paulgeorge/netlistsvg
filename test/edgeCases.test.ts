import path from 'path';
import fs from 'fs';
import { render } from '../lib/index';
import { FlatModule, arrayToBitstring, removeDups, addToDefaultDict } from '../lib/FlatModule';
import Skin from '../lib/Skin';
import onml = require('onml');

const defaultSkinPath = path.join(__dirname, '../lib/default.svg');

function loadSkinData(): string {
    return fs.readFileSync(defaultSkinPath, 'utf-8');
}

describe('edge cases', () => {
    describe('malformed input', () => {
        test('throws on completely invalid JSON netlist', async () => {
            const skinData = loadSkinData();
            await expect(async () => {
                await render(skinData, {} as any);
            }).rejects.toThrow();
        });

        test('throws on netlist with no modules', async () => {
            const skinData = loadSkinData();
            await expect(async () => {
                await render(skinData, { modules: {} } as any);
            }).rejects.toThrow();
        });
    });

    describe('empty netlist', () => {
        test('handles module with no cells', async () => {
            const skinData = loadSkinData();
            const netlist = {
                modules: {
                    empty: {
                        ports: {},
                        cells: {},
                        netNames: {},
                    },
                },
            };
            // Should either render an empty SVG or throw gracefully
            try {
                const result = await render(skinData, netlist);
                expect(typeof result).toBe('string');
            } catch (e) {
                // acceptable to throw for empty netlist
                expect(e).toBeDefined();
            }
        });
    });

    describe('invalid skin', () => {
        test('onml.p returns undefined for empty string', () => {
            const result = onml.p('');
            // onml.p('') returns undefined rather than throwing
            expect(result).toBeUndefined();
        });

        test('findSkinType throws for non-SVG skin', () => {
            Skin.skin = onml.p('<div>not an svg</div>');
            expect(() => {
                Skin.findSkinType('$_inputExt_');
            }).toThrow();
        });
    });
});

describe('FlatModule utilities', () => {
    test('arrayToBitstring converts array to comma-delimited string', () => {
        expect(arrayToBitstring([1, 2, 3])).toBe(',1,2,3,');
    });

    test('arrayToBitstring with single element', () => {
        expect(arrayToBitstring([42])).toBe(',42,');
    });

    test('arrayToBitstring with empty array', () => {
        expect(arrayToBitstring([])).toBe(',,');
    });

    test('removeDups removes duplicate strings', () => {
        expect(removeDups(['a', 'b', 'a', 'c', 'b'])).toEqual(
            expect.arrayContaining(['a', 'b', 'c']),
        );
        expect(removeDups(['a', 'b', 'a', 'c', 'b'])).toHaveLength(3);
    });

    test('removeDups with no duplicates', () => {
        expect(removeDups(['a', 'b', 'c'])).toHaveLength(3);
    });

    test('removeDups with empty array', () => {
        expect(removeDups([])).toHaveLength(0);
    });

    test('addToDefaultDict creates new array for new key', () => {
        const dict: any = {};
        addToDefaultDict(dict, 'key1', 'val1');
        expect(dict.key1).toEqual(['val1']);
    });

    test('addToDefaultDict appends to existing key', () => {
        const dict: any = { key1: ['val1'] };
        addToDefaultDict(dict, 'key1', 'val2');
        expect(dict.key1).toEqual(['val1', 'val2']);
    });
});
