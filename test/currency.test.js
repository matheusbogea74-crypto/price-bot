import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBRLPrice, formatBRLPrice } from '../src/utils/currency.js';

test('parseBRLPrice extracts a Brazilian-real amount from a larger string', () => {
  assert.equal(parseBRLPrice('R$ 1.234,56'), 1234.56);
  assert.equal(parseBRLPrice('De: R$ 999,00'), 999);
  assert.equal(parseBRLPrice('Preço da Oferta: R$ 79,90 à vista'), 79.9);
});

test('parseBRLPrice returns null when no price-like substring is present', () => {
  assert.equal(parseBRLPrice('no price here'), null);
  assert.equal(parseBRLPrice(undefined), null);
  assert.equal(parseBRLPrice(''), null);
});

test('formatBRLPrice formats a number with a comma decimal separator', () => {
  assert.equal(formatBRLPrice(1234.5), '1234,50');
  assert.equal(formatBRLPrice(99), '99,00');
  assert.equal(formatBRLPrice(0), '0,00');
});

test('parseBRLPrice and formatBRLPrice round-trip a value', () => {
  const original = 1999.9;
  const parsed = parseBRLPrice(`R$ ${formatBRLPrice(original)}`);
  assert.equal(parsed, original);
});
