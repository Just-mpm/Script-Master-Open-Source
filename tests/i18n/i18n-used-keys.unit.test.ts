import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { dictionaries, DEFAULT_LOCALE } from '../../src/features/i18n/locales';
import type { TranslationDictionary } from '../../src/features/i18n/types';
import { getNestedValue } from '../../src/features/i18n/utils';

interface I18nKeyUsage {
  key: string;
  file: string;
  line: number;
  column: number;
}

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SOURCE_ROOT = path.join(PROJECT_ROOT, 'src');
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist']);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry.name) ? [] : listSourceFiles(fullPath);
    }

    return SCANNED_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function getStringLiteralArgument(node: ts.CallExpression): string | null {
  const firstArg = node.arguments[0];
  if (!firstArg) return null;

  if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
    return firstArg.text;
  }

  return null;
}

function isTranslationCall(node: ts.CallExpression): boolean {
  const { expression } = node;

  if (ts.isIdentifier(expression)) {
    return expression.text === 't';
  }

  return ts.isPropertyAccessExpression(expression) && expression.name.text === 't';
}

function createSourceFile(filePath: string): ts.SourceFile {
  const source = readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
}

function getLocation(sourceFile: ts.SourceFile, node: ts.Node): Pick<I18nKeyUsage, 'line' | 'column'> {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
}

function collectUsagesFromNode(sourceFile: ts.SourceFile, node: ts.Node): I18nKeyUsage[] {
  const children = node.getChildren(sourceFile).flatMap((child) => collectUsagesFromNode(sourceFile, child));
  if (!ts.isCallExpression(node) || !isTranslationCall(node)) return children;

  const key = getStringLiteralArgument(node);
  if (!key) return children;

  const relativeFile = path.relative(PROJECT_ROOT, sourceFile.fileName).replaceAll(path.sep, '/');
  return [{ key, file: relativeFile, ...getLocation(sourceFile, node) }, ...children];
}

function collectI18nKeyUsages(): I18nKeyUsage[] {
  return listSourceFiles(SOURCE_ROOT)
    .map(createSourceFile)
    .flatMap((sourceFile) => collectUsagesFromNode(sourceFile, sourceFile))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function formatMissingUsage(usage: I18nKeyUsage): string {
  return `${usage.key} (${usage.file}:${usage.line}:${usage.column})`;
}

describe('i18n used keys', () => {
  it('mantém toda chave literal usada em t(...) existente no locale base', () => {
    expect(existsSync(SOURCE_ROOT)).toBe(true);

    const baseDictionary: TranslationDictionary = dictionaries[DEFAULT_LOCALE];
    const missingUsages = collectI18nKeyUsages()
      .filter((usage) => getNestedValue(baseDictionary, usage.key) === undefined)
      .map(formatMissingUsage);

    expect(missingUsages.join('\n')).toBe('');
  });
});
