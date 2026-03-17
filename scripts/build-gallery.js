#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin/netlistsvg.js');
const DEFAULT_SKIN = path.join(ROOT, 'lib/default.svg');
const ANALOG_SKIN = path.join(ROOT, 'lib/analog.svg');
const OUT_FILE = path.join(ROOT, 'docs/index.html');

const digital = [
    { json: 'test/digital/mux4.json', title: '4:1 Multiplexer', desc: 'A 4-input multiplexer with select lines.' },
    { json: 'test/digital/up3down5.json', title: 'Up3 Down5 Counter', desc: 'Up/down counter with 3-bit up and 5-bit down.' },
    { json: 'test/digital/pc.json', title: 'Program Counter', desc: 'Simple program counter with load and increment.' },
    { json: 'test/digital/generics.json', title: 'Generic Cells', desc: 'Demonstration of generic cell rendering.' },
    { json: 'test/digital/ports_splitjoin.json', title: 'Bus Split/Join', desc: 'Bus splitting and joining operations.' },
    { json: 'test/digital/hyperedges.json', title: 'Hyperedges', desc: 'Nets with multiple drivers or riders.' },
];

const analog = [
    { json: 'test/analog/resistor_divider.json', title: 'Resistor Divider', desc: 'Simple voltage divider with two resistors.' },
    { json: 'test/analog/common_emitter_full.json', title: 'Common Emitter', desc: 'Common emitter amplifier with biasing.' },
    { json: 'test/analog/and.json', title: 'Diode AND Gate', desc: 'AND gate built from diodes and resistors.' },
    { json: 'test/analog/mcu.json', title: 'MCU Schematic', desc: 'Microcontroller with peripheral connections.' },
    { json: 'test/analog/vcc_and_gnd.json', title: 'VCC and GND', desc: 'Power rail connections.' },
    { json: 'examples/analog/audio_filter.json', title: 'RC Low-Pass Filter', desc: 'First-order RC low-pass audio filter.' },
    { json: 'examples/analog/amplifier.json', title: 'CE Amplifier (Full)', desc: 'Common emitter amplifier with coupling caps and bypass.' },
    { json: 'examples/analog/555_timer.json', title: '555 Timer (Astable)', desc: '555 timer in astable mode driving an LED.' },
    { json: 'examples/analog/power_supply.json', title: 'Regulated Power Supply', desc: 'Bridge rectifier, filter cap, and voltage regulator.' },
];

function renderSvg(jsonPath, skinPath) {
    const fullPath = path.join(ROOT, jsonPath);
    const tmpFile = path.join(os.tmpdir(), 'netlistsvg-gallery-' + process.pid + '.svg');
    execSync(`node ${BIN} ${fullPath} -o ${tmpFile} --skin ${skinPath}`, { stdio: 'pipe' });
    const svg = fs.readFileSync(tmpFile, 'utf-8');
    fs.unlinkSync(tmpFile);
    return svg;
}

function buildCard(item, skin) {
    const svg = renderSvg(item.json, skin);
    return `
      <div class="card">
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="svg-container">${svg}</div>
      </div>`;
}

function buildHtml() {
    const digitalCards = digital.map(d => buildCard(d, DEFAULT_SKIN)).join('\n');
    const analogCards = analog.map(a => buildCard(a, ANALOG_SKIN)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>netlistsvg Circuit Gallery</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #1a1a2e;
      --card-bg: #f8f9fa;
      --card-border: #dee2e6;
      --accent: #4361ee;
      --muted: #6c757d;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a2e;
        --fg: #e8e8e8;
        --card-bg: #16213e;
        --card-border: #2a2a4a;
        --accent: #7b8cde;
        --muted: #9a9ab0;
      }
      .svg-container svg {
        filter: invert(1) hue-rotate(180deg);
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      padding: 2rem 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--muted);
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }
    h2 {
      font-size: 1.5rem;
      margin: 2rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1.25rem;
      transition: box-shadow 0.2s;
    }
    .card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .card h3 {
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }
    .card p {
      color: var(--muted);
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }
    .svg-container {
      overflow-x: auto;
      text-align: center;
    }
    .svg-container svg {
      max-width: 100%;
      height: auto;
    }
    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--card-border);
      color: var(--muted);
      font-size: 0.85rem;
      text-align: center;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>netlistsvg Circuit Gallery</h1>
  <p class="subtitle">
    SVG schematics rendered from Yosys JSON netlists using
    <a href="https://github.com/paulgeorge/netlistsvg">netlistsvg</a>.
  </p>

  <h2>Digital Circuits</h2>
  <div class="grid">
${digitalCards}
  </div>

  <h2>Analog Circuits</h2>
  <div class="grid">
${analogCards}
  </div>

  <footer>
    Generated by netlistsvg &mdash; draws SVG schematics from JSON netlists.
  </footer>
</body>
</html>
`;
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, buildHtml());
console.log('Gallery written to', OUT_FILE);
