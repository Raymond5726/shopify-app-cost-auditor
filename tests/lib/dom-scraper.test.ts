import { describe, it, expect } from 'vitest';
import { parseDollarAmount } from '../../src/lib/dom-scraper';

describe('parseDollarAmount', () => {
  it('parses simple dollar amount "$12.99"', () => {
    expect(parseDollarAmount('$12.99')).toBe(12.99);
  });

  it('parses amount with /month suffix', () => {
    expect(parseDollarAmount('$29.99/month')).toBe(29.99);
  });

  it('parses amount with USD suffix', () => {
    expect(parseDollarAmount('$149.99 USD')).toBe(149.99);
  });

  it('parses amount with commas', () => {
    expect(parseDollarAmount('$1,299.00')).toBe(1299);
  });

  it('parses amount without dollar sign', () => {
    expect(parseDollarAmount('49.95')).toBe(49.95);
  });

  it('returns 0 for empty string', () => {
    expect(parseDollarAmount('')).toBe(0);
  });

  it('returns 0 for string with no numeric content', () => {
    expect(parseDollarAmount('Free')).toBe(0);
  });

  it('parses whole number without decimals', () => {
    expect(parseDollarAmount('$10')).toBe(10);
  });

  it('parses amount with space after dollar sign', () => {
    expect(parseDollarAmount('$ 25.00')).toBe(25);
  });

  it('parses amount embedded in longer text', () => {
    expect(parseDollarAmount('Costs $5.99 per month')).toBe(5.99);
  });
});
