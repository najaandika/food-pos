/**
 * R6.5 original source reconstruction + isolated CSS compilation parity.
 * Read-only, except writing this task's unique %TEMP% QA evidence.
 * Run --baseline before CSS edits; --compare after modularization.
 * No production Vite output/port and no frontend source writes.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { build } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(dirname, '../../../../../../..');
const root = path.join(frontend, 'resources/js/pos/admin/views');
const sourceFile = path.join(root, 'CashierView.css');
const adminFile = path.join(root, '../styles/admin.css');
const output = path.join(os.tmpdir(), 'food-pos-r65-cashier');
const evidence = path.join(output, 'css');
const before = process.argv.includes('--baseline');
const after = process.argv.includes('--compare');
if (before === after) throw Error('Specify exactly --baseline OR --compare');
const baselineSha =
    '8377ff905657c48c697397d1dba760eafdf036aa63badd917003d9109f9d37fb';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(evidence, { recursive: true });

async function compileIsolated(cssEntry) {
    const r = await build({
        root: frontend,
        configFile: false,
        publicDir: false,
        logLevel: 'error',
        plugins: [],
        build: {
            write: false,
            manifest: false,
            minify: true,
            cssMinify: true,
            assetsInlineLimit: 100000,
            rollupOptions: { input: cssEntry },
        },
    });
    const outputs = Array.isArray(r) ? r : [r];
    const assets = outputs
        .flatMap((x) => x.output ?? [])
        .filter((x) => x.type === 'asset' && x.fileName.endsWith('.css'));
    assert.equal(
        assets.length,
        1,
        'Expect exactly one compiled CSS asset for ' + cssEntry,
    );
    return Buffer.from(assets[0].source);
}

const existing = fs.readFileSync(sourceFile);
if (before)
    assert.equal(
        sha(existing),
        baselineSha,
        'Cashier source baseline SHA mismatch',
    );
const source = existing.toString('utf8');
const modules = [
    {
        name: 'cashier-queue-layout.css',
        path: path.join(root, 'cashier/styles/cashier-queue-layout.css'),
    },
    {
        name: 'cashier-bill-detail.css',
        path: path.join(root, 'cashier/styles/cashier-bill-detail.css'),
    },
];

function reconstruct() {
    const importA = "@import './cashier/styles/cashier-queue-layout.css';\n";
    const importB = "@import './cashier/styles/cashier-bill-detail.css';\n";
    assert.ok(
        source.includes(importA + importB),
        'Cashier imports not contiguous and ordered',
    );
    assert.equal(source.split(importA).length, 2);
    assert.equal(source.split(importB).length, 2);
    for (const m of modules)
        assert.ok(fs.existsSync(m.path), 'Missing extracted module ' + m.name);
    const joined = source.replace(
        importA + importB,
        // The original stylesheet had one blank separator line after each
        // top-level section; reconstruct those inter-module separators here.
        // The standalone CSS modules keep formatter-clean trailing newlines.
        fs.readFileSync(modules[0].path, 'utf8') +
            '\n' +
            fs.readFileSync(modules[1].path, 'utf8') +
            '\n',
    );
    assert.equal(
        sha(joined),
        baselineSha,
        'Reconstructed original CSS bytes MUST match SHA-256 exactly',
    );
    assert.deepEqual(
        Buffer.from(joined),
        fs.readFileSync(path.join(evidence, 'CashierView.original.css')),
        'Reconstructed original CSS byte-for-byte mismatch',
    );
    const originalAst = postcss.parse(joined, { from: sourceFile });
    const modularAst = postcss.parse(source, { from: sourceFile });
    const oldSelectors = originalAst.nodes.filter(
        (n) => n.type === 'rule',
    ).length;
    const newSelectors = modularAst.nodes.filter(
        (n) => n.type === 'rule',
    ).length;
    console.log(
        'RECONSTRUCTION_EXACT',
        JSON.stringify({
            sha256: sha(joined),
            oldSelectors,
            newRootSelectors: newSelectors,
            extracted: [
                modules.map((m) => ({
                    file: m.name,
                    bytes: fs.statSync(m.path).size,
                    rules: postcss
                        .parse(fs.readFileSync(m.path, 'utf8'))
                        .nodes.filter((n) => n.type === 'rule').length,
                })),
            ],
        }),
    );
}
if (after) reconstruct();

const compiledCashier = await compileIsolated(sourceFile);
const compiledAdmin = await compileIsolated(adminFile);
const inputs = [
    ['cashier', compiledCashier],
    ['admin', compiledAdmin],
];
const metadata = {
    phase: 'R6.5',
    time: new Date().toISOString(),
    mode: before ? 'baseline' : 'after',
    sourceSha256: sha(existing),
    compiled: Object.fromEntries(
        inputs.map(([name, b]) => [name, { bytes: b.length, sha256: sha(b) }]),
    ),
};
for (const [name, bytes] of inputs) {
    if (before)
        fs.writeFileSync(path.join(evidence, name + '.baseline.css'), bytes);
    else {
        const frozen = fs.readFileSync(
            path.join(evidence, name + '.baseline.css'),
        );
        assert.equal(sha(bytes), sha(frozen), 'Compiled CSS mismatch ' + name);
        assert.ok(bytes.equals(frozen), 'Compiled CSS byte mismatch ' + name);
        fs.writeFileSync(path.join(evidence, name + '.after.css'), bytes);
    }
}
if (before) {
    fs.writeFileSync(path.join(evidence, 'CashierView.original.css'), existing);
    fs.writeFileSync(
        path.join(evidence, 'baseline.json'),
        JSON.stringify(metadata, null, 2),
    );
} else {
    fs.writeFileSync(
        path.join(evidence, 'comparison.json'),
        JSON.stringify(metadata, null, 2),
    );
}
console.log(
    before ? 'R65_COMPILED_BASELINE_PASS' : 'R65_CSS_PARITY_PASS',
    JSON.stringify({
        sourceSha256: metadata.sourceSha256,
        ...metadata.compiled,
    }),
);
