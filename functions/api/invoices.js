export async function onRequest(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);

  if (!env.DB) {
    return jsonResponse({ error: 'D1 database binding is missing. Configure the DB binding in Cloudflare Pages Functions.' }, 500);
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
  } catch (error) {
    return jsonResponse({ error: 'Database initialization failed', details: error.message }, 500);
  }

  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (method === 'GET') {
    const module = url.searchParams.get('module');
    const id = url.searchParams.get('id');
    const invoiceId = url.searchParams.get('invoice_id');

    if (id) {
      const result = await env.DB.prepare('SELECT * FROM invoices WHERE id = ? ORDER BY created_at DESC LIMIT 1').bind(id).first();
      if (!result) return jsonResponse({ invoice: null }, 404);
      return jsonResponse({ invoice: serializeInvoice(result) }, 200);
    }

    if (invoiceId) {
      const result = await env.DB.prepare('SELECT * FROM invoices WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1').bind(invoiceId).first();
      if (!result) return jsonResponse({ invoice: null }, 404);
      return jsonResponse({ invoice: serializeInvoice(result) }, 200);
    }

    let query = 'SELECT * FROM invoices';
    const params = [];
    if (module) {
      query += ' WHERE module = ?';
      params.push(module);
    }
    query += ' ORDER BY created_at DESC';

    const rows = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ invoices: (rows.results || []).map(serializeInvoice) }, 200);
  }

  if (method === 'POST') {
    const payload = await readJson(request);
    const module = normalizeModule(payload.module);
    const customerName = payload.customer_name || payload.customerName || payload.invoice_data?.customerName || payload.invoice_data?.customer_name || 'Customer';

    if (!module) {
      return jsonResponse({ error: 'Module is required.' }, 400);
    }

    const now = new Date().toISOString();
    const invoiceId = String(payload.invoice_id || payload.invoiceId || `cloud-${Date.now()}`);
    const invoiceData = JSON.stringify(payload.invoice_data || payload.data || payload || {});

    const result = await env.DB.prepare(`
      INSERT INTO invoices (module, invoice_id, customer_name, created_by, invoice_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(module, invoiceId, customerName, data.username, invoiceData, now, now).run();

    const created = await env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(result.meta.last_row_id).first();
    return jsonResponse({ message: 'Invoice saved to cloud.', invoice: serializeInvoice(created) }, 201);
  }

  if (method === 'PUT') {
    const payload = await readJson(request);
    const id = payload.id;
    if (!id) return jsonResponse({ error: 'Invoice id is required for updates.' }, 400);

    const module = normalizeModule(payload.module) || 'mod1';
    const customerName = payload.customer_name || payload.customerName || payload.invoice_data?.customerName || payload.invoice_data?.customer_name || 'Customer';
    const invoiceId = String(payload.invoice_id || payload.invoiceId || `cloud-${Date.now()}`);
    const invoiceData = JSON.stringify(payload.invoice_data || payload.data || payload || {});
    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE invoices
      SET module = ?, invoice_id = ?, customer_name = ?, created_by = ?, invoice_data = ?, updated_at = ?
      WHERE id = ?
    `).bind(module, invoiceId, customerName, data.username, invoiceData, now, id).run();

    const updated = await env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
    return jsonResponse({ message: 'Invoice updated.', invoice: serializeInvoice(updated) }, 200);
  }

  if (method === 'DELETE') {
    const payload = await readJson(request).catch(() => ({}));
    const id = payload.id || url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'Invoice id is required for deletes.' }, 400);

    await env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();
    return jsonResponse({ message: 'Invoice deleted.' }, 200);
  }

  return jsonResponse({ error: 'Unsupported method.' }, 405);
}

function normalizeModule(module) {
  const value = String(module || '').toLowerCase();
  return ['mod1', 'mod2', 'mod3'].includes(value) ? value : null;
}

function serializeInvoice(row) {
  let invoiceData = {};
  try {
    invoiceData = typeof row.invoice_data === 'string' ? JSON.parse(row.invoice_data || '{}') : (row.invoice_data || {});
  } catch (error) {
    invoiceData = {};
  }

  return {
    id: row.id,
    module: row.module,
    invoice_id: row.invoice_id,
    customer_name: row.customer_name,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    invoice_data: invoiceData,
    total: deriveTotalFromInvoiceData(invoiceData),
    customerName: invoiceData.customerName || row.customer_name,
    dateText: invoiceData.dateText || invoiceData.monthText || invoiceData.billingDate || ''
  };
}

function deriveTotalFromInvoiceData(invoiceData) {
  if (!invoiceData) return 0;
  if (typeof invoiceData.total === 'number') return invoiceData.total;
  if (typeof invoiceData.totals?.grand === 'number') return invoiceData.totals.grand;
  if (typeof invoiceData.totalAmount === 'number') return invoiceData.totalAmount;
  if (Array.isArray(invoiceData.items)) {
    return invoiceData.items.reduce((sum, item) => sum + Number(item.price || 0), 0) + Number(invoiceData.previousDues || 0) + Number(invoiceData.transportationCharge || 0);
  }
  if (Array.isArray(invoiceData.daily)) {
    return invoiceData.daily.reduce((sum, entry) => sum + (entry.amount && !entry.is_empty ? Number(entry.amount) : 0), 0);
  }
  return 0;
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON body.');
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
