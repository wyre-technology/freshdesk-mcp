import { describe, it, expect } from 'vitest';
import { getNavigationTools, DOMAINS } from '../domains/navigation.js';

describe('Navigation', () => {
  it('should have all seven domains', () => {
    expect(DOMAINS).toEqual([
      'tickets',
      'contacts',
      'companies',
      'agents',
      'groups',
      'solutions',
      'sla-business',
    ]);
  });

  it('should return exactly the two top-level navigation tools', () => {
    const tools = getNavigationTools();
    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toEqual(['freshdesk_navigate', 'freshdesk_status']);
  });

  it('should enumerate the domains in the navigate enum', () => {
    const tools = getNavigationTools();
    const navigate = tools.find(t => t.name === 'freshdesk_navigate');
    const schema = navigate?.inputSchema as { properties?: { domain?: { enum?: string[] } } };
    expect(schema.properties?.domain?.enum).toEqual(DOMAINS);
  });

  it('navigate should be a stateless discovery aid (no back tool)', () => {
    const names = getNavigationTools().map(t => t.name);
    expect(names).not.toContain('freshdesk_back');
  });
});
