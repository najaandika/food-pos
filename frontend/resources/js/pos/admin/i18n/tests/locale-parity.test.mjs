/**
 * R8.1B: Independent translation parity against immutable Git 349f3c2.
 * Does not rely on a hand-copied snapshot of keys or values. No writes.
 * Run from frontend: node --test resources/js/pos/admin/i18n/tests/locale-parity.test.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const admin = path.resolve(here, '../..');
const frontend = path.resolve(admin, '../../../..');
const repository = path.resolve(frontend, '..');
const facade = path.join(admin, 'i18n.ts');
const enFile = path.join(admin, 'i18n/locales/en.ts');
const idFile = path.join(admin, 'i18n/locales/id.ts');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

const baseline = execFileSync(
    'git',
    ['show', '349f3c2:frontend/resources/js/pos/admin/i18n.ts'],
    { cwd: repository, encoding: 'utf8' },
);
const baselineSha =
    'a03b673f0204f1679d29004c3b57895469973e211145f811268e439ffbc80839';
const expectedEntryDigests = {
    en: 'ac1a7d85d297a112f48045cff7b143b73f8b3c22fead0aaa6fb4224216506426',
    id: 'a3047c2b657fb9925d50bdb720c8c427e76fed684d56e4df1db2d804e633932a',
};

function parsed(file, source) {
    const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
    assert.equal(
        ast.parseDiagnostics.length,
        0,
        'TypeScript parse failed: ' + file,
    );
    return ast;
}
function getDictionary(file, source, variableName) {
    const ast = parsed(file, source);
    const decl = ast.statements
        .filter(ts.isVariableStatement)
        .flatMap((statement) => [...statement.declarationList.declarations])
        .find(
            (declaration) =>
                ts.isIdentifier(declaration.name) &&
                declaration.name.text === variableName,
        );
    assert.ok(
        decl &&
            decl.initializer &&
            ts.isObjectLiteralExpression(decl.initializer),
        'Dictionary variable missing or not an object: ' + variableName,
    );
    return { ast, object: decl.initializer };
}
function propertyName(node) {
    assert.ok(
        ts.isIdentifier(node) ||
            ts.isStringLiteral(node) ||
            ts.isNumericLiteral(node),
        'Unsupported dynamic key changes semantics',
    );
    return node.text;
}
function entries(file, source, object) {
    const ast = parsed(file, source);
    return object.properties.map((property) => {
        assert.ok(
            ts.isPropertyAssignment(property),
            'Unexpected dictionary spread/getter/method',
        );
        assert.ok(
            ts.isStringLiteral(property.initializer),
            'All translation values must remain string literals',
        );
        return {
            key: propertyName(property.name),
            value: property.initializer.text,
            rawLiteral: property.initializer.getText(ast),
        };
    });
}
function baselineEntries(locale) {
    const { object } = getDictionary(
        'baseline/i18n.ts',
        baseline,
        'translations',
    );
    const property = object.properties.find(
        (x) => propertyName(x.name) === locale,
    );
    assert.ok(
        property &&
            ts.isPropertyAssignment(property) &&
            ts.isObjectLiteralExpression(property.initializer),
        'Baseline locale missing: ' + locale,
    );
    return entries('baseline/i18n.ts', baseline, property.initializer);
}
function extractedEntries(locale) {
    const file = locale === 'en' ? enFile : idFile;
    const text = fs.readFileSync(file, 'utf8');
    const { object } = getDictionary(file, text, locale + 'Translations');
    return entries(file, text, object);
}
function effectiveMap(dictionaryEntries) {
    const result = {};
    for (const { key, value } of dictionaryEntries) {
        Object.defineProperty(result, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
        });
    }
    return result;
}
function duplicateKeys(dictionaryEntries) {
    const seen = new Set();
    const dup = [];
    for (const { key } of dictionaryEntries) {
        if (seen.has(key)) dup.push(key);
        seen.add(key);
    }
    return dup;
}
function loadTranspiled(entryFile, initialSource) {
    // Load real TS modules with exactly their CJS-transpiled runtime
    // semantics. This accommodates Vite's extensionless TS imports without
    // running Vite or writing files.
    const cache = new Map();
    function visit(file, override) {
        const absolute = path.resolve(file);
        if (cache.has(absolute)) return cache.get(absolute).exports;
        const module = { exports: {} };
        cache.set(absolute, module);
        const source = override ?? fs.readFileSync(absolute, 'utf8');
        const output = ts.transpileModule(source, {
            fileName: absolute,
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                esModuleInterop: true,
            },
        });
        assert.ok(
            !output.diagnostics?.some(
                (item) => item.category === ts.DiagnosticCategory.Error,
            ),
            'TS transpile diagnostics in ' + absolute,
        );
        const execute = new vm.Script(
            '(function(require, module, exports) {\n' +
                output.outputText +
                '\n})',
            { filename: absolute },
        ).runInThisContext();
        const importer = (specifier) => {
            assert.ok(
                specifier.startsWith('.'),
                'Unexpected third-party runtime import ' + specifier,
            );
            const candidate = path.resolve(path.dirname(absolute), specifier);
            const resolved = fs.existsSync(candidate)
                ? candidate
                : candidate + '.ts';
            return visit(resolved);
        };
        execute(importer, module, module.exports);
        return module.exports;
    }
    return visit(entryFile, initialSource);
}

test('frozen Git baseline is exact and contains 501 ordered entries in each locale', () => {
    assert.equal(sha(baseline), baselineSha, 'Git baseline bytes drifted');
    for (const locale of ['en', 'id']) {
        const data = baselineEntries(locale);
        assert.equal(data.length, 501);
        assert.equal(new Set(data.map((item) => item.key)).size, 501);
        assert.deepEqual(duplicateKeys(data), []);
        assert.equal(
            sha(
                JSON.stringify(
                    data.map(({ key, value, rawLiteral }) => [
                        key,
                        value,
                        rawLiteral,
                    ]),
                ),
            ),
            expectedEntryDigests[locale],
        );
    }
});

test('extracted English and Indonesian preserve EVERY key, string literal and occurrence order', () => {
    for (const locale of ['en', 'id']) {
        const original = baselineEntries(locale);
        const extracted = extractedEntries(locale);
        assert.deepEqual(
            extracted,
            original,
            'Order/key/value/raw literal changed for locale ' + locale,
        );
        assert.deepEqual(duplicateKeys(extracted), duplicateKeys(original));
        assert.deepEqual(
            Object.keys(effectiveMap(extracted)),
            Object.keys(effectiveMap(original)),
            'Resolved object key order changed',
        );
        assert.deepEqual(effectiveMap(extracted), effectiveMap(original));
    }
});

test('public i18n facade keeps Locale, t signature, exports and exact nullish fallback', () => {
    const source = fs.readFileSync(facade, 'utf8');
    assert.match(source, /export type Locale = 'en' \| 'id';/);
    assert.match(
        source,
        /export function t\(key: string, locale: Locale\): string/,
    );
    assert.match(
        source,
        /return translations\[locale\]\[key\] \?\? translations\.en\[key\] \?\? key;/,
    );
    assert.match(source, /export \{ translations \};/);
    assert.match(source, /from '\.\/i18n\/locales\/en'/);
    assert.match(source, /from '\.\/i18n\/locales\/id'/);
    const value = loadTranspiled(facade);
    assert.equal(typeof value.t, 'function');
    assert.deepEqual(Object.keys(value.translations), ['en', 'id']);
});

test('runtime dictionary keys, ordering, string values and full key lookup match committed facade', () => {
    const previous = loadTranspiled(facade, baseline);
    const current = loadTranspiled(facade);
    for (const locale of ['en', 'id']) {
        const actualKeys = Object.keys(current.translations[locale]);
        assert.deepEqual(
            actualKeys,
            Object.keys(previous.translations[locale]),
        );
        assert.equal(actualKeys.length, 501);
        for (const key of actualKeys) {
            assert.equal(
                current.translations[locale][key],
                previous.translations[locale][key],
                locale + '/' + key,
            );
            assert.equal(
                current.t(key, locale),
                previous.t(key, locale),
                't() changed for ' + locale + '/' + key,
            );
        }
    }
    assert.equal(
        Object.isFrozen(current.translations),
        Object.isFrozen(previous.translations),
    );
    assert.equal(
        Object.getPrototypeOf(current.translations.en),
        Object.getPrototypeOf(previous.translations.en),
    );
});

test('fallback English, unknown key and nullish-vs-empty behavior remain exact', () => {
    const previous = loadTranspiled(facade, baseline);
    const current = loadTranspiled(facade);
    const key = 'nav.home';
    const missing = '__r81_completely_unknown_key__';
    assert.equal(current.t(missing, 'id'), missing);
    assert.equal(current.t(missing, 'en'), missing);
    assert.equal(current.t(missing, 'id'), previous.t(missing, 'id'));
    for (const instance of [previous, current]) {
        const originalId = instance.translations.id[key];
        const originalEn = instance.translations.en[key];
        try {
            delete instance.translations.id[key];
            assert.equal(
                instance.t(key, 'id'),
                originalEn,
                'English fallback when Indonesian key missing',
            );
            instance.translations.id[key] = '';
            assert.equal(
                instance.t(key, 'id'),
                '',
                'Empty string must not trigger fallback',
            );
            instance.translations.id[key] = null;
            assert.equal(
                instance.t(key, 'id'),
                originalEn,
                'Nullish value triggers English fallback',
            );
            instance.translations.id[key] = undefined;
            assert.equal(
                instance.t(key, 'id'),
                originalEn,
                'Undefined value triggers English fallback',
            );
        } finally {
            instance.translations.id[key] = originalId;
        }
    }
    const prototypeKey = 'toString';
    assert.equal(
        typeof current.t(prototypeKey, 'id'),
        typeof previous.t(prototypeKey, 'id'),
        'Preserve existing inherited property behavior',
    );
    assert.throws(
        () => current.t('nav.home', 'fr'),
        TypeError,
        'Unsupported locale behavior must remain unchanged',
    );
    assert.throws(() => previous.t('nav.home', 'fr'), TypeError);
});

test('cross-locale key inventory stays identical to frozen committed source', () => {
    const english = baselineEntries('en');
    const indonesian = baselineEntries('id');
    const currentEn = extractedEntries('en');
    const currentId = extractedEntries('id');
    assert.deepEqual(
        currentEn.map((item) => item.key),
        english.map((item) => item.key),
    );
    assert.deepEqual(
        currentId.map((item) => item.key),
        indonesian.map((item) => item.key),
    );
    assert.deepEqual(
        currentEn.map((item) => item.key),
        currentId.map((item) => item.key),
    );
});
