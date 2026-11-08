/**
 * R8.2B P1 — frozen-Git JSX DOM and callback contract regression.
 * Node-only; no browser server, production build, MySQL, or C's frozen baseline writes.
 * Run: node --test resources/js/pos/admin/views/owner-tables/component-tests/tables-presenters.test.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const views = path.resolve(here, '../..');
const frontend = path.resolve(views, '../../../../..');
const repository = path.resolve(frontend, '..');
const require = createRequire(path.join(frontend, 'package.json'));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const jsx = require('react/jsx-runtime');
const parentFile = path.join(views, 'OwnerTablesView.tsx');
const printFile = path.join(views, 'owner-tables/TablePrintStandee.tsx');
const copyFile = path.join(views, 'owner-tables/TableManualCopyDialog.tsx');
const baseline = execFileSync(
    'git',
    [
        'show',
        '7af6ab5:frontend/resources/js/pos/admin/views/OwnerTablesView.tsx',
    ],
    { cwd: repository, encoding: 'utf8' },
);
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const originalSha =
    'ea6c0c35c64fbae7271bfabd38b23412b997a6a1030a8671b4878d91de4caa94';
const fakeToken = 'A'.repeat(64);
const fakeUrl = 'https://example.invalid/table/' + fakeToken;
const sampleTable = {
    id: 21,
    code: 'B7',
    name: 'Outdoor Bench',
    area: 'Outdoor',
    seats: 4,
};
const translation = (key) => '{' + key + '}';
const icons = {
    RiPrinterLine: ({ size }) =>
        React.createElement('svg', { 'data-icon': 'printer', width: size }),
    RiCloseLine: ({ size }) =>
        React.createElement('svg', { 'data-icon': 'close', width: size }),
};

function compileTsx(file, source) {
    const output = ts.transpileModule(source, {
        fileName: file,
        compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    });
    const module = { exports: {} };
    const executable = new vm.Script(
        '(function(require, module, exports){\n' + output.outputText + '\n})',
        { filename: file },
    ).runInThisContext();
    executable(
        (id) => {
            if (id === 'react/jsx-runtime') return jsx;
            if (id === '@remixicon/react') return icons;
            throw Error(
                'Unexpected runtime import from isolated presenter ' + id,
            );
        },
        module,
        module.exports,
    );
    return module.exports;
}
function extractBaselineJsx(startMarker, endMarker) {
    const start = baseline.indexOf(startMarker);
    const end = baseline.indexOf(endMarker, start);
    assert.ok(start >= 0 && end > start, 'Baseline JSX boundary missing');
    return baseline.slice(start, end).trim();
}
function originalPrint(props) {
    const piece = extractBaselineJsx(
        '{tableToPrint && (',
        '\n            {manualCopyUrl && (',
    );
    const code = [
        "import { RiPrinterLine as Printer, RiCloseLine as X } from '@remixicon/react';",
        'export function LegacyPrint(p) {',
        'const tableToPrint=p.table; const printUrl=p.url; const printQrImage=p.qrImage;',
        'const t=p.t; const setTableToPrint=p.setTableToPrint;',
        'return (<>{' + piece.replace(/^\{|\}$/g, '') + '}</>);',
        '}',
    ].join('\n');
    return compileTsx('LegacyPrint.tsx', code).LegacyPrint(props);
}
function originalCopy(props) {
    const piece = extractBaselineJsx(
        '{manualCopyUrl && (',
        '\n            {/* Feedback Toast */}',
    );
    const code = [
        'export function LegacyCopy(p) {',
        'const manualCopyUrl=p.url; const setManualCopyUrl=p.setManualCopyUrl;',
        'const copyCustomerLink=p.copyCustomerLink;',
        'const setCopyToast=p.setCopyToast;',
        'return (<>{' + piece.replace(/^\{|\}$/g, '') + '}</>);',
        '}',
    ].join('\n');
    return compileTsx('LegacyCopy.tsx', code).LegacyCopy(props);
}
function getPrint() {
    return compileTsx(printFile, fs.readFileSync(printFile, 'utf8'))
        .TablePrintStandee;
}
function getCopy() {
    return compileTsx(copyFile, fs.readFileSync(copyFile, 'utf8'))
        .TableManualCopyDialog;
}
function visit(tree, predicate, found = []) {
    if (Array.isArray(tree)) {
        for (const child of tree) visit(child, predicate, found);
    } else if (React.isValidElement(tree)) {
        if (predicate(tree)) found.push(tree);
        if (typeof tree.type === 'function')
            visit(tree.type(tree.props), predicate, found);
        else visit(tree.props.children, predicate, found);
    }
    return found;
}
function classNode(tree, className) {
    const matches = visit(
        tree,
        (item) =>
            typeof item.props.className === 'string' &&
            item.props.className.split(/\s+/).includes(className),
    );
    assert.equal(matches.length, 1, 'Expected one .' + className);
    return matches[0];
}
function textButton(tree, value) {
    const matches = visit(
        tree,
        (item) =>
            item.type === 'button' &&
            (item.props.children === value ||
                item.props.children?.props?.children === value),
    );
    assert.equal(matches.length, 1, 'Expected one ' + value + ' button');
    return matches[0];
}
function markup(tree) {
    return renderToStaticMarkup(tree);
}
function getDeclarationBody(source, name, kind = 'variable') {
    const sf = ts.createSourceFile(
        'OwnerTablesView.tsx',
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    assert.equal(sf.parseDiagnostics.length, 0);
    let target;
    function walk(node) {
        if (
            kind === 'variable' &&
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.name.text === name
        ) {
            target = node.initializer?.getText(sf);
        }
        if (
            kind === 'function' &&
            ts.isFunctionDeclaration(node) &&
            node.name?.text === name
        ) {
            target = node.getText(sf);
        }
        ts.forEachChild(node, walk);
    }
    walk(sf);
    assert.ok(target, 'Missing ' + name + ' in OwnerTablesView');
    return target;
}

test('baseline Git source and current HEAD must be exactly locked for BEFORE reference', () => {
    assert.equal(sha(Buffer.from(baseline)), originalSha);
});

test('new components have explicit props and no hooks, QR generation, cache or server API', () => {
    for (const [file, exportName] of [
        [printFile, 'TablePrintStandee'],
        [copyFile, 'TableManualCopyDialog'],
    ]) {
        const src = fs.readFileSync(file, 'utf8');
        assert.match(src, new RegExp('export function ' + exportName + '\\('));
        assert.match(src, new RegExp(exportName + 'Props'));
        assert.doesNotMatch(
            src,
            /\b(useState|useEffect|useMemo|fetch|httpRequest|QRCode|navigator|localStorage)\b/,
        );
        assert.doesNotMatch(
            src,
            /server-tables|shared-query-cache|rotateSavedTableQrToken|getCustomerTableUrl/,
        );
    }
});

test('standee SSR DOM exactly equals committed original for visible QR, absent QR and alternate labels', () => {
    const Print = getPrint();
    for (const [qrImage, t] of [
        ['data:image/png;base64,dGVzdA==', translation],
        ['', translation],
        ['data:image/png;base64,dGVzdA==', (key) => 'id:' + key],
    ]) {
        const legacy = originalPrint({
            table: sampleTable,
            url: fakeUrl,
            qrImage,
            t,
            setTableToPrint: () => {},
        });
        const extracted = React.createElement(Print, {
            table: sampleTable,
            url: fakeUrl,
            qrImage,
            t,
            onClose: () => {},
            onPrint: () => {},
        });
        assert.equal(
            markup(extracted),
            markup(legacy),
            'Exact standee SSR markup regression',
        );
        const html = markup(extracted);
        assert.match(html, /id="printable-table-standee"/);
        assert.match(html, /standee-card-wrap/);
        if (qrImage) {
            assert.match(html, /width="170"/);
            assert.match(html, /height="170"/);
            assert.match(html, /alt="QR pemesanan meja B7"/);
        } else assert.doesNotMatch(html, /standee-qr-svg/);
    }
});

test('standee close, backdrop click, inner propagation and print callbacks remain independent', () => {
    const Print = getPrint();
    let closes = 0;
    let prints = 0;
    const tree = Print({
        table: sampleTable,
        url: fakeUrl,
        qrImage: '',
        t: translation,
        onClose: () => {
            closes++;
        },
        onPrint: () => {
            prints++;
        },
    });
    const overlay = classNode(tree, 'admin-modal-overlay');
    const inner = classNode(tree, 'standee-modal-content');
    let stopped = 0;
    inner.props.onClick({
        stopPropagation: () => {
            stopped++;
        },
    });
    assert.equal(stopped, 1);
    assert.equal(closes, 0);
    overlay.props.onClick();
    assert.equal(closes, 1);
    classNode(tree, 'standee-modal-close').props.onClick();
    assert.equal(closes, 2);
    textButton(tree, '{common.close}').props.onClick();
    assert.equal(closes, 3);
    classNode(tree, 'standee-btn-primary').props.onClick();
    assert.equal(prints, 1);
    assert.equal(closes, 3);
});

test('manual-copy SSR DOM exactly matches committed original including readonly URL, ARIA, link and autofocus', () => {
    const Copy = getCopy();
    const legacy = originalCopy({
        url: fakeUrl,
        setManualCopyUrl: () => {},
        copyCustomerLink: async () => true,
        setCopyToast: () => {},
    });
    const extracted = React.createElement(Copy, {
        url: fakeUrl,
        onClose: () => {},
        onRetryCopy: () => {},
    });
    assert.equal(
        markup(extracted),
        markup(legacy),
        'Manual clipboard fallback markup differs from frozen Git',
    );
    const tree = Copy({
        url: fakeUrl,
        onClose: () => {},
        onRetryCopy: () => {},
    });
    const dialog = classNode(tree, 'tables-copy-dialog');
    assert.equal(dialog.props.role, 'dialog');
    assert.equal(dialog.props['aria-modal'], 'true');
    assert.equal(dialog.props['aria-label'], 'Salin tautan pemesanan customer');
    const input = visit(
        tree,
        (el) => el.type === 'input' && el.props.id === 'customer-qr-url',
    )[0];
    assert.equal(input.props.value, fakeUrl);
    assert.equal(input.props.readOnly, true);
    assert.equal(input.props.autoFocus, true);
    assert.equal(
        visit(
            tree,
            (el) =>
                el.type === 'label' && el.props.htmlFor === 'customer-qr-url',
        ).length,
        1,
    );
    const anchors = visit(tree, (el) => el.type === 'a');
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].props.href, fakeUrl);
    assert.equal(anchors[0].props.target, '_blank');
    assert.equal(anchors[0].props.rel, 'noopener noreferrer');
});

