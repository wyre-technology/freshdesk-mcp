import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainName } from '../utils/types.js';

export const DOMAINS: DomainName[] = [
  'tickets',
  'contacts',
  'companies',
  'agents',
  'groups',
  'solutions',
  'sla-business',
];

/**
 * Navigation/discovery tools, always present alongside every domain's tools.
 * All Freshdesk tools are listed upfront (so the gateway can discover them in a
 * single tools/list call); `freshdesk_navigate` is a stateless help/discovery
 * aid that summarizes one domain's tools — it is not a prerequisite for calling them.
 */
export function getNavigationTools(): Tool[] {
  return [
    {
      name: 'freshdesk_navigate',
      description:
        'Discover Freshdesk tools by domain. Returns the tool names and descriptions ' +
        'for the selected domain (tickets, contacts, companies, etc.). All tools are ' +
        'callable at any time — this is a help/discovery aid, not a prerequisite.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          domain: {
            type: 'string',
            enum: DOMAINS,
            description: `The domain to explore:
- tickets: ticket CRUD, search, replies, notes, conversations
- contacts: contact CRUD, search, merge, agent promotion, invites
- companies: company CRUD, search, autocomplete
- agents: agent CRUD, current-agent lookup
- groups: agent group CRUD
- solutions: knowledge base categories, folders, articles
- sla-business: SLA policies, business hours, canned responses`,
          },
        },
        required: ['domain'],
      },
    },
    {
      name: 'freshdesk_status',
      description: 'Check Freshdesk API connectivity (calls agents/me) and list available domains.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
  ];
}
