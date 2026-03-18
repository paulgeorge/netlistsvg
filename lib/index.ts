'use strict';

import ELK = require('elkjs');
import onml = require('onml');

import { FlatModule } from './FlatModule';
import Yosys from './YosysModel';
import Skin from './Skin';
import { ElkModel, buildElkGraph } from './elkGraph';
import drawModule from './drawModule';

const elk = new ELK();

type ICallback = (error: Error | null, result?: string) => void;

function createFlatModule(skinData: string, yosysNetlist: Yosys.Netlist): FlatModule {
    Skin.skin = onml.p(skinData);
    const layoutProps = Skin.getProperties();
    const flatModule = new FlatModule(yosysNetlist);
    // this can be skipped if there are no 0's or 1's
    if (layoutProps.constants !== false) {
        flatModule.addConstants();
    }
    // this can be skipped if there are no splits or joins
    if (layoutProps.splitsAndJoins !== false) {
        flatModule.addSplitsJoins();
    }
    flatModule.createWires();
    return flatModule;
}

export function dumpLayout(skinData: string, yosysNetlist: Yosys.Netlist, prelayout: boolean, done: ICallback) {
    const flatModule = createFlatModule(skinData, yosysNetlist);
    const kgraph: ElkModel.Graph = buildElkGraph(flatModule);
    if (prelayout) {
        done(null, JSON.stringify(kgraph, null, 2));
        return;
    }
    const layoutProps = Skin.getProperties();
    const promise = elk.layout(kgraph, { layoutOptions: layoutProps.layoutEngine });
    promise.then((graph: ElkModel.Graph) => {
        done(null, JSON.stringify(graph, null, 2));
    }).catch((reason) => {
        done(reason instanceof Error ? reason : new Error(String(reason)));
    });
}

export function render(skinData: string, yosysNetlist: Yosys.Netlist, done?: ICallback, elkData?: ElkModel.Graph) {
    const flatModule = createFlatModule(skinData, yosysNetlist);
    const kgraph: ElkModel.Graph = buildElkGraph(flatModule);
    const layoutProps = Skin.getProperties();

    let promise: Promise<string | void>;
    // if we already have a layout then use it
    if (elkData) {
        promise = new Promise<string>((resolve) => {
            const result = drawModule(elkData, flatModule);
            resolve(result);
        });
    } else {
        // otherwise use ELK to generate the layout
        promise = elk.layout(kgraph, { layoutOptions: layoutProps.layoutEngine })
            .then((g: any) => drawModule(g, flatModule));
    }

    // support legacy callback style
    if (typeof done === 'function') {
        promise.then((output) => {
            done(null, output as string);
            return output;
        }).catch((reason) => {
            done(reason instanceof Error ? reason : new Error(String(reason)));
        });
    }
    return promise;
}
