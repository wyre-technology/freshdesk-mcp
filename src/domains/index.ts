import type { DomainName, DomainHandler } from '../utils/types.js';

const domainCache = new Map<DomainName, DomainHandler>();

export async function getDomainHandler(domain: DomainName): Promise<DomainHandler> {
  const cached = domainCache.get(domain);
  if (cached) return cached;

  let handler: DomainHandler;
  switch (domain) {
    case 'tickets': {
      const { ticketsHandler } = await import('./tickets.js');
      handler = ticketsHandler;
      break;
    }
    case 'contacts': {
      const { contactsHandler } = await import('./contacts.js');
      handler = contactsHandler;
      break;
    }
    case 'companies': {
      const { companiesHandler } = await import('./companies.js');
      handler = companiesHandler;
      break;
    }
    case 'agents': {
      const { agentsHandler } = await import('./agents.js');
      handler = agentsHandler;
      break;
    }
    case 'groups': {
      const { groupsHandler } = await import('./groups.js');
      handler = groupsHandler;
      break;
    }
    case 'solutions': {
      const { solutionsHandler } = await import('./solutions.js');
      handler = solutionsHandler;
      break;
    }
    case 'sla-business': {
      const { slaBusinessHandler } = await import('./sla-business.js');
      handler = slaBusinessHandler;
      break;
    }
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }

  domainCache.set(domain, handler);
  return handler;
}
