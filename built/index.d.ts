import Yosys from './YosysModel';
import { ElkModel } from './elkGraph';
type ICallback = (error: Error | null, result?: string) => void;
export declare function dumpLayout(skinData: string, yosysNetlist: Yosys.Netlist, prelayout: boolean, done: ICallback): void;
export declare function render(skinData: string, yosysNetlist: Yosys.Netlist, done?: ICallback, elkData?: ElkModel.Graph): Promise<string | void>;
export {};
