import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { confirmDestructive } from '../elicitation/forms.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'freshdesk_contacts_search',
      description: 'Search contacts using the Freshdesk query language (e.g. "email:jane@acme.com").',
      annotations: { title: 'Search contacts', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Freshdesk query string, without surrounding quotes' },
          page: { type: 'number', description: '1-based page number' },
        },
        required: ['query'],
      },
    },
    {
      name: 'freshdesk_contacts_list',
      description: 'List contacts (single page) with optional filters and pagination.',
      annotations: { title: 'List contacts', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: { type: 'number', description: '1-based page number' },
          perPage: { type: 'number', description: 'Records per page (max 100)' },
          email: { type: 'string', description: 'Filter by exact email' },
          company_id: { type: 'number', description: 'Filter by company ID' },
          state: { type: 'string', description: 'Filter by state, e.g. "verified", "unverified", "blocked", "deleted"' },
        },
      },
    },
    {
      name: 'freshdesk_contacts_get',
      description: 'Get a single contact by ID.',
      annotations: { title: 'Get contact', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Contact ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_contacts_create',
      description: 'Create a contact. Requires name plus one of email/phone/mobile/twitter_id.',
      annotations: { title: 'Create contact', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Contact name' },
          email: { type: 'string' },
          phone: { type: 'string' },
          mobile: { type: 'string' },
          twitter_id: { type: 'string' },
          company_id: { type: 'number' },
          job_title: { type: 'string' },
          address: { type: 'string' },
          time_zone: { type: 'string' },
          language: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          other_emails: { type: 'array', items: { type: 'string' } },
          custom_fields: { type: 'object' },
        },
        required: ['name'],
      },
    },
    {
      name: 'freshdesk_contacts_update',
      description: 'Update a contact (any subset of fields).',
      annotations: { title: 'Update contact', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Contact ID' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          mobile: { type: 'string' },
          company_id: { type: 'number' },
          job_title: { type: 'string' },
          address: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          custom_fields: { type: 'object' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_contacts_autocomplete',
      description: 'Lightweight contact lookup by name or email fragment.',
      annotations: { title: 'Autocomplete contacts', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { term: { type: 'string', description: 'Name or email fragment to match' } },
        required: ['term'],
      },
    },
    {
      name: 'freshdesk_contacts_make_agent',
      description:
        '⚠ HIGH-IMPACT. Promotes a contact to a full agent, granting them helpdesk access and ' +
        'consuming an agent seat. Reversible by deleting/downgrading the agent. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Promote contact to agent (high-impact)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Contact ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_contacts_restore',
      description: 'Restore a previously soft-deleted contact.',
      annotations: { title: 'Restore contact', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Contact ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_contacts_send_invite',
      description: 'Send a portal activation invite to a contact.',
      annotations: { title: 'Send contact invite', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Contact ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_contacts_merge',
      description:
        '⚠ HIGH-IMPACT. Merges one or more secondary contacts into a primary contact, folding ' +
        'their tickets and identities together. The secondary contacts are consumed by the merge. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Merge contacts (high-impact)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          primary_contact_id: { type: 'number', description: 'The contact that survives the merge' },
          secondary_contact_ids: { type: 'array', items: { type: 'number' }, description: 'Contacts folded into the primary' },
          contact: { type: 'object', description: 'Optional identity fields to retain from the primary contact' },
        },
        required: ['primary_contact_id', 'secondary_contact_ids'],
      },
    },
    {
      name: 'freshdesk_contacts_soft_delete',
      description:
        '⚠ HIGH-IMPACT. Soft-deletes (deactivates) a contact, removing them from active views. ' +
        'Reversible via freshdesk_contacts_restore. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Soft-delete contact (high-impact)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Contact ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_contacts_hard_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes a contact and their data. This cannot ' +
        'be undone. The contact must usually be soft-deleted first unless force is set. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Hard-delete contact (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Contact ID' },
          force: { type: 'boolean', description: 'Force-delete even if the contact is not soft-deleted first' },
        },
        required: ['id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>, extra?: unknown): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'freshdesk_contacts_search': {
      logger.info('API call: contacts.search', { query: args.query });
      const result = await client.contacts.search({
        query: args.query as string,
        page: args.page as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_contacts_list': {
      const { page, perPage, ...filters } = args;
      logger.info('API call: contacts.list');
      const result = await client.contacts.list({
        page: page as number | undefined,
        perPage: perPage as number | undefined,
        ...filters,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_contacts_get': {
      const id = args.id as number;
      logger.info('API call: contacts.get', { id });
      const contact = await client.contacts.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }] };
    }
    case 'freshdesk_contacts_create': {
      logger.info('API call: contacts.create', { name: args.name });
      const contact = await client.contacts.create({
        name: args.name as string,
        email: args.email as string | undefined,
        phone: args.phone as string | undefined,
        mobile: args.mobile as string | undefined,
        twitter_id: args.twitter_id as string | undefined,
        company_id: args.company_id as number | undefined,
        job_title: args.job_title as string | undefined,
        address: args.address as string | undefined,
        time_zone: args.time_zone as string | undefined,
        language: args.language as string | undefined,
        tags: args.tags as string[] | undefined,
        other_emails: args.other_emails as string[] | undefined,
        custom_fields: args.custom_fields as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }] };
    }
    case 'freshdesk_contacts_update': {
      const id = args.id as number;
      logger.info('API call: contacts.update', { id });
      const contact = await client.contacts.update(id, {
        name: args.name as string | undefined,
        email: args.email as string | undefined,
        phone: args.phone as string | undefined,
        mobile: args.mobile as string | undefined,
        company_id: args.company_id as number | undefined,
        job_title: args.job_title as string | undefined,
        address: args.address as string | undefined,
        tags: args.tags as string[] | undefined,
        custom_fields: args.custom_fields as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }] };
    }
    case 'freshdesk_contacts_autocomplete': {
      logger.info('API call: contacts.autocomplete', { term: args.term });
      const result = await client.contacts.autocomplete(args.term as string);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_contacts_make_agent': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Promote contact ${id} to a full agent (consumes an agent seat)?`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Contact ${id} was not promoted.` }] };
      }
      logger.info('API call: contacts.makeAgent', { id });
      const agent = await client.contacts.makeAgent(id);
      return { content: [{ type: 'text', text: JSON.stringify(agent, null, 2) }] };
    }
    case 'freshdesk_contacts_restore': {
      const id = args.id as number;
      logger.info('API call: contacts.restore', { id });
      const contact = await client.contacts.restore(id);
      return { content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }] };
    }
    case 'freshdesk_contacts_send_invite': {
      const id = args.id as number;
      logger.info('API call: contacts.sendInvite', { id });
      await client.contacts.sendInvite(id);
      return { content: [{ type: 'text', text: `Activation invite sent to contact ${id}.` }] };
    }
    case 'freshdesk_contacts_merge': {
      const primary = args.primary_contact_id as number;
      const secondaries = args.secondary_contact_ids as number[];
      const confirmed = await confirmDestructive(
        extra,
        `Merge contacts ${secondaries.join(', ')} into primary contact ${primary}? The secondary contacts will be consumed.`
      );
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Contacts were not merged.` }] };
      }
      logger.info('API call: contacts.merge', { primary });
      await client.contacts.merge({
        primary_contact_id: primary,
        secondary_contact_ids: secondaries,
        contact: args.contact as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: `Merged ${secondaries.join(', ')} into contact ${primary}.` }] };
    }
    case 'freshdesk_contacts_soft_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Soft-delete (deactivate) contact ${id}? Reversible via restore.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Contact ${id} was not deleted.` }] };
      }
      logger.info('API call: contacts.softDelete', { id });
      await client.contacts.softDelete(id);
      return { content: [{ type: 'text', text: `Contact ${id} soft-deleted.` }] };
    }
    case 'freshdesk_contacts_hard_delete': {
      const id = args.id as number;
      const force = args.force as boolean | undefined;
      const confirmed = await confirmDestructive(extra, `Permanently delete contact ${id}? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Contact ${id} was not deleted.` }] };
      }
      logger.info('API call: contacts.hardDelete', { id, force });
      await client.contacts.hardDelete(id, force);
      return { content: [{ type: 'text', text: `Contact ${id} permanently deleted.` }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const contactsHandler: DomainHandler = { getTools, handleCall };