test('manual-copy dialog callbacks retain overlay, stopPropagation, select on focus/click and retry delegation', () => {
    const Copy = getCopy();
    let closes = 0;
    let retries = 0;
    let selections = 0;
    let stopped = 0;
    const tree = Copy({
        url: fakeUrl,
        onClose: () => {
            closes++;
        },
        onRetryCopy: () => {
            retries++;
        },
    });
    classNode(tree, 'tables-copy-dialog').props.onClick({
        stopPropagation: () => {
            stopped++;
        },
    });
    assert.equal(stopped, 1);
    assert.equal(closes, 0);
    classNode(tree, 'admin-modal-overlay').props.onClick();
    assert.equal(closes, 1);
    const input = visit(
        tree,
        (el) => el.type === 'input' && el.props.id === 'customer-qr-url',
    )[0];
    const event = {
        currentTarget: {
            select: () => {
                selections++;
            },
        },
    };
    input.props.onFocus(event);
    input.props.onClick(event);
    assert.equal(selections, 2);
    textButton(tree, 'Tutup').props.onClick();
    assert.equal(closes, 2);
    textButton(tree, 'Coba salin lagi').props.onClick();
    assert.equal(retries, 1);
    assert.equal(closes, 2);
});

test('parent clipboard retry success/failure and 3000ms toast timer preserve baseline behavior', async () => {
    const parent = fs.readFileSync(parentFile, 'utf8');
    const expr = getDeclarationBody(parent, 'retryManualCopy');
    const make = new vm.Script(
        '(function(copyCustomerLink,setManualCopyUrl,setCopyToast,window,manualCopyUrl){return (' +
            expr +
            ');})',
    ).runInThisContext();
    for (const copied of [true, false]) {
        const states = { close: [], toast: [], timers: [], calls: [] };
        const retry = make(
            async (url) => {
                states.calls.push(url);
                return copied;
            },
            (value) => states.close.push(value),
            (value) => states.toast.push(value),
            {
                setTimeout: (fn, ms) => {
                    states.timers.push({ fn, ms });
                    return 1;
                },
            },
            fakeUrl,
        );
        retry();
        await Promise.resolve();
        await Promise.resolve();
        assert.deepEqual(states.calls, [fakeUrl]);
        if (copied) {
            assert.deepEqual(states.close, [null]);
            assert.deepEqual(states.toast, ['Tautan QR berhasil disalin.']);
            assert.equal(states.timers.length, 1);
            assert.equal(states.timers[0].ms, 3000);
            states.timers[0].fn();
            assert.deepEqual(states.toast, [
                'Tautan QR berhasil disalin.',
                null,
            ]);
        } else {
            assert.deepEqual(states.close, []);
            assert.deepEqual(states.toast, []);
            assert.deepEqual(states.timers, []);
        }
    }
});

