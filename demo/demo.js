'use strict';
var json5 = require('json5');
var netlistSvg = require('../built');
var raspberryPi2 = require('../examples/digital/raspberry_pi2.json');

var skins = ['lib/default.svg', 'lib/analog.svg'];

var textarea = document.querySelector('textarea');
var skinSelect = document.querySelector('#skinSelect');
var renderButton = document.querySelector('#renderButton');
var formatButton = document.querySelector('#formatButton');
var svgArea = document.querySelector('#svgArea');

textarea.value = json5.stringify(raspberryPi2, null, 4);

skins.forEach(function(skinPath, i) {
    fetch(skinPath).then(function(r) {
        return r.text();
    }).then(function(text) {
        var option = document.createElement('option');
        option.selected = i === 0;
        option.value = text;
        option.text = skinPath;
        skinSelect.append(option);
    });
});

function render() {
    var netlist = json5.parse(textarea.value);
    netlistSvg.render(skinSelect.value, netlist, function(e, svg) {
        svgArea.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    });
}

function format() {
    var netlist = json5.parse(textarea.value);
    textarea.value = json5.stringify(netlist, null, 4);
}

renderButton.onclick = render;
formatButton.onclick = format;
