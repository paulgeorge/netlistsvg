import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const binPath = path.join(__dirname, '../bin/netlistsvg.js');
const mux4Path = path.join(__dirname, 'digital/mux4.json');
const andPath = path.join(__dirname, 'analog/and.json');
const defaultSkinPath = path.join(__dirname, '../lib/default.svg');
const analogSkinPath = path.join(__dirname, '../lib/analog.svg');

function runCli(args: string): string {
    return execSync(`node ${binPath} ${args}`, {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..'),
    });
}

describe('CLI', () => {
    let tmpDir: string;

    beforeAll(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'netlistsvg-test-'));
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('renders digital netlist to SVG file', () => {
        const outPath = path.join(tmpDir, 'mux4.svg');
        runCli(`${mux4Path} -o ${outPath}`);
        expect(fs.existsSync(outPath)).toBe(true);
        const content = fs.readFileSync(outPath, 'utf-8');
        expect(content.startsWith('<svg')).toBe(true);
    });

    test('renders with custom skin', () => {
        const outPath = path.join(tmpDir, 'and.svg');
        runCli(`${andPath} -o ${outPath} --skin ${analogSkinPath}`);
        expect(fs.existsSync(outPath)).toBe(true);
        const content = fs.readFileSync(outPath, 'utf-8');
        expect(content.startsWith('<svg')).toBe(true);
    });

    test('exits with error for nonexistent input file', () => {
        expect(() => {
            execSync(`node ${binPath} /tmp/nonexistent_file_12345.json -o /tmp/out.svg`, {
                encoding: 'utf-8',
                cwd: path.join(__dirname, '..'),
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        }).toThrow();
    });

    test('shows usage with --help', () => {
        // yargs --help exits with 0
        try {
            const output = execSync(`node ${binPath} --help`, {
                encoding: 'utf-8',
                cwd: path.join(__dirname, '..'),
            });
            expect(output).toContain('usage');
        } catch (e: any) {
            // yargs may exit with code 0, which some shells report differently
            expect(e.stdout || e.message).toContain('usage');
        }
    });
});
