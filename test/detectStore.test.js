import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectStore } from '../src/products/detectStore.js';

test('detectStore recognizes every store with a registered scraper', () => {
  assert.equal(detectStore('https://www.mercadolivre.com.br/produto/x'), 'mercadolivre');
  assert.equal(detectStore('https://produto.mercadolivre.com.br/x'), 'mercadolivre');
  assert.equal(detectStore('https://www.amazon.com.br/dp/B000X'), 'amazon');
  assert.equal(detectStore('https://www.casasbahia.com.br/produto/x'), 'casasbahia');
  assert.equal(detectStore('https://www.netshoes.com.br/produto/x'), 'netshoes');
});

test('detectStore throws for a store with no registered scraper', () => {
  // Regression test: Magalu URLs used to be silently classified as
  // store="magalu" even though no scraper exists for it, so a product could
  // be added but would fail confusingly on every future check. It must now
  // be rejected up front, the same as any other unsupported store.
  assert.throws(() => detectStore('https://www.magazineluiza.com.br/produto/x'), /Não foi possível identificar/);
});

test('detectStore throws for a completely unrecognized URL', () => {
  assert.throws(() => detectStore('https://example.com/product/x'), /Não foi possível identificar/);
});
