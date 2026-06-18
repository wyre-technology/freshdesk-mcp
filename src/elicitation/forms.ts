import { ElicitResultSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Ask the user to confirm a destructive / high-impact operation, scoped to the
 * current tool-call request via the handler's `extra` object.
 *
 * Elicitation is strictly additive: if the client does not support it (or the
 * call throws for any reason) this returns `null`, and callers MUST treat
 * `null` as "proceed" so behaviour is unchanged on clients without elicitation.
 *
 * @returns `true` if the user explicitly confirmed, `false` if they explicitly
 *   declined/cancelled, or `null` if elicitation is unavailable (caller should
 *   proceed).
 */
export async function confirmDestructive(
  extra: unknown,
  message: string
): Promise<boolean | null> {
  const sendRequest = (extra as { sendRequest?: unknown } | undefined)?.sendRequest;
  if (typeof sendRequest !== 'function') {
    // No request channel available (e.g. plain unit test) — proceed.
    return null;
  }

  try {
    const result = await (sendRequest as (
      req: unknown,
      schema: typeof ElicitResultSchema
    ) => Promise<{ action: string; content?: Record<string, unknown> }>)(
      {
        method: 'elicitation/create',
        params: {
          mode: 'form',
          message,
          requestedSchema: {
            type: 'object',
            properties: {
              confirm: {
                type: 'boolean',
                title: 'Confirm',
                description: 'Set to true to proceed with this irreversible / high-impact action.',
              },
            },
            required: ['confirm'],
          },
        },
      },
      ElicitResultSchema
    );

    if (result?.action === 'accept' && result.content) {
      return result.content.confirm === true;
    }
    // User cancelled / declined the elicitation form.
    return false;
  } catch {
    // Elicitation not supported by client — proceed.
    return null;
  }
}
