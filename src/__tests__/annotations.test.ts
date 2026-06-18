import { describe, it, expect } from 'vitest';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ticketsHandler } from '../domains/tickets.js';
import { contactsHandler } from '../domains/contacts.js';
import { companiesHandler } from '../domains/companies.js';
import { agentsHandler } from '../domains/agents.js';
import { groupsHandler } from '../domains/groups.js';
import { solutionsHandler } from '../domains/solutions.js';
import { slaBusinessHandler } from '../domains/sla-business.js';

const allTools: Tool[] = [
  ...ticketsHandler.getTools(),
  ...contactsHandler.getTools(),
  ...companiesHandler.getTools(),
  ...agentsHandler.getTools(),
  ...groupsHandler.getTools(),
  ...solutionsHandler.getTools(),
  ...slaBusinessHandler.getTools(),
];

function tool(name: string): Tool {
  const t = allTools.find(x => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

// Tier A — irreversible deletes.
const TIER_A = [
  'freshdesk_tickets_delete',
  'freshdesk_tickets_delete_conversation',
  'freshdesk_contacts_hard_delete',
  'freshdesk_companies_delete',
  'freshdesk_agents_delete',
  'freshdesk_groups_delete',
  'freshdesk_solutions_categories_delete',
  'freshdesk_solutions_folders_delete',
  'freshdesk_solutions_articles_delete',
];

// Tier B — high-impact reversible.
const TIER_B = [
  'freshdesk_contacts_make_agent',
  'freshdesk_contacts_merge',
  'freshdesk_contacts_soft_delete',
];

// A sample of read tools that must stay clean.
const READ_TOOLS = [
  'freshdesk_tickets_search',
  'freshdesk_tickets_list',
  'freshdesk_tickets_get',
  'freshdesk_contacts_autocomplete',
  'freshdesk_agents_me',
  'freshdesk_sla_list',
  'freshdesk_business_hours_get',
];

describe('Tier A (irreversible) tool annotations', () => {
  for (const name of TIER_A) {
    it(`${name} is flagged irreversible`, () => {
      const t = tool(name);
      expect(t.description).toMatch(/⚠ DESTRUCTIVE — IRREVERSIBLE\./);
      expect(t.description).toMatch(/Confirm with the user before invoking\.$/);
      expect(t.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      });
    });
  }
});

describe('Tier B (high-impact) tool annotations', () => {
  for (const name of TIER_B) {
    it(`${name} is flagged high-impact`, () => {
      const t = tool(name);
      expect(t.description).toMatch(/⚠ HIGH-IMPACT\./);
      expect(t.description).toMatch(/Confirm with the user before invoking\.$/);
      expect(t.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      });
    });
  }
});

describe('Read tools carry no warnings', () => {
  for (const name of READ_TOOLS) {
    it(`${name} is read-only and unwarned`, () => {
      const t = tool(name);
      expect(t.description).not.toMatch(/⚠/);
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.annotations?.destructiveHint).toBeFalsy();
    });
  }
});

describe('No unexpected destructive flags', () => {
  it('only the known Tier A/B tools set destructiveHint', () => {
    const flagged = allTools.filter(t => t.annotations?.destructiveHint === true).map(t => t.name).sort();
    expect(flagged).toEqual([...TIER_A, ...TIER_B].sort());
  });
});
