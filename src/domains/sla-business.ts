import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    // --- SLA policies ---
    {
      name: 'freshdesk_sla_list',
      description: 'List all SLA policies.',
      annotations: { title: 'List SLA policies', readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'freshdesk_sla_create',
      description: 'Create an SLA policy. sla_target, applicable_to, and escalation are free-form objects matching the Freshdesk SLA schema.',
      annotations: { title: 'Create SLA policy', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Policy name (required)' },
          description: { type: 'string' },
          sla_target: { type: 'object', description: 'Per-priority response/resolution targets keyed by priority level' },
          applicable_to: { type: 'object', description: 'Conditions for which tickets the policy applies to' },
          escalation: { type: 'object', description: 'Escalation configuration for response/resolution breaches' },
        },
        required: ['name'],
      },
    },
    {
      name: 'freshdesk_sla_update',
      description: 'Update an SLA policy.',
      annotations: { title: 'Update SLA policy', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'SLA policy ID' },
          name: { type: 'string' },
          description: { type: 'string' },
          sla_target: { type: 'object' },
          applicable_to: { type: 'object' },
          escalation: { type: 'object' },
        },
        required: ['id'],
      },
    },

    // --- Business hours ---
    {
      name: 'freshdesk_business_hours_list',
      description: 'List all business-hours configurations.',
      annotations: { title: 'List business hours', readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'freshdesk_business_hours_get',
      description: 'Get a single business-hours configuration by ID.',
      annotations: { title: 'Get business hours', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Business-hours configuration ID' } },
        required: ['id'],
      },
    },

    // --- Canned responses ---
    {
      name: 'freshdesk_canned_responses_list_folders',
      description: 'List all canned-response folders.',
      annotations: { title: 'List canned-response folders', readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'freshdesk_canned_responses_get_folder',
      description: 'Get a single canned-response folder (includes its responses).',
      annotations: { title: 'Get canned-response folder', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Folder ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_canned_responses_list_responses',
      description: 'List the canned responses inside a folder.',
      annotations: { title: 'List canned responses', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Folder ID' } },
        required: ['id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'freshdesk_sla_list': {
      logger.info('API call: slaPolicies.list');
      const result = await client.slaPolicies.list();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_sla_create': {
      logger.info('API call: slaPolicies.create', { name: args.name });
      const policy = await client.slaPolicies.create({
        name: args.name as string,
        description: args.description as string | undefined,
        sla_target: args.sla_target as Record<string, unknown> | undefined,
        applicable_to: args.applicable_to as Record<string, unknown> | undefined,
        escalation: args.escalation as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(policy, null, 2) }] };
    }
    case 'freshdesk_sla_update': {
      const id = args.id as number;
      logger.info('API call: slaPolicies.update', { id });
      const policy = await client.slaPolicies.update(id, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
        sla_target: args.sla_target as Record<string, unknown> | undefined,
        applicable_to: args.applicable_to as Record<string, unknown> | undefined,
        escalation: args.escalation as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(policy, null, 2) }] };
    }

    case 'freshdesk_business_hours_list': {
      logger.info('API call: businessHours.list');
      const result = await client.businessHours.list();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_business_hours_get': {
      const id = args.id as number;
      logger.info('API call: businessHours.get', { id });
      const bh = await client.businessHours.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(bh, null, 2) }] };
    }

    case 'freshdesk_canned_responses_list_folders': {
      logger.info('API call: cannedResponses.listFolders');
      const result = await client.cannedResponses.listFolders();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_canned_responses_get_folder': {
      const id = args.id as number;
      logger.info('API call: cannedResponses.getFolder', { id });
      const folder = await client.cannedResponses.getFolder(id);
      return { content: [{ type: 'text', text: JSON.stringify(folder, null, 2) }] };
    }
    case 'freshdesk_canned_responses_list_responses': {
      const id = args.id as number;
      logger.info('API call: cannedResponses.listResponsesInFolder', { id });
      const result = await client.cannedResponses.listResponsesInFolder(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const slaBusinessHandler: DomainHandler = { getTools, handleCall };
