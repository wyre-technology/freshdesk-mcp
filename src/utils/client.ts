import { AsyncLocalStorage } from 'node:async_hooks';
import { FreshdeskClient } from '@wyre-technology/node-freshdesk';
import { logger } from './logger.js';

export interface Credentials {
  domain: string;
  apiKey: string;
}

// Request-scoped credential store. In gateway mode the HTTP layer runs each
// request inside runWithCredentials({apiKey, domain}); getCredentials() reads it.
// Falls back to process.env for stdio/single-tenant mode.
const credStore = new AsyncLocalStorage<Credentials>();

export function runWithCredentials<T>(creds: Credentials, fn: () => T): T {
  return credStore.run(creds, fn);
}

export function getCredentials(): Credentials | null {
  const scoped = credStore.getStore();
  if (scoped?.apiKey && scoped?.domain) return scoped;

  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) {
    logger.warn('Missing credentials', { hasDomain: !!domain, hasApiKey: !!apiKey });
    return null;
  }
  return { domain, apiKey };
}

// Constructs a client from the request-scoped (or env) credentials. The client
// is cheap and holds no shared mutable state, so we build one per call — never
// a process-global singleton.
export function getClient(): FreshdeskClient {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('No Freshdesk API credentials configured. Set FRESHDESK_DOMAIN and FRESHDESK_API_KEY.');
  }
  logger.info('Created Freshdesk API client', { domain: creds.domain });
  return new FreshdeskClient({ domain: creds.domain, apiKey: creds.apiKey });
}
