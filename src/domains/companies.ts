import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { confirmDestructive } from '../elicitation/forms.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'freshdesk_companies_search',
      description: 'Search companies using the Freshdesk query language.',
      annotations: { title: 'Search companies', readOnlyHint: true, openWorldHint: true },
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
      name: 'freshdesk_companies_list',
      description: 'List companies (single page) with optional pagination.',
      annotations: { title: 'List companies', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: { type: 'number', description: '1-based page number' },
          perPage: { type: 'number', description: 'Records per page (max 100)' },
        },
      },
    },
    {
      name: 'freshdesk_companies_get',
      description: 'Get a single company by ID.',
      annotations: { title: 'Get company', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Company ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_companies_create',
      description: 'Create a company.',
      annotations: { title: 'Create company', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Company name (required, unique)' },
          description: { type: 'string' },
          note: { type: 'string' },
          domains: { type: 'array', items: { type: 'string' }, description: 'Email domains that map to this company' },
          health_score: { type: 'string' },
          account_tier: { type: 'string' },
          industry: { type: 'string' },
          renewal_date: { type: 'string', description: 'ISO-8601 renewal date' },
          custom_fields: { type: 'object' },
        },
        required: ['name'],
      },
    },
    {
      name: 'freshdesk_companies_update',
      description: 'Update a company (any subset of fields).',
      annotations: { title: 'Update company', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Company ID' },
          name: { type: 'string' },
          description: { type: 'string' },
          note: { type: 'string' },
          domains: { type: 'array', items: { type: 'string' } },
          health_score: { type: 'string' },
          account_tier: { type: 'string' },
          industry: { type: 'string' },
          renewal_date: { type: 'string' },
          custom_fields: { type: 'object' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_companies_autocomplete',
      description: 'Lightweight company lookup by name fragment.',
      annotations: { title: 'Autocomplete companies', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { name: { type: 'string', description: 'Company name fragment to match' } },
        required: ['name'],
      },
    },
    {
      name: 'freshdesk_companies_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes a company. Associated contacts are ' +
        'detached but not deleted. This action cannot be undone. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete company (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Company ID' } },
        required: ['id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>, extra?: unknown): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'freshdesk_companies_search': {
      logger.info('API call: companies.search', { query: args.query });
      const result = await client.companies.search({
        query: args.query as string,
        page: args.page as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_companies_list': {
      logger.info('API call: companies.list');
      const result = await client.companies.list({
        page: args.page as number | undefined,
        perPage: args.perPage as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_companies_get': {
      const id = args.id as number;
      logger.info('API call: companies.get', { id });
      const company = await client.companies.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(company, null, 2) }] };
    }
    case 'freshdesk_companies_create': {
      logger.info('API call: companies.create', { name: args.name });
      const company = await client.companies.create({
        name: args.name as string,
        description: args.description as string | undefined,
        note: args.note as string | undefined,
        domains: args.domains as string[] | undefined,
        health_score: args.health_score as string | undefined,
        account_tier: args.account_tier as string | undefined,
        industry: args.industry as string | undefined,
        renewal_date: args.renewal_date as string | undefined,
        custom_fields: args.custom_fields as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(company, null, 2) }] };
    }
    case 'freshdesk_companies_update': {
      const id = args.id as number;
      logger.info('API call: companies.update', { id });
      const company = await client.companies.update(id, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
        note: args.note as string | undefined,
        domains: args.domains as string[] | undefined,
        health_score: args.health_score as string | undefined,
        account_tier: args.account_tier as string | undefined,
        industry: args.industry as string | undefined,
        renewal_date: args.renewal_date as string | undefined,
        custom_fields: args.custom_fields as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(company, null, 2) }] };
    }
    case 'freshdesk_companies_autocomplete': {
      logger.info('API call: companies.autocomplete', { name: args.name });
      const result = await client.companies.autocomplete(args.name as string);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_companies_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Permanently delete company ${id}? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Company ${id} was not deleted.` }] };
      }
      logger.info('API call: companies.delete', { id });
      await client.companies.delete(id);
      return { content: [{ type: 'text', text: `Company ${id} deleted.` }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const companiesHandler: DomainHandler = { getTools, handleCall };
