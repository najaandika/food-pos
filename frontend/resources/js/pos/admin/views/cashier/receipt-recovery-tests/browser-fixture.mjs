/**
 * Isolated Phase 2C browser fixture: uses actual CashierServer, CashierView,
 * ConfirmedReceiptModal, useCashierData, cashier-api, shared cache and HTTP.
 * Replaces only unrelated UI primitives/locale and DTO formatting with small
 * native test fixtures. Actual HTTP requests are intercepted by Playwright.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { rolldown } from 'rolldown';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
export const frontend = path.resolve(dirname, '../../../../../../..');
// Playwright is provided by the connected local QA tooling on this machine.
// Prefer a project install; do not add dependencies as part of Phase 2C.
function loadPlaywright() {
    try {
        return require('playwright');
    } catch (originalError) {
        try {
            const localQaRequire = createRequire(
                path.resolve(
                    frontend,
                    '../../../mcp-tools/VerityMCP/package.json',
                ),
            );
            return localQaRequire('playwright');
        } catch {
            throw originalError;
        }
    }
}
export const { chromium } = loadPlaywright();
const viewRoot = path.join(frontend, 'resources/js/pos/admin/views');
const reactPrelude = "import React from 'react';\n";

const entry = [
    "import React from 'react';",
    "import {createRoot} from 'react-dom/client';",
    "import {CashierServer} from 'virtual:cashier-server';",
    "import {setSharedQuerySession} from 'virtual:query-cache';",
    'setSharedQuerySession(9302);',
    'const root=createRoot(document.getElementById("root"));',
    'root.render(React.createElement(React.StrictMode,null,',
    'React.createElement(CashierServer,{user:{id:9302,role:"kasir",name:"Kasir QA",email:"cashier@example.test"}})));',
].join('\n');
const buttons =
    reactPrelude +
    [
        'export function Button(p){return React.createElement("button",{type:p.type??"button",',
        'disabled:p.disabled,onClick:p.onClick,className:p.className,',
        '"aria-label":p["aria-label"],title:p.title},p.children)}',
    ].join('');
const controls =
    reactPrelude +
    [
        'export function Badge(p){return React.createElement("span",{className:p.className},p.children)}',
        'export function Spinner(){return React.createElement("span",null,"Loading")}',
        'export function StatCards(p){return React.createElement("div",{className:"stat-cards"},',
        'p.stats?.map((s,i)=>React.createElement("div",{key:i},s.label," ",s.value)))}',
        'export function SegmentedControl(p){return React.createElement("div",{className:p.className},',
        'React.Children.map(p.children,c=>React.isValidElement(c)?React.cloneElement(c,',
        '{onPick:()=>p.onSelectionChange?.(new Set([c.props.id]))}):c))}',
        'export function SegmentedControlItem(p){return React.createElement("button",',
        '{type:"button",onClick:p.onPick},p.children)}',
        'export function Modal(p){if(!p.isOpen)return null;',
        'return React.createElement("div",{role:"dialog","aria-label":"Struk pembayaran lunas",',
        'className:p.className},typeof p.children==="function"?p.children(',
        '{close:()=>p.onOpenChange?.(false)}):p.children)}',
        'export function ModalBody(p){return React.createElement("div",{className:p.className},p.children)}',
        'export function ModalHeader(p){return React.createElement("h2",null,p.title)}',
        'export function ModalFooter(p){return React.createElement("div",null,p.children)}',
        'export function Input(p){return React.createElement("input",{',
        'type:p.type??"text",value:p.value??"",placeholder:p.placeholder,',
        '"aria-label":p["aria-label"],className:p.className,',
        'onChange:e=>p.onChange?.(e.target.value)})}',
    ].join('\n');
const orderMapper = [
    'export function toAdminOrders(orders){return orders.map(o=>({',
    'id:o.id,orderNumber:o.orderNumber,table:o.tableCode??"TA",',
    'tableCode:o.tableCode,tone:o.type==="takeaway"?"gold":"teal",',
    'name:o.customerName,meta:"Order #"+o.orderNumber,',
    'status:o.status==="paid"?"Completed":"Ready",',
    'statusTone:o.status==="paid"?"done":"ready",time:"10:00",',
    'total:"Rp "+o.total,rawSubtotal:Number(o.subtotal),',
    'rawTax:Number(o.tax),rawServiceCharge:Number(o.serviceCharge),',
    'rawTotal:Number(o.total),',
    'items:o.items.map(i=>[i.name,String(i.quantity),String(i.lineTotal)]),',
    'rawStatus:o.status,source:o.source,type:o.type,',
    'guests:o.guests,paymentMethod:o.paymentMethod',
    '}));}',
].join('\n');
const format =
    'export function formatRupiah(value){return "Rp "+Number(value||0).toLocaleString("id-ID")}';
const locale =
    reactPrelude +
    'export function useLocale(){return {locale:"id",t:key=>key}}';
const title =
    reactPrelude +
    'export function AdminTitle(p){return React.createElement("h1",null,p.title)}';
const classNames =
    'export function cx(...values){return values.filter(v=>typeof v==="string").join(" ")}';
const iconFileContents = [
    fs.readFileSync(path.join(viewRoot, 'CashierView.tsx'), 'utf8'),
    fs.readFileSync(
        path.join(viewRoot, 'cashier/ConfirmedReceiptModal.tsx'),
        'utf8',
    ),
].join('\n');
const icons = [
    ...new Set(iconFileContents.match(/\bRi[A-Z][A-Za-z0-9]+/g) ?? []),
];
const iconExports =
    reactPrelude +
    icons.map((name) => 'export const ' + name + '=()=>null;').join('\n');

export async function compileCashierBundle() {
    const virtual = new Map([
        ['\0r32-entry', entry],
        ['\0r32-button', buttons],
        ['\0r32-controls', controls],
        ['\0r32-mapper', orderMapper],
        ['\0r32-format', format],
        ['\0r32-locale', locale],
        ['\0r32-title', title],
        ['\0r32-cx', classNames],
        ['\0r32-icons', iconExports],
        ['\0r32-css', ''],
    ]);
    const bundle = await rolldown({
        input: 'virtual:r32-receipt-entry',
        platform: 'browser',
        plugins: [
            {
                name: 'phase2c-browser-fixture',
                resolveId(id, importer) {
                    if (id === 'virtual:r32-receipt-entry')
                        return '\0r32-entry';
                    if (id === 'virtual:cashier-server')
                        return path.join(viewRoot, 'orders/CashierServer.tsx');
                    if (id === 'virtual:query-cache')
                        return path.join(viewRoot, 'shared-query-cache.ts');
                    if (id === '@remixicon/react') return '\0r32-icons';
                    if (id === '..' && importer?.endsWith('CashierView.tsx'))
                        return '\0r32-title';
                    if (
                        id === '../i18n-context' &&
                        importer?.endsWith('CashierView.tsx')
                    )
                        return '\0r32-locale';
                    if (
                        id === '../../runtime-data' &&
                        importer?.endsWith('cashier-api.ts')
                    )
                        return '\0r32-mapper';
                    if (
                        id === '../../lib/format' ||
                        id === '../../../lib/format'
                    )
                        return '\0r32-format';
                    if (id === '../../../../../utils/cx') return '\0r32-cx';
                    if (id.endsWith('.css')) return '\0r32-css';
                    if (id.includes('/components/base/buttons/button'))
                        return '\0r32-button';
                    if (id.includes('/components/')) return '\0r32-controls';
                    if (id === 'react')
                        return path.join(
                            frontend,
                            'node_modules/react/index.js',
                        );
                    if (id === 'react-dom/client')
                        return path.join(
                            frontend,
                            'node_modules/react-dom/client.js',
                        );
                    return null;
                },
                load(id) {
                    return virtual.get(id) ?? null;
                },
            },
        ],
    });
    try {
        const generated = await bundle.generate({
            format: 'iife',
            name: 'CashierReceiptRecoveryQA',
        });
        const code = generated.output
            .filter((f) => f.type === 'chunk')
            .map((f) => f.code)
            .join('\n');
        if (code.length < 100000)
            throw Error('Cashier real UI bundle unexpectedly small');
        return code;
    } finally {
        await bundle.close();
    }
}

export function posOrder(id, status = 'ready') {
    return {
        id,
        orderNumber: 'POS-' + id,
        tableCode: 'T01',
        customerName: 'Nina',
        status,
        type: 'dine_in',
        source: 'manual',
        guests: 2,
        subtotal: 25000,
        tax: 0,
        serviceCharge: 0,
        total: 25000,
        items: [
            {
                id: id * 100,
                menuItemId: 7,
                name: 'Nasi',
                quantity: 1,
                unitPrice: 25000,
                lineTotal: 25000,
            },
        ],
        createdAt: '2026-11-07T08:00:00Z',
        updatedAt: '2026-11-07T08:00:00Z',
    };
}
export function posReceipt(id) {
    return {
        ...posOrder(id, 'paid'),
        discount: '0.00',
        payment: {
            id: id * 10,
            status: 'paid',
            method: 'cash',
            amount: '25000.00',
            cashReceived: '25000.00',
            cashChange: '0.00',
            paidAt: '2026-11-07T08:00:00Z',
        },
    };
}
export function queueBody(orders) {
    return {
        data: orders,
        current_page: 1,
        last_page: 1,
        total: orders.length,
        stats: {
            unpaidCount: orders.length,
            waitingCount: 0,
            paidCount: 0,
            paidTotal: '0.00',
            cashPaidCount: 0,
            cashPaidTotal: '0.00',
        },
    };
}
export const responseJson = (body, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
});
function compiledCssFiles() {
    const manifestPath = path.resolve(
        frontend,
        '../backend/public/build/manifest.json',
    );
    if (!fs.existsSync(manifestPath)) return [];
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const names = [
        ...(manifest['resources/js/app.tsx']?.css ?? []),
        ...(manifest['resources/js/pages/dashboard.tsx']?.css ?? []),
    ];
    return [...new Set(names)]
        .map((name) => path.resolve(frontend, '../backend/public/build', name))
        .filter((p) => fs.existsSync(p))
        .map((p) => fs.readFileSync(p));
}
export async function startIsolatedCashierServer() {
    const code = await compileCashierBundle();
    const styles = compiledCssFiles();
    const html =
        '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        styles
            .map(
                (_, i) =>
                    '<link rel="stylesheet" href="/qa-style-' + i + '.css">',
            )
            .join('') +
        '</head><body><div class="page-shell pos-shell-layout">' +
        '<main class="main-panel" id="pos-main-content"><div id="root"></div></main>' +
        '</div><script src="/qa-bundle.js"></script></body></html>';
    const server = http.createServer((req, res) => {
        if (req.url === '/qa-bundle.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(code);
            return;
        }
        const styleId = /^\/qa-style-(\d+)\.css$/.exec(req.url ?? '');
        if (styleId && styles[Number(styleId[1])]) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(styles[Number(styleId[1])]);
            return;
        }
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
            return;
        }
        res.writeHead(404);
        res.end('Not found');
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return {
        url: 'http://127.0.0.1:' + server.address().port + '/',
        cssCount: styles.length,
        async close() {
            await new Promise((resolve) => server.close(resolve));
        },
    };
}
