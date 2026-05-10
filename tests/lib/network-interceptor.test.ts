import { describe, it, expect } from 'vitest';
import { parseAppData, parseBillingData } from '../../src/lib/network-interceptor';

// ---- parseAppData ----

describe('parseAppData', () => {
  it('returns null for null input', () => {
    expect(parseAppData(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseAppData('string')).toBeNull();
    expect(parseAppData(42)).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(parseAppData({})).toBeNull();
  });

  it('parses apps from data.data.apps.edges (Shape 1 - edges)', () => {
    const data = {
      data: {
        apps: {
          edges: [
            { node: { title: 'Klaviyo', handle: 'klaviyo-email-marketing', id: 'gid://1' } },
            { node: { title: 'Loox', handle: 'loox', id: 'gid://2' } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe('Klaviyo');
    expect(result![0].handle).toBe('klaviyo-email-marketing');
    expect(result![1].name).toBe('Loox');
  });

  it('parses apps from data.data.appInstallations.edges', () => {
    const data = {
      data: {
        appInstallations: {
          edges: [
            { node: { title: 'Judge.me', handle: 'judge-me' } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Judge.me');
  });

  it('parses apps from flat data.apps array (no edges)', () => {
    const data = {
      apps: [
        { name: 'App One', handle: 'app-one' },
        { name: 'App Two', handle: 'app-two' },
      ],
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(2);
  });

  it('parses apps from data.data.apps flat array', () => {
    const data = {
      data: {
        apps: [
          { title: 'Flat App', handle: 'flat-app' },
        ],
      },
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Flat App');
  });

  it('extracts icon URL from icon.url', () => {
    const data = {
      data: {
        apps: {
          edges: [
            { node: { title: 'App', handle: 'app', icon: { url: 'https://cdn.example.com/icon.png' } } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result![0].icon).toBe('https://cdn.example.com/icon.png');
  });

  it('extracts icon URL from icon.src fallback', () => {
    const data = {
      data: {
        apps: {
          edges: [
            { node: { title: 'App', handle: 'app', icon: { src: 'https://cdn.example.com/icon2.png' } } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result![0].icon).toBe('https://cdn.example.com/icon2.png');
  });

  it('parses pricingDetails into monthlyCost', () => {
    const data = {
      data: {
        apps: {
          edges: [
            { node: { title: 'Paid App', handle: 'paid', pricingDetails: '$29.99/month' } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result![0].monthlyCost).toBe(29.99);
  });

  it('extracts isActive from installed boolean', () => {
    const data = {
      apps: [
        { name: 'Active', handle: 'active', installed: true },
        { name: 'Inactive', handle: 'inactive', installed: false },
      ],
    };
    const result = parseAppData(data);
    expect(result![0].isActive).toBe(true);
    expect(result![1].isActive).toBe(false);
  });

  it('extracts isActive from status string', () => {
    const data = {
      apps: [
        { name: 'Active', handle: 'active', status: 'ACTIVE' },
        { name: 'Inactive', handle: 'inactive', status: 'disabled' },
      ],
    };
    const result = parseAppData(data);
    expect(result![0].isActive).toBe(true);
    expect(result![1].isActive).toBe(false);
  });

  it('parses single app from data.data.currentAppInstallation (Shape 2)', () => {
    const data = {
      data: {
        currentAppInstallation: {
          title: 'Current App',
          handle: 'current-app',
        },
      },
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Current App');
  });

  it('parses single app from data.data.app', () => {
    const data = {
      data: {
        app: {
          name: 'Single App',
          handle: 'single-app',
        },
      },
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Single App');
  });

  it('skips nodes without name or handle', () => {
    const data = {
      apps: [
        { title: 'Valid', handle: 'valid' },
        { description: 'Missing name/handle' },
      ],
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Valid');
  });

  it('skips null nodes in edges array', () => {
    const data = {
      data: {
        apps: {
          edges: [
            { node: null },
            { node: { title: 'Valid', handle: 'valid' } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result).toHaveLength(1);
  });

  it('uses "name" field when "title" is absent', () => {
    const data = {
      apps: [{ name: 'Name Field App', handle: 'nf' }],
    };
    const result = parseAppData(data);
    expect(result![0].name).toBe('Name Field App');
  });

  it('handles pricingDetails with commas', () => {
    const data = {
      data: {
        apps: {
          edges: [
            { node: { title: 'Expensive', handle: 'exp', pricingDetails: '$1,299.00/month' } },
          ],
        },
      },
    };
    const result = parseAppData(data);
    expect(result![0].monthlyCost).toBe(1299);
  });
});

// ---- parseBillingData ----

describe('parseBillingData', () => {
  it('returns null for null input', () => {
    expect(parseBillingData(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseBillingData(42)).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(parseBillingData({})).toBeNull();
  });

  it('parses subscriptions from data.data.currentAppInstallation.activeSubscriptions', () => {
    const data = {
      data: {
        currentAppInstallation: {
          activeSubscriptions: [
            {
              name: 'Klaviyo Pro',
              price: { amount: 45, currencyCode: 'USD' },
              interval: 'MONTHLY',
            },
          ],
        },
      },
    };
    const result = parseBillingData(data);
    expect(result).toHaveLength(1);
    expect(result![0].appName).toBe('Klaviyo Pro');
    expect(result![0].amount).toBe(45);
    expect(result![0].currency).toBe('USD');
    expect(result![0].cycle).toBe('monthly');
  });

  it('parses subscriptions from data.data.appSubscriptions.edges', () => {
    const data = {
      data: {
        appSubscriptions: {
          edges: [
            {
              node: {
                name: 'Loox Premium',
                price: { amount: '19.99', currencyCode: 'USD' },
                interval: 'ANNUAL',
              },
            },
          ],
        },
      },
    };
    const result = parseBillingData(data);
    expect(result).toHaveLength(1);
    expect(result![0].appName).toBe('Loox Premium');
    expect(result![0].amount).toBe(19.99);
    expect(result![0].cycle).toBe('annual');
  });

  it('parses subscriptions from data.data.activeSubscriptions', () => {
    const data = {
      data: {
        activeSubscriptions: [
          {
            name: 'Direct Sub',
            amount: 10,
            currencyCode: 'EUR',
            interval: 'MONTHLY',
          },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result).toHaveLength(1);
    expect(result![0].amount).toBe(10);
    expect(result![0].currency).toBe('EUR');
  });

  it('parses charges from data.data.charges.edges', () => {
    const data = {
      data: {
        charges: {
          edges: [
            {
              node: {
                name: 'Charge App',
                amount: 5.99,
                currencyCode: 'USD',
              },
            },
          ],
        },
      },
    };
    const result = parseBillingData(data);
    expect(result).toHaveLength(1);
    expect(result![0].appName).toBe('Charge App');
    expect(result![0].amount).toBe(5.99);
    expect(result![0].cycle).toBe('monthly');
  });

  it('parses charges from data.data.appCharges flat array', () => {
    const data = {
      data: {
        appCharges: [
          { appName: 'Flat Charge', amount: '7.50' },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result).toHaveLength(1);
    expect(result![0].appName).toBe('Flat Charge');
    expect(result![0].amount).toBe(7.5);
  });

  it('uses appName field when name is absent', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { appName: 'Alt Name', amount: 10 },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].appName).toBe('Alt Name');
  });

  it('extracts billingDate from billingOn', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'App', amount: 10, billingOn: '2024-01-15' },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].billingDate).toBe('2024-01-15');
  });

  it('extracts billingDate from createdAt fallback', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'App', amount: 10, createdAt: '2024-02-20T10:00:00Z' },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].billingDate).toBe('2024-02-20T10:00:00Z');
  });

  it('detects one-time interval', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'OneTime', amount: 50, interval: 'ONE_TIME' },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].cycle).toBe('one-time');
  });

  it('skips entries without appName or amount', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'Valid', amount: 10 },
          { name: 'No Amount' },
          { amount: 10 },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result).toHaveLength(1);
  });

  it('defaults currency to USD when not provided', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'No Currency', amount: 10 },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].currency).toBe('USD');
  });

  it('parses price.amount as string', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'String Price', price: { amount: '29.95' } },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].amount).toBe(29.95);
  });

  it('uses currency field from subscription node', () => {
    const data = {
      data: {
        activeSubscriptions: [
          { name: 'GBP App', amount: 15, currency: 'GBP' },
        ],
      },
    };
    const result = parseBillingData(data);
    expect(result![0].currency).toBe('GBP');
  });
});
