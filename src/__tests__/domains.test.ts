import { describe, it, expect, vi, beforeEach } from 'vitest';

// A fully-mocked Freshdesk client. Each resource method records its call and
// returns a recognizable stub payload.
const mockClient = {
  tickets: {
    search: vi.fn().mockResolvedValue({ results: [], total: 0 }),
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    get: vi.fn().mockResolvedValue({ id: 1 }),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    reply: vi.fn().mockResolvedValue({ id: 10 }),
    createNote: vi.fn().mockResolvedValue({ id: 11 }),
    listConversations: vi.fn().mockResolvedValue([{ id: 10 }]),
    updateConversation: vi.fn().mockResolvedValue({ id: 10 }),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
  },
  contacts: {
    search: vi.fn().mockResolvedValue({ results: [], total: 0 }),
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    get: vi.fn().mockResolvedValue({ id: 1 }),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    autocomplete: vi.fn().mockResolvedValue([{ id: 1, name: 'Jane' }]),
    makeAgent: vi.fn().mockResolvedValue({ id: 5 }),
    restore: vi.fn().mockResolvedValue({ id: 1 }),
    sendInvite: vi.fn().mockResolvedValue(undefined),
    merge: vi.fn().mockResolvedValue(undefined),
    softDelete: vi.fn().mockResolvedValue(undefined),
    hardDelete: vi.fn().mockResolvedValue(undefined),
  },
  companies: {
    search: vi.fn().mockResolvedValue({ results: [], total: 0 }),
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    get: vi.fn().mockResolvedValue({ id: 1 }),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    autocomplete: vi.fn().mockResolvedValue([{ id: 1, name: 'Acme' }]),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  agents: {
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    get: vi.fn().mockResolvedValue({ id: 1 }),
    me: vi.fn().mockResolvedValue({ id: 1 }),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  groups: {
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    get: vi.fn().mockResolvedValue({ id: 1 }),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  solutions: {
    listCategories: vi.fn().mockResolvedValue([{ id: 1 }]),
    getCategory: vi.fn().mockResolvedValue({ id: 1 }),
    createCategory: vi.fn().mockResolvedValue({ id: 2 }),
    updateCategory: vi.fn().mockResolvedValue({ id: 1 }),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    listFolders: vi.fn().mockResolvedValue([{ id: 1 }]),
    getFolder: vi.fn().mockResolvedValue({ id: 1 }),
    createFolder: vi.fn().mockResolvedValue({ id: 2 }),
    updateFolder: vi.fn().mockResolvedValue({ id: 1 }),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
    listArticles: vi.fn().mockResolvedValue([{ id: 1 }]),
    getArticle: vi.fn().mockResolvedValue({ id: 1 }),
    createArticle: vi.fn().mockResolvedValue({ id: 2 }),
    updateArticle: vi.fn().mockResolvedValue({ id: 1 }),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
  },
  slaPolicies: {
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
  },
  businessHours: {
    list: vi.fn().mockResolvedValue([{ id: 1 }]),
    get: vi.fn().mockResolvedValue({ id: 1 }),
  },
  cannedResponses: {
    listFolders: vi.fn().mockResolvedValue([{ id: 1 }]),
    getFolder: vi.fn().mockResolvedValue({ id: 1 }),
    listResponsesInFolder: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
};

vi.mock('../utils/client.js', () => ({
  getClient: vi.fn(async () => mockClient),
  getCredentials: vi.fn(() => ({ domain: 'acme', apiKey: 'key' })),
  resetClient: vi.fn(),
}));

// `extra` with no sendRequest -> confirmDestructive returns null -> proceed.
const noElicitExtra = {};

import { ticketsHandler } from '../domains/tickets.js';
import { contactsHandler } from '../domains/contacts.js';
import { companiesHandler } from '../domains/companies.js';
import { agentsHandler } from '../domains/agents.js';
import { groupsHandler } from '../domains/groups.js';
import { solutionsHandler } from '../domains/solutions.js';
import { slaBusinessHandler } from '../domains/sla-business.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Re-prime resolved values cleared by clearAllMocks.
  for (const resource of Object.values(mockClient)) {
    for (const fn of Object.values(resource as Record<string, ReturnType<typeof vi.fn>>)) {
      if (fn.getMockImplementation() === undefined) fn.mockResolvedValue({ id: 1 });
    }
  }
});

describe('tickets domain', () => {
  it('routes read + write tools to the SDK', async () => {
    await ticketsHandler.handleCall('freshdesk_tickets_search', { query: 'status:2' });
    expect(mockClient.tickets.search).toHaveBeenCalledWith({ query: 'status:2', page: undefined });

    await ticketsHandler.handleCall('freshdesk_tickets_get', { id: 7 });
    expect(mockClient.tickets.get).toHaveBeenCalledWith(7, {});

    await ticketsHandler.handleCall('freshdesk_tickets_create', {
      subject: 's', description: 'd', status: 2, priority: 1, email: 'a@b.com',
    });
    expect(mockClient.tickets.create).toHaveBeenCalled();

    await ticketsHandler.handleCall('freshdesk_tickets_reply', { id: 7, body: 'hi' });
    expect(mockClient.tickets.reply).toHaveBeenCalledWith(7, expect.objectContaining({ body: 'hi' }));
  });

  it('proceeds with delete when elicitation is unavailable', async () => {
    const res = await ticketsHandler.handleCall('freshdesk_tickets_delete', { id: 7 }, noElicitExtra);
    expect(mockClient.tickets.delete).toHaveBeenCalledWith(7);
    expect(res.isError).toBeFalsy();
  });

  it('cancels delete when the user declines elicitation', async () => {
    const extra = { sendRequest: vi.fn().mockResolvedValue({ action: 'accept', content: { confirm: false } }) };
    const res = await ticketsHandler.handleCall('freshdesk_tickets_delete', { id: 7 }, extra);
    expect(mockClient.tickets.delete).not.toHaveBeenCalled();
    expect(res.content[0].text).toMatch(/Cancelled/);
  });

  it('deletes a conversation', async () => {
    await ticketsHandler.handleCall('freshdesk_tickets_delete_conversation', { conversation_id: 99 }, noElicitExtra);
    expect(mockClient.tickets.deleteConversation).toHaveBeenCalledWith(99);
  });
});

describe('contacts domain', () => {
  it('routes lifecycle tools to the SDK', async () => {
    await contactsHandler.handleCall('freshdesk_contacts_autocomplete', { term: 'jane' });
    expect(mockClient.contacts.autocomplete).toHaveBeenCalledWith('jane');

    await contactsHandler.handleCall('freshdesk_contacts_make_agent', { id: 3 }, noElicitExtra);
    expect(mockClient.contacts.makeAgent).toHaveBeenCalledWith(3);

    await contactsHandler.handleCall('freshdesk_contacts_merge', { primary_contact_id: 1, secondary_contact_ids: [2, 3] }, noElicitExtra);
    expect(mockClient.contacts.merge).toHaveBeenCalledWith(expect.objectContaining({ primary_contact_id: 1, secondary_contact_ids: [2, 3] }));

    await contactsHandler.handleCall('freshdesk_contacts_soft_delete', { id: 4 }, noElicitExtra);
    expect(mockClient.contacts.softDelete).toHaveBeenCalledWith(4);

    await contactsHandler.handleCall('freshdesk_contacts_hard_delete', { id: 5, force: true }, noElicitExtra);
    expect(mockClient.contacts.hardDelete).toHaveBeenCalledWith(5, true);
  });
});

describe('companies domain', () => {
  it('routes tools to the SDK', async () => {
    await companiesHandler.handleCall('freshdesk_companies_list', { perPage: 50 });
    expect(mockClient.companies.list).toHaveBeenCalled();
    await companiesHandler.handleCall('freshdesk_companies_delete', { id: 8 }, noElicitExtra);
    expect(mockClient.companies.delete).toHaveBeenCalledWith(8);
  });
});

describe('agents domain', () => {
  it('routes tools to the SDK', async () => {
    await agentsHandler.handleCall('freshdesk_agents_me', {});
    expect(mockClient.agents.me).toHaveBeenCalled();
    await agentsHandler.handleCall('freshdesk_agents_create', { email: 'a@b.com', ticket_scope: 1 });
    expect(mockClient.agents.create).toHaveBeenCalled();
    await agentsHandler.handleCall('freshdesk_agents_delete', { id: 9 }, noElicitExtra);
    expect(mockClient.agents.delete).toHaveBeenCalledWith(9);
  });
});

describe('groups domain', () => {
  it('routes tools to the SDK', async () => {
    await groupsHandler.handleCall('freshdesk_groups_create', { name: 'Tier 1' });
    expect(mockClient.groups.create).toHaveBeenCalled();
    await groupsHandler.handleCall('freshdesk_groups_delete', { id: 4 }, noElicitExtra);
    expect(mockClient.groups.delete).toHaveBeenCalledWith(4);
  });
});

describe('solutions domain', () => {
  it('routes nested category/folder/article tools to the SDK', async () => {
    await solutionsHandler.handleCall('freshdesk_solutions_categories_list', {});
    expect(mockClient.solutions.listCategories).toHaveBeenCalled();
    await solutionsHandler.handleCall('freshdesk_solutions_folders_list', { category_id: 1 });
    expect(mockClient.solutions.listFolders).toHaveBeenCalledWith(1);
    await solutionsHandler.handleCall('freshdesk_solutions_articles_create', { folder_id: 2, title: 't', description: 'd', status: 1 });
    expect(mockClient.solutions.createArticle).toHaveBeenCalledWith(2, expect.objectContaining({ title: 't' }));
    await solutionsHandler.handleCall('freshdesk_solutions_articles_delete', { id: 3 }, noElicitExtra);
    expect(mockClient.solutions.deleteArticle).toHaveBeenCalledWith(3);
  });
});

describe('sla-business domain', () => {
  it('routes SLA, business-hours, and canned-response tools to the SDK', async () => {
    await slaBusinessHandler.handleCall('freshdesk_sla_list', {});
    expect(mockClient.slaPolicies.list).toHaveBeenCalled();
    await slaBusinessHandler.handleCall('freshdesk_business_hours_get', { id: 1 });
    expect(mockClient.businessHours.get).toHaveBeenCalledWith(1);
    await slaBusinessHandler.handleCall('freshdesk_canned_responses_list_responses', { id: 2 });
    expect(mockClient.cannedResponses.listResponsesInFolder).toHaveBeenCalledWith(2);
  });
});
