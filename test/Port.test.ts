import { Port } from '../lib/Port';
import Cell from '../lib/Cell';
import Yosys from '../lib/YosysModel';

describe('Port', () => {
    test('constructor sets key and value', () => {
        const port = new Port('A', [1, 2, 3]);
        expect(port.Key).toBe('A');
    });

    test('keyIn returns true when key is in the list', () => {
        const port = new Port('A', [1, 2]);
        expect(port.keyIn(['A', 'B', 'C'])).toBe(true);
    });

    test('keyIn returns false when key is not in the list', () => {
        const port = new Port('D', [1, 2]);
        expect(port.keyIn(['A', 'B', 'C'])).toBe(false);
    });

    test('maxVal returns the maximum numeric value', () => {
        const port = new Port('A', [5, 10, 3]);
        expect(port.maxVal()).toBe(10);
    });

    test('maxVal handles single value', () => {
        const port = new Port('A', [42]);
        expect(port.maxVal()).toBe(42);
    });

    test('valString returns comma-delimited string', () => {
        const port = new Port('A', [1, 2, 3]);
        expect(port.valString()).toBe(',1,2,3,');
    });

    test('valString with single value', () => {
        const port = new Port('A', [7]);
        expect(port.valString()).toBe(',7,');
    });

    test('findConstants replaces constant 0 and 1 signals', () => {
        const port = new Port('A', ['0', '1', 5] as Yosys.Signals);
        const sigsByConst: { [name: string]: number[] } = {};
        const collector: Cell[] = [];
        const maxNum = port.findConstants(sigsByConst, 100, collector);
        // should have incremented maxNum twice (for '0' and '1')
        expect(maxNum).toBe(102);
        // should have created one constant cell
        expect(collector.length).toBe(1);
    });

    test('findConstants reuses existing constants', () => {
        const port1 = new Port('A', ['0', '1'] as Yosys.Signals);
        const port2 = new Port('B', ['0', '1'] as Yosys.Signals);
        const sigsByConst: { [name: string]: number[] } = {};
        const collector: Cell[] = [];
        let maxNum = port1.findConstants(sigsByConst, 100, collector);
        maxNum = port2.findConstants(sigsByConst, maxNum, collector);
        // only one constant cell created (second reuses the first)
        expect(collector.length).toBe(1);
    });

    test('findConstants with no constants returns same maxNum', () => {
        const port = new Port('A', [5, 10, 3]);
        const sigsByConst: { [name: string]: number[] } = {};
        const collector: Cell[] = [];
        const maxNum = port.findConstants(sigsByConst, 100, collector);
        expect(maxNum).toBe(100);
        expect(collector.length).toBe(0);
    });
});