test('parent business, cache, polling, CRUD, QR and clipboard algorithms remain text-identical to Git baseline', () => {
    const current = fs.readFileSync(parentFile, 'utf8');
    for (const name of [
        'fallbackClipboardCopy',
        'copyCustomerLink',
        'draftFromTable',
        'payloadFromDraft',
    ]) {
        assert.equal(
            getDeclarationBody(current, name, 'function'),
            getDeclarationBody(baseline, name, 'function'),
            name + ' algorithm changed',
        );
    }
    for (const name of [
        'reloadSavedTables',
        'selectedTable',
        'filteredTables',
        'tableStats',
        'startCreate',
        'startEdit',
        'clearFilters',
        'discardTableDraft',
        'resolveCustomerUrl',
        'handleCopyLink',
        'handlePrintTable',
        'saveTable',
        'requestRotateTableQr',
        'confirmRotateTableQr',
        'requestDeleteTable',
        'confirmDeleteTable',
    ]) {
        assert.equal(
            getDeclarationBody(current, name),
            getDeclarationBody(baseline, name),
            name + ' must remain unchanged',
        );
    }
    for (const invariant of [
        '15000',
        'setInterval',
        'visibilitychange',
        'getSavedTables',
        'QRCode.toDataURL',
        'errorCorrectionLevel',
        "'H'",
        'rotateSavedTableQrToken',
        'deleteSavedTable',
        'serverMode = false',
        '<OwnerTablesForm',
        '<OwnerTablesList',
        '<ConfirmModal',
    ])
        assert.ok(
            current.includes(invariant),
            'Missing parent invariant ' + invariant,
        );
    assert.match(current, /tableToPrint &&/);
    assert.match(current, /manualCopyUrl &&/);
    assert.match(current, /<TablePrintStandee/);
    assert.match(current, /<TableManualCopyDialog/);
});
