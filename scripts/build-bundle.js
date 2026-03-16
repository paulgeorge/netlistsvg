#!/usr/bin/env node
'use strict';

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Plugin to handle fs.readFileSync calls by inlining file contents at build time
// This replaces the brfs transform that browserify used
const brfsPlugin = {
    name: 'brfs-inline',
    setup(build) {
        build.onLoad({ filter: /jsmodule\/index\.js$/ }, async (args) => {
            let contents = fs.readFileSync(args.path, 'utf8');

            // Replace fs.readFileSync calls with inlined string literals
            const fsReadPattern = /fs\.readFileSync\(__dirname\s*\+\s*['"]([^'"]+)['"]\s*(?:,\s*['"]utf8['"])?\)/g;

            const dir = path.dirname(args.path);
            contents = contents.replace(fsReadPattern, (match, relPath) => {
                // relPath is like '/../lib/default.svg', resolve relative to jsmodule dir
                const resolvedPath = path.join(dir, relPath);
                const fileContents = fs.readFileSync(resolvedPath, 'utf8');
                return JSON.stringify(fileContents);
            });

            // Remove the fs require since we've inlined all the reads
            contents = contents.replace(/const fs = require\('fs'\);?\n?/, '');

            return { contents, loader: 'js' };
        });
    }
};

esbuild.build({
    entryPoints: ['jsmodule/index.js'],
    bundle: true,
    outfile: 'built/netlistsvg.bundle.js',
    format: 'iife',
    globalName: 'netlistsvg',
    platform: 'browser',
    external: ['elkjs'],
    plugins: [brfsPlugin],
}).catch(() => process.exit(1));
