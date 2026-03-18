"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlatModule = void 0;
exports.arrayToBitstring = arrayToBitstring;
exports.addToDefaultDict = addToDefaultDict;
exports.removeDups = removeDups;
const Skin_1 = __importDefault(require("./Skin"));
const Cell_1 = __importDefault(require("./Cell"));
class FlatModule {
    constructor(netlist) {
        this.moduleName = null;
        for (const [name, mod] of Object.entries(netlist.modules)) {
            if (mod.attributes && Number(mod.attributes.top) === 1) {
                this.moduleName = name;
            }
        }
        // Otherwise default the first one in the file...
        if (this.moduleName == null) {
            this.moduleName = Object.keys(netlist.modules)[0];
        }
        const top = netlist.modules[this.moduleName];
        const ports = Object.entries(top.ports).map(([name, port]) => Cell_1.default.fromPort(port, name));
        const cells = Object.entries(top.cells).map(([key, c]) => Cell_1.default.fromYosysCell(c, key));
        this.nodes = cells.concat(ports);
        // populated by createWires
        this.wires = [];
    }
    // converts input ports with constant assignments to constant nodes
    addConstants() {
        // find the maximum signal number
        let maxNum = this.nodes.reduce(((acc, v) => v.maxOutVal(acc)), -1);
        // add constants to nodes
        const signalsByConstantName = {};
        const cells = [];
        this.nodes.forEach((n) => {
            maxNum = n.findConstants(signalsByConstantName, maxNum, cells);
        });
        this.nodes = this.nodes.concat(cells);
    }
    // solves for minimal bus splits and joins and adds them to module
    addSplitsJoins() {
        const allInputs = this.nodes.flatMap((n) => n.inputPortVals());
        const allOutputs = this.nodes.flatMap((n) => n.outputPortVals());
        const allInputsCopy = allInputs.slice();
        const splits = {};
        const joins = {};
        allInputs.forEach((input) => {
            gather(allOutputs, allInputsCopy, input, 0, input.length, splits, joins);
        });
        this.nodes = this.nodes.concat(Object.entries(joins).map(([joinInputs, joinOutput]) => {
            return Cell_1.default.fromJoinInfo(joinInputs, joinOutput);
        })).concat(Object.entries(splits).map(([splitInput, splitOutputs]) => {
            return Cell_1.default.fromSplitInfo(splitInput, splitOutputs);
        }));
    }
    // search through all the ports to find all of the wires
    createWires() {
        const layoutProps = Skin_1.default.getProperties();
        const ridersByNet = {};
        const driversByNet = {};
        const lateralsByNet = {};
        this.nodes.forEach((n) => {
            n.collectPortsByDirection(ridersByNet, driversByNet, lateralsByNet, layoutProps.genericsLaterals);
        });
        // list of unique nets
        const nets = removeDups(Object.keys(ridersByNet).concat(Object.keys(driversByNet)).concat(Object.keys(lateralsByNet)));
        const wires = nets.map((net) => {
            const drivers = driversByNet[net] || [];
            const riders = ridersByNet[net] || [];
            const laterals = lateralsByNet[net] || [];
            const wire = { netName: net, drivers, riders, laterals };
            drivers.concat(riders).concat(laterals).forEach((port) => {
                port.wire = wire;
            });
            return wire;
        });
        this.wires = wires;
    }
}
exports.FlatModule = FlatModule;
// returns a string that represents the values of the array of integers
// [1, 2, 3] -> ',1,2,3,'
function arrayToBitstring(bitArray) {
    let ret = '';
    bitArray.forEach((bit) => {
        const sbit = String(bit);
        if (ret === '') {
            ret = sbit;
        }
        else {
            ret += ',' + sbit;
        }
    });
    return ',' + ret + ',';
}
// returns whether needle is a substring of haystack
function arrayContains(needle, haystack) {
    return (haystack.indexOf(needle) > -1);
}
// returns the index of the string that contains a substring
// given arrhaystack, an array of strings
function indexOfContains(needle, arrhaystack) {
    return arrhaystack.findIndex((haystack) => {
        return arrayContains(needle, haystack);
    });
}
function addToDefaultDict(dict, key, value) {
    if (dict[key] === undefined) {
        dict[key] = [value];
    }
    else {
        dict[key].push(value);
    }
}
// string (for labels), that represents an index
// or range of indices.
function getIndicesString(bitstring, query, start) {
    const splitStart = Math.max(bitstring.indexOf(query), start);
    const startIndex = bitstring.substring(0, splitStart).split(',').length - 1;
    const endIndex = startIndex + query.split(',').length - 3;
    if (startIndex === endIndex) {
        return String(startIndex);
    }
    else {
        return String(startIndex) + ':' + String(endIndex);
    }
}
// gather splits and joins
function gather(inputs, // all inputs
outputs, // all outputs
toSolve, // an input array we are trying to solve
initialStart, // index of toSolve to start from
initialEnd, // index of toSolve to end at
splits, // container collecting the splits
joins) {
    let start = initialStart;
    let end = initialEnd;
    let finished = false;
    while (!finished) {
        // remove myself from outputs list if present
        const outputIndex = outputs.indexOf(toSolve);
        if (outputIndex !== -1) {
            outputs.splice(outputIndex, 1);
        }
        // This toSolve is compconste
        if (start >= toSolve.length || end - start < 2) {
            finished = true;
            continue;
        }
        const query = toSolve.slice(start, end);
        // are there are perfect matches?
        if (arrayContains(query, inputs)) {
            if (query !== toSolve) {
                addToDefaultDict(joins, toSolve, getIndicesString(toSolve, query, start));
            }
            start = end - 1;
            end = toSolve.length;
            continue;
        }
        const index = indexOfContains(query, inputs);
        // are there any partial matches?
        if (index !== -1) {
            if (query !== toSolve) {
                addToDefaultDict(joins, toSolve, getIndicesString(toSolve, query, start));
            }
            // found a split
            addToDefaultDict(splits, inputs[index], getIndicesString(inputs[index], query, 0));
            // we can match to this now
            inputs.push(query);
            start = end - 1;
            end = toSolve.length;
            continue;
        }
        // are there any output matches?
        if (indexOfContains(query, outputs) !== -1) {
            if (query !== toSolve) {
                // add to join
                addToDefaultDict(joins, toSolve, getIndicesString(toSolve, query, start));
            }
            // gather without outputs
            gather(inputs, [], query, 0, query.length, splits, joins);
            inputs.push(query);
            finished = true;
            continue;
        }
        end = start + query.slice(0, -1).lastIndexOf(',') + 1;
    }
}
function removeDups(inStrs) {
    return [...new Set(inStrs)];
}
