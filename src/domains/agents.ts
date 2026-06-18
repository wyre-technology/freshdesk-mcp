import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { confirmDestructive } from '../elicitation/forms.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'freshdesk_agents_list',
      description: 'List agents (single page) with optional filters and pagination.',
      annotations: { title: 'List agents', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: { type: 'number', description: '1-based page number' },
          perPage: { type: 'number', description: 'Records per page (max 100)' },
          email: { type: 'string', description: 'Filter by exact email' },
          state: { type: 'string', description: 'Filter by state, e.g. "fulltime", "occasional"' },
        },
      },
    },
    {
      name: 'freshdesk_agents_get',
      description: 'Get a single agent by ID.',
      annotations: { title: 'Get agent', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Agent ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_agents_me',
      description: 'Get the agent that owns the current API key (connectivity / identity check).',
      annotations: { title: 'Get current agent', readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'freshdesk_agents_create',
      description: 'Create an agent. Requires email and ticket_scope (1=Global, 2=Group, 3=Restricted).',
      annotations: { title: 'Create agent', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          email: { type: 'string', description: 'Agent email (required)' },
          ticket_scope: { type: 'number', description: '1=Global access, 2=Group access, 3=Restricted access' },
          occasional: { type: 'boolean', description: 'True for occasional (part-time) agents' },
          signature: { type: 'string', description: 'HTML signature' },
          group_ids: { type: 'array', items: { type: 'number' }, description: 'Groups the agent belongs to' },
          role_ids: { type: 'array', items: { type: 'number' }, description: 'Roles assigned to the agent' },
          type: { type: 'string', description: 'Agent type, e.g. "support_agent", "field_agent"' },
        },
        required: ['email', 'ticket_scope'],
      },
    },
    {
      name: 'freshdesk_agents_update',
      description: 'Update an agent (any subset of fields).',
      annotations: { title: 'Update agent', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Agent ID' },
          ticket_scope: { type: 'number', description: '1=Global, 2=Group, 3=Restricted' },
          occasional: { type: 'boolean' },
          signature: { type: 'string' },
          group_ids: { type: 'array', items: { type: 'number' } },
          role_ids: { type: 'array', items: { type: 'number' } },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_agents_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Deletes an agent, downgrading them to a contact and ' +
        'freeing their agent seat. Their ticket history is preserved but agent access is removed. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete agent (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Agent ID' } },
        required: ['id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>, extra?: unknown): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'freshdesk_agents_list': {
      const { page, perPage, ...filters } = args;
      logger.info('API call: agents.list');
      const result = await client.agents.list({
        page: page as number | undefined,
        perPage: perPage as number | undefined,
        ...filters,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_agents_get': {
      const id = args.id as number;
      logger.info('API call: agents.get', { id });
      const agent = await client.agents.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(agent, null, 2) }] };
    }
    case 'freshdesk_agents_me': {
      logger.info('API call: agents.me');
      const agent = await client.agents.me();
      return { content: [{ type: 'text', text: JSON.stringify(agent, null, 2) }] };
    }
    case 'freshdesk_agents_create': {
      logger.info('API call: agents.create', { email: args.email });
      const agent = await client.agents.create({
        email: args.email as string,
        ticket_scope: args.ticket_scope as number,
        occasional: args.occasional as boolean | undefined,
        signature: args.signature as string | undefined,
        group_ids: args.group_ids as number[] | undefined,
        role_ids: args.role_ids as number[] | undefined,
        type: args.type as string | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(agent, null, 2) }] };
    }
    case 'freshdesk_agents_update': {
      const id = args.id as number;
      logger.info('API call: agents.update', { id });
      const agent = await client.agents.update(id, {
        ticket_scope: args.ticket_scope as number | undefined,
        occasional: args.occasional as boolean | undefined,
        signature: args.signature as string | undefined,
        group_ids: args.group_ids as number[] | undefined,
        role_ids: args.role_ids as number[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(agent, null, 2) }] };
    }
    case 'freshdesk_agents_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Delete agent ${id} (downgrade to contact)? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Agent ${id} was not deleted.` }] };
      }
      logger.info('API call: agents.delete', { id });
      await client.agents.delete(id);
      return { content: [{ type: 'text', text: `Agent ${id} deleted.` }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const agentsHandler: DomainHandler = { getTools, handleCall };
