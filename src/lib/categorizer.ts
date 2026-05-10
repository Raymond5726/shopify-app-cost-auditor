import type { ShopifyApp, AppCategory, RedundancyGroup } from '../types';

/**
 * Maps category identifiers to human-readable labels.
 */
const CATEGORY_LABELS: Record<AppCategory, string> = {
  'email-marketing': 'Email Marketing',
  'sms-marketing': 'SMS Marketing',
  'reviews': 'Product Reviews',
  'seo': 'SEO Optimization',
  'page-builder': 'Page Builder',
  'chat': 'Live Chat & Support',
  'shipping': 'Shipping & Fulfillment',
  'inventory': 'Inventory Management',
  'analytics': 'Analytics & Tracking',
  'loyalty': 'Loyalty & Rewards',
  'upsell': 'Upsell & Cross-sell',
  'social-media': 'Social Media',
  'subscription': 'Subscriptions',
  'returns': 'Returns & Exchanges',
  'translation': 'Translation',
  'popup': 'Popups & Email Capture',
  'other': 'Other',
};

/**
 * Returns the human-readable label for a category.
 */
export function getCategoryLabel(category: AppCategory): string {
  return CATEGORY_LABELS[category] || 'Other';
}

/**
 * Detects redundancy groups: categories with 2 or more apps installed.
 * Calculates potential savings for each group (total cost minus the cheapest app).
 * Generates a recommendation string for each group.
 */
export function detectRedundancies(apps: ShopifyApp[]): RedundancyGroup[] {
  // Group apps by category (skip apps without a category or in 'other')
  const categoryMap = new Map<AppCategory, ShopifyApp[]>();

  for (const app of apps) {
    if (!app.category || app.category === 'other') continue;
    if (!app.isActive) continue;

    const existing = categoryMap.get(app.category) || [];
    existing.push(app);
    categoryMap.set(app.category, existing);
  }

  // Build redundancy groups for categories with 2+ apps
  const groups: RedundancyGroup[] = [];

  for (const [category, categoryApps] of categoryMap.entries()) {
    if (categoryApps.length < 2) continue;

    const sortedByCost = [...categoryApps].sort((a, b) => a.monthlyCost - b.monthlyCost);
    const cheapestCost = sortedByCost[0].monthlyCost;
    const totalCost = categoryApps.reduce((sum, app) => sum + app.monthlyCost, 0);
    const potentialSavings = totalCost - cheapestCost;

    const appNames = categoryApps.map((a) => a.name).join(', ');
    const cheapestName = sortedByCost[0].name;
    const recommendation =
      potentialSavings > 0
        ? `You have ${categoryApps.length} ${getCategoryLabel(category)} apps (${appNames}). Consider consolidating to ${cheapestName} to save $${potentialSavings.toFixed(2)}/month.`
        : `You have ${categoryApps.length} ${getCategoryLabel(category)} apps (${appNames}). Review if all are necessary.`;

    groups.push({
      category,
      categoryLabel: getCategoryLabel(category),
      apps: categoryApps,
      potentialSavings,
      recommendation,
    });
  }

  // Sort by potential savings descending
  groups.sort((a, b) => b.potentialSavings - a.potentialSavings);

  return groups;
}

/**
 * Calculates the total monthly cost across all apps.
 */
export function calculateTotalMonthlyCost(apps: ShopifyApp[]): number {
  return apps.reduce((sum, app) => sum + (app.isActive ? app.monthlyCost : 0), 0);
}

/**
 * Calculates the total potential savings across all redundancy groups.
 */
export function calculatePotentialSavings(redundancies: RedundancyGroup[]): number {
  return redundancies.reduce((sum, group) => sum + group.potentialSavings, 0);
}
