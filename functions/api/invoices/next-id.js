export async function onRequest({ request, env }) {
  if (request.method.toUpperCase() !== 'POST') {
    return jsonResponse({ error: 'Unsupported method.' }, 405);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'D1 database binding is missing.' }, 500);
  }

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        invoice_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        sequence_name TEXT PRIMARY KEY,
        last_number INTEGER NOT NULL
      )
    `).run();

    const allocation = await env.DB.prepare(`
      INSERT INTO invoice_sequences (sequence_name, last_number)
      SELECT
        'global',
        MAX(
          100,
          COALESCE(
            MAX(CASE
              WHEN invoice_id <> '' AND invoice_id NOT GLOB '*[^0-9]*'
              THEN CAST(invoice_id AS INTEGER)
            END),
            99
          ) + 1
        )
      FROM invoices
      WHERE 1
      ON CONFLICT(sequence_name) DO UPDATE SET last_number = MAX(
        invoice_sequences.last_number + 1,
        COALESCE(
          (
            SELECT MAX(CASE
              WHEN invoice_id <> '' AND invoice_id NOT GLOB '*[^0-9]*'
              THEN CAST(invoice_id AS INTEGER)
            END)
            FROM invoices
          ),
          99
        ) + 1
      )
      RETURNING last_number
    `).first();

    if (!allocation || !Number.isSafeInteger(allocation.last_number) || allocation.last_number < 100) {
      return jsonResponse({ error: 'Could not allocate a valid invoice number.' }, 500);
    }

    return jsonResponse({ invoiceId: allocation.last_number }, 200);
  } catch (error) {
    console.error('Invoice number allocation failed:', error);
    return jsonResponse({ error: 'Invoice number allocation failed.' }, 500);
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
