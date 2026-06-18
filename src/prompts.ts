// MCP Prompt Handlers for Freshdesk MCP Server
// Exposes pre-baked prompt templates via ListPrompts and GetPrompt handlers

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function registerPromptHandlers(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'ticket-triage',
        description: 'Review open Freshdesk tickets and produce a prioritized response plan',
        arguments: [],
      },
      {
        name: 'contact-lookup',
        description: 'Find a contact and summarize their recent tickets and history',
        arguments: [
          {
            name: 'query',
            description: 'Email, name, or phone to search for',
            required: true,
          },
        ],
      },
      {
        name: 'sla-breach-check',
        description: 'Identify tickets at risk of, or already breaching, their SLA',
        arguments: [],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'ticket-triage':
        return {
          description: 'Review and prioritize open Freshdesk tickets',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: [
                  'Review the open Freshdesk tickets and produce a prioritized response plan.',
                  '',
                  'Use the available Freshdesk tools to:',
                  '1. Navigate to the tickets domain and search/list open and pending tickets,',
                  '2. Group by priority (Urgent, High, Medium, Low),',
                  '3. For each ticket, note: subject, requester, agent/group, status, age, and due_by,',
                  '4. Flag tickets overdue against fr_due_by (first response) or due_by (resolution),',
                  '5. Identify tickets with no responder assigned,',
                  '6. Recommend an order of response prioritized by priority and SLA urgency.',
                  '',
                  'Present as a triage dashboard with a summary, then an actionable priority list.',
                ].join('\n'),
              },
            },
          ],
        };

      case 'contact-lookup':
        return {
          description: 'Find a contact and summarize their history',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: [
                  `Find the Freshdesk contact matching "${args?.query}" and summarize their support history.`,
                  '',
                  'Use the available Freshdesk tools to:',
                  '1. Navigate to the contacts domain and search/autocomplete for the contact,',
                  '2. Fetch the full contact record (company, tags, custom fields),',
                  '3. Navigate to the tickets domain and search for tickets from this requester,',
                  '4. Summarize: total tickets, open vs resolved, recurring themes, and any escalations.',
                  '',
                  'Present a concise customer profile with their open issues highlighted.',
                ].join('\n'),
              },
            },
          ],
        };

      case 'sla-breach-check':
        return {
          description: 'Identify tickets at risk of or breaching SLA',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: [
                  'Identify Freshdesk tickets at risk of, or already breaching, their SLA.',
                  '',
                  'Use the available Freshdesk tools to:',
                  '1. Navigate to the sla-business domain and list SLA policies and business hours,',
                  '2. Navigate to the tickets domain and search open/pending tickets,',
                  '3. Compare each ticket\'s due_by and fr_due_by against the current time,',
                  '4. Flag breached tickets and those due within the next few hours,',
                  '5. Note the responsible agent/group for each at-risk ticket.',
                  '',
                  'Present a breach report: already breached first, then at-risk, sorted by urgency.',
                ].join('\n'),
              },
            },
          ],
        };

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
