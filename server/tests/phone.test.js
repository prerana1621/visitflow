import { describe, expect, it } from 'vitest';
import { normalisePhone, isValidPhone } from '../src/utils/phone.js';

describe('phone normalisation', () => {
  it('normalises a 10-digit Indian number to E.164', () => {
    expect(normalisePhone('98765 43210')).toBe('+919876543210');
  });
  it('accepts an already country-prefixed number', () => {
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210');
  });
  it('rejects malformed numbers and impossible mobile prefixes', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('1234567890')).toBe(false);
  });
  it('allows only the fixed synthetic buyer number for the demo', () => {
    expect(normalisePhone('0000000001')).toBe('+910000000001');
    expect(isValidPhone('0000000002')).toBe(false);
  });
});
