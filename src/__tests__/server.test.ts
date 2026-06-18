import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Freshdesk client so the server never makes real network calls.
const mockClient = {
  agents: { me: vi.fn().mockResolvedValue({ id: 1, contact: { name: 'Test Agent', email: 'agent@acme.com' } }) },
};

vi.mock('../utils/client.js', () => ({
  getClient: vi.fn(async () => mockClient),
  getCredentials: vi.fn(() => ({ domain: 'acme', apiKey: 'key' })),
  resetClient: vi.fn(),
}));

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';
import { DOMAINS } from '../domains/navigation.js';

async function connectedClient() {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

describe('Tool listing and navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.agents.me.mockResolvedValue({ id: 1, contact: { name: 'Test Agent', email: 'agent@acme.com' } });
  });

  it('lists all tools upfront (nav + every domain) so the gateway can discover them', async () => {
    const { client } = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map(t => t.name);
    // Navigation + discovery aids are always present.
    expect(names).toContain('freshdesk_navigate');
    expect(names).toContain('freshdesk_status');
    // Domain tools are visible without navigating first.
    expect(names).toContain('freshdesk_tickets_search');
    expect(names).toContain('freshdesk_tickets_delete');
    expect(names).toContain('freshdesk_contacts_hard_delete');
    expect(names).toContain('freshdesk_sla_list');
    // No stateful back tool in the all-upfront model.
    expect(names).not.toContain('freshdesk_back');
  });

  it('navigate is a stateless discovery aid that does not change the tool list', async () => {
    const { client } = await connectedClient();
    const before = (await client.listTools()).tools.map(t => t.name).sort();
    const res: any = await client.callTool({ name: 'freshdesk_navigate', arguments: { domain: 'tickets' } });
    // Returns a textual summary of the domain's tools.
    expect(res.content[0].text).toContain('freshdesk_tickets_search');
    // The advertised tool list is unchanged after navigating.
    const after = (await client.listTools()).tools.map(t => t.name).sort();
    expect(after).toEqual(before);
  });

  it('rejects an invalid domain', async () => {
    const { client } = await connectedClient();
    const res = await client.callTool({ name: 'freshdesk_navigate', arguments: { domain: 'bogus' } });
    expect(res.isError).toBe(true);
  });

  it('freshdesk_status performs a connectivity check via agents.me', async () => {
    const { client } = await connectedClient();
    const res: any = await client.callTool({ name: 'freshdesk_status', arguments: {} });
    expect(mockClient.agents.me).toHaveBeenCalledOnce();
    const payload = JSON.parse(res.content[0].text);
    expect(payload.connected).toBe(true);
    expect(payload.domains).toEqual(DOMAINS);
  });
});
