import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function parseTsx(file) {
    const source = read(file);
    const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    assert.equal(ast.parseDiagnostics.length, 0, file + ' must have valid JSX');
    return { source, ast };
}

const parent = parseTsx('CashierView.tsx');
const queue = parseTsx('cashier/components/CashierQueuePanel.tsx');
const tender = parseTsx('cashier/components/CashierTenderForm.tsx');
const preview = parseTsx('cashier/components/CashierBillPreviewModal.tsx');

void test('CashierView remains the sole owner of payment mutations, selection and money calculations', () => {
    for (const name of [
        'confirmMarkPaid',
        'setSelectedId',
        'setPaymentError',
        'setPaymentNotice',
        'selectedPayable',
        'cashReceived',
        'cashPresetOptions',
        'cashierDetail',
        'receiptRecoveries',
    ]) {
        assert.match(parent.source, new RegExp('\\b' + name + '\\b'));
    }
    for (const file of [queue, tender, preview]) {
        assert.doesNotMatch(
            file.source,
            /\b(useState|useEffect|useCashierData|cashierPayCash|cashierReceipt|fetch|httpRequest)\s*\(/,
        );
        assert.doesNotMatch(
            file.source,
            /\b(onMarkPaid|onMarkPaid\s*\(|idempotency_key|idempotencyKey)\b/,
        );
    }
    assert.match(
        tender.source,
        /onConfirmPayment\(\)/,
        'the tender must delegate settlement to CashierView',
    );
    assert.match(parent.source, /onConfirmPayment=\{confirmMarkPaid\}/);
});

void test('Queue owns presentation only; filter, search, order selection and pagination callbacks remain external', () => {
    assert.match(queue.source, /onFilterSelect\(next\)/);
    assert.match(queue.source, /onQueryChange\(value\)/);
    assert.match(queue.source, /onSelectOrder\(order\.id\)/);
    assert.match(queue.source, /onReset\(\)/);
    assert.match(queue.source, /onPageChange\?\.\(pagination\.page/);
    assert.match(parent.source, /setMobileTab\('detail'\)/);
    for (const selector of [
        'cashier-feed',
        'cashier-order-row',
        'cashier-pagination',
        'cashier-empty-queue',
        'cashier-queue-segments',
        'cashier-search-input',
    ]) {
        assert.ok(
            queue.source.includes(selector),
            'missing original queue selector ' + selector,
        );
    }
});

void test('Tender keeps payment validation controls while parent decides settlement eligibility', () => {
    for (const selector of [
        'payment-methods',
        'cashier-quick-cash',
        'cash-preset-grid',
        'cashier-cash-input',
        'cashier-tendered',
        'cashier-safety-note',
        'cashier-actions',
    ]) {
        assert.ok(
            tender.source.includes(selector),
            'missing tender selector ' + selector,
        );
    }
    assert.match(tender.source, /disabled=\{!canMarkPaid\}/);
    assert.match(tender.source, /onMethodChange\(option\.key\)/);
    assert.match(tender.source, /onPresetChange\('exact'\)/);
    assert.match(tender.source, /onCashInputChange\(value\.replace/);
    assert.match(parent.source, /cashReceived >= total/);
    assert.match(parent.source, /discountAmount === 0/);
    assert.match(parent.source, /method === 'cash'/);
    assert.match(parent.source, /selectedPayable/);
});

void test('Unverified bill preview preserves canonical Modal lifecycle and printable selector', () => {
    assert.match(
        preview.source,
        /isOpen=\{showReceiptModal && Boolean\(selectedOrder\)\}/,
    );
    assert.match(preview.source, /onOpenChange=\{setShowReceiptModal\}/);
    assert.match(preview.source, /id="printable-pos-receipt"/);
    assert.match(preview.source, /BELUM TERVERIFIKASI · BUKAN BUKTI BAYAR/);
    assert.match(preview.source, /onClick=\{\(\) => window\.print\(\)\}/);
    assert.match(parent.source, /setReceiptOpenedAt\(new Date\(\)\)/);
    assert.match(parent.source, /setShowReceiptModal\(true\)/);
});
