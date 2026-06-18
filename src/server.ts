import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getNavigationTools, DOMAINS } from './domains/navigation.js';
import { getDomainHandler } from './domains/index.js';
import { getClient, getCredentials } from './utils/client.js';
import { logger } from './utils/logger.js';
import type { DomainName } from './utils/types.js';
import { registerPromptHandlers } from './prompts.js';

export function createServer(): Server {
  const server = new Server(
    { name: 'freshdesk-mcp', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        logging: {},
        prompts: {},
      },
    }
  );

  // Register prompt handlers
  registerPromptHandlers(server);

  // Return ALL tools upfront — navigation is a stateless help/discovery tool.
  // The gateway aggregates tools with a single tools/list call, so every tool
  // must be visible here (hiding tools behind navigation breaks discovery).
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = [...getNavigationTools()];
    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      allTools.push(...handler.getTools());
    }
    return { tools: allTools };
  });

  // Route tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;

    // Navigation: stateless discovery aid — summarizes a domain's tools.
    if (name === 'freshdesk_navigate') {
      const domain = (args?.domain as string) as DomainName;
      if (!DOMAINS.includes(domain)) {
        return {
          content: [{ type: 'text' as const, text: `Invalid domain: ${domain}. Valid: ${DOMAINS.join(', ')}` }],
          isError: true,
        };
      }

      const handler = await getDomainHandler(domain);
      const tools = handler.getTools().map(t => `${t.name}: ${t.description}`);
      return {
        content: [{
          type: 'text' as const,
          text: `Domain: ${domain}\n\nAvailable tools:\n${tools.join('\n')}`,
        }],
      };
    }

    // Navigation: status (connectivity check via agents/me)
    if (name === 'freshdesk_status') {
      const creds = getCredentials();
      if (!creds) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ connected: false, domains: DOMAINS, error: 'No credentials configured' }, null, 2),
          }],
        };
      }
      try {
        const client = await getClient();
        const me = await client.agents.me();
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              connected: true,
              domain: creds.domain,
              agent: { id: me.id, name: me.contact?.name, email: me.contact?.email },
              domains: DOMAINS,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ connected: false, domains: DOMAINS, error: (error as Error).message }, null, 2),
          }],
          isError: true,
        };
      }
    }

    // Domain tool calls — try every domain handler
    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      const toolNames = handler.getTools().map(t => t.name);
      if (toolNames.includes(name)) {
        try {
          return await handler.handleCall(name, (args || {}) as Record<string, unknown>, extra);
        } catch (error) {
          logger.error('Tool call failed', { tool: name, error: (error as Error).message });
          return {
            content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
            isError: true,
          };
        }
      }
    }

    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${name}. Use freshdesk_navigate to discover available tools.` }],
      isError: true,
    };
  });

  return server;
}
