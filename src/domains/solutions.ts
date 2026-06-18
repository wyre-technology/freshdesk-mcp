import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { confirmDestructive } from '../elicitation/forms.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    // --- Categories ---
    {
      name: 'freshdesk_solutions_categories_list',
      description: 'List all solution categories (top level of the knowledge base).',
      annotations: { title: 'List solution categories', readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'freshdesk_solutions_categories_get',
      description: 'Get a single solution category by ID.',
      annotations: { title: 'Get solution category', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Category ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_solutions_categories_create',
      description: 'Create a solution category.',
      annotations: { title: 'Create solution category', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Category name (required)' },
          description: { type: 'string' },
          visible_in_portals: { type: 'array', items: { type: 'number' }, description: 'Portal IDs this category is visible in' },
        },
        required: ['name'],
      },
    },
    {
      name: 'freshdesk_solutions_categories_update',
      description: 'Update a solution category.',
      annotations: { title: 'Update solution category', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Category ID' },
          name: { type: 'string' },
          description: { type: 'string' },
          visible_in_portals: { type: 'array', items: { type: 'number' } },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_solutions_categories_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes a solution category and all of its ' +
        'folders and articles. This action cannot be undone. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete solution category (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Category ID' } },
        required: ['id'],
      },
    },

    // --- Folders ---
    {
      name: 'freshdesk_solutions_folders_list',
      description: "List a category's folders.",
      annotations: { title: 'List solution folders', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { category_id: { type: 'number', description: 'Parent category ID' } },
        required: ['category_id'],
      },
    },
    {
      name: 'freshdesk_solutions_folders_get',
      description: 'Get a single solution folder by ID.',
      annotations: { title: 'Get solution folder', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Folder ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_solutions_folders_create',
      description: 'Create a folder under a category.',
      annotations: { title: 'Create solution folder', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          category_id: { type: 'number', description: 'Parent category ID' },
          name: { type: 'string', description: 'Folder name (required)' },
          description: { type: 'string' },
          visibility: { type: 'number', description: '1=All, 2=Logged-in users, 3=Agents, 4=Selected companies' },
          company_ids: { type: 'array', items: { type: 'number' }, description: 'Required when visibility is 4' },
        },
        required: ['category_id', 'name'],
      },
    },
    {
      name: 'freshdesk_solutions_folders_update',
      description: 'Update a solution folder.',
      annotations: { title: 'Update solution folder', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Folder ID' },
          name: { type: 'string' },
          description: { type: 'string' },
          visibility: { type: 'number' },
          company_ids: { type: 'array', items: { type: 'number' } },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_solutions_folders_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes a solution folder and all of its ' +
        'articles. This action cannot be undone. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete solution folder (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Folder ID' } },
        required: ['id'],
      },
    },

    // --- Articles ---
    {
      name: 'freshdesk_solutions_articles_list',
      description: "List a folder's articles.",
      annotations: { title: 'List solution articles', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { folder_id: { type: 'number', description: 'Parent folder ID' } },
        required: ['folder_id'],
      },
    },
    {
      name: 'freshdesk_solutions_articles_get',
      description: 'Get a single solution article by ID.',
      annotations: { title: 'Get solution article', readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Article ID' } },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_solutions_articles_create',
      description: 'Create an article in a folder.',
      annotations: { title: 'Create solution article', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          folder_id: { type: 'number', description: 'Parent folder ID' },
          title: { type: 'string', description: 'Article title (required)' },
          description: { type: 'string', description: 'HTML article body (required)' },
          status: { type: 'number', description: '1=Draft, 2=Published' },
          type: { type: 'number', description: '1=Permanent, 2=Workaround' },
          tags: { type: 'array', items: { type: 'string' } },
          seo_data: { type: 'object', description: 'SEO metadata' },
        },
        required: ['folder_id', 'title', 'description', 'status'],
      },
    },
    {
      name: 'freshdesk_solutions_articles_update',
      description: 'Update a solution article.',
      annotations: { title: 'Update solution article', readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number', description: 'Article ID' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'number', description: '1=Draft, 2=Published' },
          type: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          seo_data: { type: 'object' },
        },
        required: ['id'],
      },
    },
    {
      name: 'freshdesk_solutions_articles_delete',
      description:
        '⚠ DESTRUCTIVE — IRREVERSIBLE. Permanently deletes a solution article. This action cannot ' +
        'be undone. ' +
        'Confirm with the user before invoking.',
      annotations: {
        title: 'Delete solution article (irreversible)',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        type: 'object' as const,
        properties: { id: { type: 'number', description: 'Article ID' } },
        required: ['id'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>, extra?: unknown): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    // --- Categories ---
    case 'freshdesk_solutions_categories_list': {
      logger.info('API call: solutions.listCategories');
      const result = await client.solutions.listCategories();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_solutions_categories_get': {
      const id = args.id as number;
      logger.info('API call: solutions.getCategory', { id });
      const category = await client.solutions.getCategory(id);
      return { content: [{ type: 'text', text: JSON.stringify(category, null, 2) }] };
    }
    case 'freshdesk_solutions_categories_create': {
      logger.info('API call: solutions.createCategory', { name: args.name });
      const category = await client.solutions.createCategory({
        name: args.name as string,
        description: args.description as string | undefined,
        visible_in_portals: args.visible_in_portals as number[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(category, null, 2) }] };
    }
    case 'freshdesk_solutions_categories_update': {
      const id = args.id as number;
      logger.info('API call: solutions.updateCategory', { id });
      const category = await client.solutions.updateCategory(id, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
        visible_in_portals: args.visible_in_portals as number[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(category, null, 2) }] };
    }
    case 'freshdesk_solutions_categories_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Permanently delete category ${id} and all its folders and articles? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Category ${id} was not deleted.` }] };
      }
      logger.info('API call: solutions.deleteCategory', { id });
      await client.solutions.deleteCategory(id);
      return { content: [{ type: 'text', text: `Category ${id} deleted.` }] };
    }

    // --- Folders ---
    case 'freshdesk_solutions_folders_list': {
      const categoryId = args.category_id as number;
      logger.info('API call: solutions.listFolders', { categoryId });
      const result = await client.solutions.listFolders(categoryId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_solutions_folders_get': {
      const id = args.id as number;
      logger.info('API call: solutions.getFolder', { id });
      const folder = await client.solutions.getFolder(id);
      return { content: [{ type: 'text', text: JSON.stringify(folder, null, 2) }] };
    }
    case 'freshdesk_solutions_folders_create': {
      const categoryId = args.category_id as number;
      logger.info('API call: solutions.createFolder', { categoryId, name: args.name });
      const folder = await client.solutions.createFolder(categoryId, {
        name: args.name as string,
        description: args.description as string | undefined,
        visibility: args.visibility as number | undefined,
        company_ids: args.company_ids as number[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(folder, null, 2) }] };
    }
    case 'freshdesk_solutions_folders_update': {
      const id = args.id as number;
      logger.info('API call: solutions.updateFolder', { id });
      const folder = await client.solutions.updateFolder(id, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
        visibility: args.visibility as number | undefined,
        company_ids: args.company_ids as number[] | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(folder, null, 2) }] };
    }
    case 'freshdesk_solutions_folders_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Permanently delete folder ${id} and all its articles? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Folder ${id} was not deleted.` }] };
      }
      logger.info('API call: solutions.deleteFolder', { id });
      await client.solutions.deleteFolder(id);
      return { content: [{ type: 'text', text: `Folder ${id} deleted.` }] };
    }

    // --- Articles ---
    case 'freshdesk_solutions_articles_list': {
      const folderId = args.folder_id as number;
      logger.info('API call: solutions.listArticles', { folderId });
      const result = await client.solutions.listArticles(folderId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'freshdesk_solutions_articles_get': {
      const id = args.id as number;
      logger.info('API call: solutions.getArticle', { id });
      const article = await client.solutions.getArticle(id);
      return { content: [{ type: 'text', text: JSON.stringify(article, null, 2) }] };
    }
    case 'freshdesk_solutions_articles_create': {
      const folderId = args.folder_id as number;
      logger.info('API call: solutions.createArticle', { folderId, title: args.title });
      const article = await client.solutions.createArticle(folderId, {
        title: args.title as string,
        description: args.description as string,
        status: args.status as number,
        type: args.type as number | undefined,
        tags: args.tags as string[] | undefined,
        seo_data: args.seo_data as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(article, null, 2) }] };
    }
    case 'freshdesk_solutions_articles_update': {
      const id = args.id as number;
      logger.info('API call: solutions.updateArticle', { id });
      const article = await client.solutions.updateArticle(id, {
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        status: args.status as number | undefined,
        type: args.type as number | undefined,
        tags: args.tags as string[] | undefined,
        seo_data: args.seo_data as Record<string, unknown> | undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(article, null, 2) }] };
    }
    case 'freshdesk_solutions_articles_delete': {
      const id = args.id as number;
      const confirmed = await confirmDestructive(extra, `Permanently delete article ${id}? This cannot be undone.`);
      if (confirmed === false) {
        return { content: [{ type: 'text', text: `Cancelled. Article ${id} was not deleted.` }] };
      }
      logger.info('API call: solutions.deleteArticle', { id });
      await client.solutions.deleteArticle(id);
      return { content: [{ type: 'text', text: `Article ${id} deleted.` }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const solutionsHandler: DomainHandler = { getTools, handleCall };
