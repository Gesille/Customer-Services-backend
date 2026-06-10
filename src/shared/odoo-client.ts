import dotenv from 'dotenv';
dotenv.config();

const ODOO_URL = process.env.ODOO_URL as string;
const ODOO_DB = process.env.ODOO_DB as string;
const ODOO_UID = Number(process.env.ODOO_UID);
const ODOO_PASSWORD = process.env.ODOO_PASSWORD as string;

const ODOO_TIMEOUT_MS = 10_000;

interface OdooResponse {
  result?: any;
  error?: {
    data?: { message?: string };
    message?: string;
  };
}

export const odooRequest = async (
  model: string,
  method: string,
  domain: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<any> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ODOO_TIMEOUT_MS);

  try {
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: Date.now(),
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [ODOO_DB, ODOO_UID, ODOO_PASSWORD, model, method, domain, kwargs],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Odoo HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OdooResponse;

    if (data.error) {
      throw new Error(
        data.error?.data?.message ?? data.error?.message ?? 'Odoo request failed'
      );
    }

    return data.result;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Odoo request timed out after 10s');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};