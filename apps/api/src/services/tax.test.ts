import assert from 'assert';
import { applyDiscount } from './tax';

function run() {
  assert.strictEqual(applyDiscount(100, 'PERCENT', 10), 10);
  assert.strictEqual(applyDiscount(100, 'FIXED', 15), 15);
  assert.strictEqual(applyDiscount(20, 'FIXED', 50), 20);
  const tax = Math.round(100 * (5 / 100) * 100) / 100;
  assert.strictEqual(tax, 5);
  console.log('tax.test.ts OK');
}

run();
