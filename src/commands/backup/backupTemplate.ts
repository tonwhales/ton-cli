import { number } from "fp-ts";

const styles = `
body { margin: 0; }
html { line-height: 1.15; /* 1 */ -webkit-text-size-adjust: 100%; /* 2 */ }
a { background-color: transparent; }
.index_item {
    break-inside: avoid;
    padding-left: 16px;
    padding-right: 16px;
    padding-top: 8px;
    padding-bottom: 8px;
    display: flex;
    flex-grow: 0;
    flex-shrink: 0;
    flex-direction: row;
}
.index_inner {
    display: flex;
    flex-grow: 1;
    flex-basis: 0;
    flex-shrink: 0;
    flex-direction: column;
}

.index_counter {
    font-family: monospace;
    font-size: 23px;
    align-self: center;
    text-align: center;
    width: 64px;
    opacity: 0.7;
}

.index_name {
    font-family: monospace;
    font-size: 14px;
    padding-top: 2px;
    padding-bottom: 2px;
}
.index_kind {
    font-family: monospace; 
    font-size: 12px; 
    opacity: 0.8;
    padding-top: 2px;
    padding-bottom: 2px;
}
.index_address {
    font-family: monospace;
    font-size: 12px;
    opacity: 0.8;
    padding-top: 2px;
    padding-bottom: 2px;
}

.key_item {
    break-inside: avoid;
    display: flex;
    margin-left: 16px;
    padding-top: 16px;
    padding-bottom: 16px;
}

.key_block {
    display: flex;
    position: relative;
    margin-left: 8px;
    margin-right: 8px;
    width: 160px;
    height: 220px;
    border-radius: 8px;
    border-width: 1px;
    border-color: black;
    border-style: solid;
    flex-direction: column;
    justify-content: center;
}
.key_block_mn {
    font-family: monospace;
    font-size: 19px;
    padding-left: 11px;
    line-height: 24px;
}
.key_block_id {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.key_block_id_d {
    font-family: monospace;
    font-size: 70px;
    opacity: 0.2;
}

.cut_here {
    margin-top: 32px;
    margin-bottom: 32px;
    height: 2px;
    border-top: 2px dotted #000;
}
`;

const baseTemplate = `
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TON Paper Backup</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="description" content="TON Paper Backup">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">
<style>
{{style}}
</style>
<body>
<div style="display: table; width: 350px; padding: 16px;">
{{body}}
</div>
</body>
`;

function renderItem(index: number, src: { name: string, address: string, comment: string, config: string, description: string, kind: string, mnemonics: string[] }) {
    return `
        <div class="index_item">
            <span class="index_counter">${index}</span>
            <div class="index_inner">
                <span class="index_name">
                    ${src.name}
                </span>
                <span class="index_kind">
                    ${src.description}
                </span>
                <span class="index_address">
                    ${src.address}
                </span>
            </div>
        </div>
    `;
}

function renderKeyBlock(index: number, offset: number, mnemonics: string[]) {
    return `
        <div class="key_block">
        <span class="key_block_mn">
            ${(offset + 1) + '. ' + mnemonics[0]}
        </span>
        <span class="key_block_mn">
        ${(offset + 2) + '. ' + mnemonics[1]}
        </span>
        <span class="key_block_mn">
        ${(offset + 3) + '. ' + mnemonics[2]}
        </span>
        <span class="key_block_mn">
        ${(offset + 4) + '. ' + mnemonics[3]}
        </span>
        <span class="key_block_mn">
        ${(offset + 5) + '. ' + mnemonics[4]}
        </span>
        <span class="key_block_mn">
        ${(offset + 6) + '. ' + mnemonics[5]}
        </span>
        <span class="key_block_mn">
        ${(offset + 7) + '. ' + mnemonics[6]}
        </span>
        <span class="key_block_mn">
        ${(offset + 8) + '. ' + mnemonics[7]}
        </span>
        <div class="key_block_id">
        <span class="key_block_id_d">
        ${index}
        </span>
        </div>
        </div>
    `;
}

function renderKeys(index: number, mnemonics: string[]) {
    return `
        <div class="key_item">
        ${renderKeyBlock(index, 0, mnemonics.slice(0, 8))}
        ${renderKeyBlock(index, 8, mnemonics.slice(8, 16))}
        ${renderKeyBlock(index, 16, mnemonics.slice(16))}
        </div>
    `;
}

export function backupTemplate(src: { name: string, address: string, comment: string, config: string, description: string, kind: string, mnemonics: string[] }[]) {


    let rendered: string[] = [];

    // Render index
    let index = 0;
    for (let s of src) {
        rendered.push(renderItem(++index, s));
    }

    // Page break
    rendered.push('<div class="cut_here"></div>');

    // Render keys
    index = 0;
    for (let s of src) {
        rendered.push(renderKeys(++index, s.mnemonics));
    }

    let res = baseTemplate;
    res = res.replace('{{body}}', rendered.join('\n'));
    res = res.replace('{{style}}', styles);
    return res;
}