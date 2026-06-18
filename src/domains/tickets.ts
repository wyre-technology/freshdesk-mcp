import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { confirmDestructive } from '../elicitation/forms.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'freshdesk_tickets_search',
      description: 'Search tickets using the Freshdesk query language (e.g. "status:2 AND priority:4").',
      annotations: { title: 'Search tickets', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Freshdesk query string, without surrounding quotes' },
          page: { type: 'number', description: '1-based page number (search paginates up to 10 pages of 30)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'freshdesk_tickets_list',
      description: 'List tickets (single page) with optional filters and pagination.',
      annotations: { title: 'List tickets', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: { type: 'number', description: '1-based page number' },
          perPage: { type: 'number', description: 'Records per page (max 100)' },
          filter: { type: 'string', description: 'Predefined filter, e.g. "new_and_my_open", "watching", "spam", "deleted"' },
          requester_id: { type: 'number', description: 'Filter by requester contact ID' },
          company_id: { type: 'number', description: 'Filter by company ID' },
          updated_since: { type: 'string', description: 'ISO-8601 timestamp; tickets updated since this time' },
        },
      },
    },
    {
      name: 'freshdesk_tickets_get',
      description: 'Get a single ticket by ID.',
      annotations: { title: 'Get ticket', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Ticket ID' },
          include: { type: 'string', description: 'Comma-separated embeds, e.g. "conversations,requester,company,stats"' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_tickets_create',
      description: 'Create a ticket. Provide subject, description, status, priority, and one of requester_id/email/phone.',
      annotations: { title: 'Create ticket', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          subject: { type: 'string', description: 'Ticket subject' },
          description: { type: 'string', description: 'HTML ticket description' },
          status: { type: 'number', description: '2=Open, 3=Pending, 4=Resolved, 5=Closed' },
          priority: { type: 'number', description: '1=Low, 2=Medium, 3=High, 4=Urgent' },
          email: { type: 'string', description: 'Requester email (one of email/requester_id/phone required)' },
          requester_id: { type: 'number', description: 'Requester contact ID' },
          phone: { type: 'string', description: 'Requester phone' },
          name: { type: 'string', description: 'Requester name (required when creating via phone)' },
          source: { type: 'number', description: '1=Email, 2=Portal, 3=Phone, 7=Chat, 9=Feedback Widget, 10=Outbound Email' },
          type: { type: 'string', description: 'Ticket type, e.g. "Question", "Incident", "Problem"' },
          group_id: { type: 'number', description: 'Assign to group' },
          responder_id: { type: 'number', description: 'Assign to agent' },
          company_id: { type: 'number', description: 'Associated company ID' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
          cc_emails: { type: 'array', items: { type: 'string' }, description: 'CC emails' },
          custom_fields: { type: 'object', description: 'Custom field values' },
        },
        required: ['subject', 'description', 'status', 'priority'],
      },
    },
    {
      name: 'freshdesk_tickets_update',
      description: 'Update a ticket (any subset of fields).',
      annotations: { title: 'Update ticket', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Ticket ID' },
          subject: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'number', description: '2=Open, 3=Pending, 4=Resolved, 5=Closed' },
          priority: { type: 'number', description: '1=Low, 2=Medium, 3=High, 4=Urgent' },
          type: { type: 'string' },
          group_id: { type: 'number' },
          responder_id: { type: 'number' },
          company_id: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          custom_fields: { type: 'object' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_tickets_reply',
      description: 'Add a public reply to a ticket (visible to the requester).',
      annotations: { title: 'Reply to ticket', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Ticket ID' },
          body: { type: 'string', description: 'HTML body of the reply' },
          from_email: { type: 'string', description: 'Reply-from support email' },
          user_id: { type: 'number', description: 'Agent posting the reply' },
          cc_emails: { type: 'array', items: { type: 'string' } },
          bcc_emails: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'body'],
      },
    },
    {
      name: 'freshdesk_tickets_add_note',
      description: 'Add a note to a ticket (private/internal by default).',
      annotations: { title: 'Add ticket note', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Ticket ID' },
          body: { type: 'string', description: 'HTML body of the note' },
          private: { type: 'boolean', description: 'True (default) for an internal note, false for a note visible to the requester' },
          user_id: { type: 'number', description: 'Agent posting the note' },
          notify_emails: { type: 'array', items: { type: 'string' }, description: 'Agents to notify' },
        },
        required: ['id', 'body'],
      },
    },
    {
      name: 'freshdesk_tickets_list_conversations',
      description: "List a ticket's conversations (replies and notes).",
      annotations: { title: 'List ticket conversations', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Ticket ID' },
          page: { type: 'number', description: '1-based page number' },
          perPage: { type: 'number', description: 'Records per page (max 100)' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_tickets_update_conversation',
      description: 'Edit the body of an existing conversation (reply/note) by conversation ID.',
      annotations: { title: 'Update conversation', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          conversation_id: { type: 'number', description: 'Conversation ID' },
          body: { type: 'string', description: 'New HTML body' },
        },
        required: ['conversation_id', 'body'],
      },
    },
    {
      name: 'freshdesk_tickets_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Moves a ticket to trash, removing it from views and reports. ' +
        'This action cannot be undone via the API. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete ticket (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Ticket ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_tickets_delete_conversation',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes a conversation (reply or note) from a ticket. ' +
        'This action cannot be undone. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete conversation (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { conversation_id: { type: 'number', description: 'Conversation ID' } },
        required: ['conversation_id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>, extra?: unknown): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'freshdesk_tickets_search': {
      logger.info('API call: tickets.search', { query: args.query });
      const result = await client.tickets.search({
        query: args.query as string,
        page: args.page as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_tickets_list': {
      const { page, perPage, ...filters } = args;
      logger.info('API call: tickets.list');
      const result = await client.tickets.list({
        page: page as number | undefined,
        perPage: perPage as number | undefined,
        ...filters,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_tickets_get': {
      const id = args.id as number;
      logger.info('API call: tickets.get', { id });
      const params = args.include ? { include: args.include as string } : {};
      const ticket = await client.tickets.get(id, params);
      return { content: [{ type: 'text', text: JSON.stringify(ticket, null, 2) }] };
    }
    case 'freshdesk_tickets_create': {
      logger.info('API call: tickets.create', { subject: args.subject });
      const ticket = await client.tickets.create({
        subject: args.subject as string,
        description: args.description as string,
        status: args.status as number,
        priority: args.priority as number,
        email: args.email as string | undefined,
        requester_id: args.requester_id as number | undefined,
        phone: args.phone as string | undefined,
        name: args.name as string | undefined,
        source: args.source as number | undefined,
        type: args.type as string | undefined,
        group_id: args.group_id as number | undefined,
        responder_id: args.responder_id as number | undefined,
        company_id: args.company_id as number | undefined,
        tags: args.tags as string[] | undefined,
        cc_emails: args.cc_emails as string[] | undefined,
        custom_fields: args.custom_fields as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(ticket, null, 2) }] };
    }
    case 'freshdesk_tickets_update': {
      const id = args.id as number;
      logger.info('API call: tickets.update', { id });
      const ticket = await client.tickets.update(id, {
        subject: args.subject as string | undefined,
        description: args.description as string | undefined,
        status: args.status as number | undefined,
        priority: args.priority as number | undefined,
        type: args.type as string | undefined,
        group_id: args.group_id as number | undefined,
        responder_id: args.responder_id as number | undefined,
        company_id: args.company_id as number | undefined,
        tags: args.tags as string[] | undefined,
        custom_fields: args.custom_fields as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(ticket, null, 2) }] };
    }
    case 'freshdesk_tickets_reply': {
      const id = args.id as number;
      logger.info('API call: tickets.reply', { id });
      const conv = await client.tickets.reply(id, {
        body: args.body as string,
        from_email: args.from_email as string | undefined,
        user_id: args.user_id as number | undefined,
        cc_emails: args.cc_emails as string[] | undefined,
        bcc_emails: args.bcc_emails as string[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(conv, null, 2) }] };
    }
    case 'freshdesk_tickets_add_note': {
      const id = args.id as number;
      logger.info('API call: tickets.createNote', { id });
      const conv = await client.tickets.createNote(id, {
        body: args.body as string,
        private: args.private as boolean | undefined,
        user_id: args.user_id as number | undefined,
        notify_emails: args.notify_emails as string[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(conv, null, 2) }] };
    }
    case 'freshdesk_tickets_list_conversations': {
      const id = args.id as number;
      logger.info('API call: tickets.listConversations', { id });
      const result = await client.tickets.listConversations(id, {
        page: args.page as number | undefined,
        perPage: args.perPage as number | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_tickets_update_conversation': {
      const conversationId = args.conversation_id as number;
      logger.info('API call: tickets.updateConversation', { conversationId });
      const conv = await client.tickets.updateConversation(conversationId, { body: args.body as string });
      return { content: [{ type: 'text', text: JSON.stringify(conv, null, 2) }] };
    }
    case 'freshdesk_tickets_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Permanently move ticket ${id} to trash? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Ticket ${id} was not deleted.` }] };
      }
      logger.info('API call: tickets.delete', { id });
      await client.tickets.delete(id);
      return { content: [{ type: 'text', text: `Ticket ${id} moved to trash.` }] };
    }
    case 'freshdesk_tickets_delete_conversation': {
      const conversationId = args.conversation_id as number;
      const confirmed = await confirmDestructive(extra, `Permanently delete conversation ${conversationId}? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Conversation ${conversationId} was not deleted.` }] };
      }
      logger.info('API call: tickets.deleteConversation', { conversationId });
      await client.tickets.deleteConversation(conversationId);
      return { content: [{ type: 'text', text: `Conversation ${conversationId} deleted.` }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const ticketsHandler: DomainHandler = { getTools, handleCall };
