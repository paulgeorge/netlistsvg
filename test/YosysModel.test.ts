import Yosys from '../lib/YosysModel';

describe('YosysModel', () => {
    test('Direction enum has Input and Output values', () => {
        expect(Yosys.Direction.Input).toBe('input');
        expect(Yosys.Direction.Output).toBe('output');
    });

    test('getInputPortPids returns input port names', () => {
        const cell: Yosys.Cell = {
            type: '$mux',
            port_directions: {
                A: Yosys.Direction.Input,
                B: Yosys.Direction.Input,
                S: Yosys.Direction.Input,
                Y: Yosys.Direction.Output,
            },
            connections: {
                A: [1],
                B: [2],
                S: [3],
                Y: [4],
            },
        };
        const inputPids = Yosys.getInputPortPids(cell);
        expect(inputPids).toEqual(['A', 'B', 'S']);
    });

    test('getOutputPortPids returns output port names', () => {
        const cell: Yosys.Cell = {
            type: '$mux',
            port_directions: {
                A: Yosys.Direction.Input,
                B: Yosys.Direction.Input,
                Y: Yosys.Direction.Output,
            },
            connections: {
                A: [1],
                B: [2],
                Y: [3],
            },
        };
        const outputPids = Yosys.getOutputPortPids(cell);
        expect(outputPids).toEqual(['Y']);
    });

    test('getInputPortPids returns empty array when no port_directions', () => {
        const cell: Yosys.Cell = {
            type: '$and',
            port_directions: undefined as any,
            connections: { A: [1] },
        };
        expect(Yosys.getInputPortPids(cell)).toEqual([]);
    });

    test('getOutputPortPids returns empty array when no port_directions', () => {
        const cell: Yosys.Cell = {
            type: '$and',
            port_directions: undefined as any,
            connections: { A: [1] },
        };
        expect(Yosys.getOutputPortPids(cell)).toEqual([]);
    });

    test('Netlist interface accepts valid netlist JSON', () => {
        const netlist: Yosys.Netlist = {
            modules: {
                testModule: {
                    ports: {
                        clk: { direction: Yosys.Direction.Input, bits: [2] },
                        out: { direction: Yosys.Direction.Output, bits: [3] },
                    },
                    cells: {
                        cell1: {
                            type: '$not',
                            port_directions: {
                                A: Yosys.Direction.Input,
                                Y: Yosys.Direction.Output,
                            },
                            connections: {
                                A: [2],
                                Y: [3],
                            },
                        },
                    },
                    netNames: {},
                },
            },
        };
        expect(netlist.modules.testModule.ports.clk.direction).toBe('input');
        expect(Object.keys(netlist.modules.testModule.cells)).toHaveLength(1);
    });

    test('ExtPort interface accepts bits with constants', () => {
        const port: Yosys.ExtPort = {
            direction: Yosys.Direction.Input,
            bits: [1, '0', '1', 5] as Yosys.Signals,
        };
        expect(port.bits).toHaveLength(4);
        expect(port.bits[1]).toBe('0');
    });
});
