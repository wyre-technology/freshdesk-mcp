import { FreshdeskClient } from '@wyre-technology/node-freshdesk';
import { logger } from './logger.js';

let _client: FreshdeskClient | null = null;
let _credKey: string | null = null;

interface Credentials {
  domain: string;
  apiKey: string;
}

export function getCredentials(): Credentials | null {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) {
    logger.warn('Missing credentials', { hasDomain: !!domain, hasApiKey: !!apiKey });
    return null;
  }
  return { domain, apiKey };
}

/**
 * Drop the cached client so the next getClient() rebuilds with fresh
 * credentials. Called by the HTTP gateway path after injecting per-request
 * headers into process.env.
 */
export function resetClient(): void {
  _client = null;
  _credKey = null;
}

export async function getClient(): Promise<FreshdeskClient> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('No Freshdesk API credentials configured. Set FRESHDESK_DOMAIN and FRESHDESK_API_KEY.');
  }

  const key = `${creds.domain}:${creds.apiKey}`;
  if (_client && _credKey === key) return _client;

  _client = new FreshdeskClient({ domain: creds.domain, apiKey: creds.apiKey });
  _credKey = key;
  logger.info('Created Freshdesk API client', { domain: creds.domain });
  return _client;
}
