import type { BillingProvider } from './types.js';
import { mockProvider } from './mockProvider.js';
import { stripeProvider } from './stripeProvider.js';
import { razorpayProvider } from './razorpayProvider.js';

export * from './types.js';

/**
 * Select the active billing provider from BILLING_PROVIDER.
 * Defaults to the mock provider so the upgrade flow works out of the box.
 */
export function getBillingProvider(): BillingProvider {
  switch ((process.env.BILLING_PROVIDER || 'mock').toLowerCase()) {
    case 'stripe':
      return stripeProvider;
    case 'razorpay':
      return razorpayProvider;
    default:
      return mockProvider;
  }
}
