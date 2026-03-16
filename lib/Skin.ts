
import onml = require('onml');
import { ElkModel } from './elkGraph';

export namespace Skin {

    export let skin: onml.Element = null as any;

    export function getPortsWithPrefix(template: any[], prefix: string) {
        const ports = template.filter((e: any) => {
            try {
                if (e instanceof Array && e[0] === 'g') {
                    return e[1]['s:pid'].startsWith(prefix);
                }
            } catch (exception) {
                // Do nothing if the SVG group doesn't have a pin id.
            }
            return false;
        });
        return ports;
    }

    function filterPortPids(template: any, filter: (attrs: any) => boolean): string[] {
        const ports = template.filter((element: any[]) => {
            const tag: string = element[0];
            if (element instanceof Array && tag === 'g') {
                const attrs: any = element[1];
                return filter(attrs);
            }
            return false;
        });
        return ports.map((port: any) => {
            return port[1]['s:pid'];
        });
    }

    export function getInputPids(template: any): string[] {
        return filterPortPids(template, (attrs: any) => {
            if (attrs['s:position']) {
                return attrs['s:position'] === 'top';
            }
            return false;
        });
    }

    export function getOutputPids(template: any): string[] {
        return filterPortPids(template, (attrs: any) => {
            if (attrs['s:position']) {
                return attrs['s:position'] === 'bottom';
            }
            return false;
        });
    }

    export function getLateralPortPids(template: any): string[] {
        return filterPortPids(template, (attrs: any) => {
            if (attrs['s:dir']) {
                return attrs['s:dir'] === 'lateral';
            }
            if (attrs['s:position']) {
                return attrs['s:position'] === 'left' ||
                    attrs['s:position'] === 'right';
            }
            return false;
        });
    }

    export function findSkinType(type: string) {
        let ret: any = null;
        onml.traverse(skin, {
            enter: (node: any, parent: any) => {
                if (node.name === 's:alias' && node.attr.val === type) {
                    ret = parent;
                }
            },
        });
        if (ret == null) {
            onml.traverse(skin, {
                enter: (node: any) => {
                    if (node.attr['s:type'] === 'generic') {
                        ret = node;
                    }
                },
            });
        }
        return ret!.full;
    }

    export function getLowPriorityAliases(): string[] {
        const ret: string[] = [];
        onml.t(skin, {
            enter: (node: any) => {
                if (node.name === 's:low_priority_alias') {
                    ret.push(node.attr.value);
                }
            },
        });
        return ret;
    }
    interface SkinProperties {
        [attr: string]: boolean | string | number | ElkModel.LayoutOptions;
    }

    export function getProperties(): SkinProperties {
        let vals: SkinProperties | undefined;
        onml.t(skin, {
            enter: (node: any) => {
                if (node.name === 's:properties') {
                    vals = Object.fromEntries(
                        Object.entries(node.attr as Record<string, string>).map(([key, val]) => {
                            if (!isNaN(Number(val))) {
                                return [key, Number(val)];
                            }
                            if (val === 'true') {
                                return [key, true];
                            }
                            if (val === 'false') {
                                return [key, false];
                            }
                            return [key, val];
                        }),
                    );
                } else if (node.name === 's:layoutEngine') {
                    vals!.layoutEngine = node.attr;
                }
            },
        });

        if (!vals!.layoutEngine) {
            vals!.layoutEngine = {};
        }

        return vals!;
    }
}
export default Skin;
