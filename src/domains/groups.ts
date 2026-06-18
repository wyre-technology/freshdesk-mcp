import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { confirmDestructive } from '../elicitation/forms.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'freshdesk_groups_list',
      description: 'List agent groups (single page) with optional pagination.',
      annotations: { title: 'List groups', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: { type: 'number', description: '1-based page number' },
          perPage: { type: 'number', description: 'Records per page (max 100)' },
        },
      },
    },
    {
      name: 'freshdesk_groups_get',
      description: 'Get a single group by ID.',
      annotations: { title: 'Get group', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Group ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_groups_create',
      description: 'Create an agent group.',
      annotations: { title: 'Create group', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Group name (required)' },
          description: { type: 'string' },
          agent_ids: { type: 'array', items: { type: 'number' }, description: 'Agents in the group' },
          auto_ticket_assign: { type: 'boolean', description: 'Enable round-robin auto-assignment' },
          escalate_to: { type: 'number', description: 'Agent ID to escalate unassigned tickets to' },
          unassigned_for: { type: 'string', description: 'Escalation delay, e.g. "30m", "1h", "12h"' },
          business_hour_id: { type: 'number', description: 'Business-hours config to apply' },
        },
        required: ['name'],
      },
    },
    {
      name: 'freshdesk_groups_update',
      description: 'Update an agent group (any subset of fields).',
      annotations: { title: 'Update group', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Group ID' },
          name: { type: 'string' },
          description: { type: 'string' },
          agent_ids: { type: 'array', items: { type: 'number' } },
          auto_ticket_assign: { type: 'boolean' },
          escalate_to: { type: 'number' },
          unassigned_for: { type: 'string' },
          business_hour_id: { type: 'number' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_groups_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes an agent group. Tickets assigned to the ' +
        'group are unassigned from it. This action cannot be undone. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete group (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Group ID' } },
        required: ['id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>, extra?: unknown): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'freshdesk_groups_list': {
      logger.info('API call: groups.list');
      const result = await client.groups.list({
        page: args.page as number | undefined,
        perPage: args.perPage as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_groups_get': {
      const id = args.id as number;
      logger.info('API call: groups.get', { id });
      const group = await client.groups.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(group, null, 2) }] };
    }
    case 'freshdesk_groups_create': {
      logger.info('API call: groups.create', { name: args.name });
      const group = await client.groups.create({
        name: args.name as string,
        description: args.description as string | undefined,
        agent_ids: args.agent_ids as number[] | undefined,
        auto_ticket_assign: args.auto_ticket_assign as boolean | undefined,
        escalate_to: args.escalate_to as number | undefined,
        unassigned_for: args.unassigned_for as string | undefined,
        business_hour_id: args.business_hour_id as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(group, null, 2) }] };
    }
    case 'freshdesk_groups_update': {
      const id = args.id as number;
      logger.info('API call: groups.update', { id });
      const group = await client.groups.update(id, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
        agent_ids: args.agent_ids as number[] | undefined,
        auto_ticket_assign: args.auto_ticket_assign as boolean | undefined,
        escalate_to: args.escalate_to as number | undefined,
        unassigned_for: args.unassigned_for as string | undefined,
        business_hour_id: args.business_hour_id as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(group, null, 2) }] };
    }
    case 'freshdesk_groups_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Permanently delete group ${id}? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Group ${id} was not deleted.` }] };
      }
      logger.info('API call: groups.delete', { id });
      await client.groups.delete(id);
      return { content: [{ type: 'text', text: `Group ${id} deleted.` }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const groupsHandler: DomainHandler = { getTools, handleCall };
