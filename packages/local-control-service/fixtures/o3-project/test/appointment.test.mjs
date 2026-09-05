import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCustomerName } from '../src/appointment.mjs';

test('returns a trimmed non-empty customer name', () => {
  assert.equal(normalizeCustomerName('  Ana María  '), 'Ana María');
});

for (const value of ['', '   ', null, 42]) {
  test(`rejects invalid customer name ${JSON.stringify(value)}`, () => {
    assert.throws(() => normalizeCustomerName(value), { name: 'TypeError', message: 'CUSTOMER_NAME_REQUIRED' });
  });
}
