(function () {
  const API_PATH = '/api/invoices';

  function getModuleKey(module) {
    const normalized = String(module || '').toLowerCase();
    if (normalized === 'mod1' || normalized === 'monthly') return 'mod1';
    if (normalized === 'mod2' || normalized === 'daily') return 'mod2';
    if (normalized === 'mod3' || normalized === 'old') return 'mod3';
    return normalized || 'mod1';
  }

  function buildCloudPayload(invoice, module) {
    const moduleKey = getModuleKey(module);
    const base = invoice || {};
    return {
      module: moduleKey,
      invoice_id: base.invoiceId || base.invoice_id || null,
      invoiceId: base.invoiceId || base.invoice_id || null,
      customer_name: base.customerName || base.customer_name || 'Customer',
      customerName: base.customerName || base.customer_name || 'Customer',
      invoice_data: base
    };
  }

  async function saveInvoiceToCloud(invoice, module) {
    const payload = buildCloudPayload(invoice, module);
    try {
      const response = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Cloud save failed.');
      }
      return { ok: true, data: result };
    } catch (error) {
      console.warn('Cloud save skipped:', error.message || error);
      window.alert(`Invoice was saved on this device, but cloud sync failed: ${error.message || 'Check your connection and try again.'}`);
      return { ok: false, error: error.message || 'Cloud save failed.' };
    }
  }

  async function allocateInvoiceId() {
    const response = await fetch(`${API_PATH}/next-id`, {
      method: 'POST',
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isSafeInteger(result.invoiceId) || result.invoiceId < 100) {
      throw new Error(result.error || 'Could not get the next invoice number from cloud.');
    }
    return result.invoiceId;
  }

  async function fetchInvoicesFromCloud(module) {
    const moduleKey = getModuleKey(module);
    const invoices = [];
    let offset = 0;
    let total = 0;

    do {
      const query = new URLSearchParams({
        module: moduleKey,
        limit: '100',
        offset: String(offset)
      });
      const response = await fetch(`${API_PATH}?${query}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Unable to load invoices from cloud.');
      }

      const page = Array.isArray(result.invoices) ? result.invoices : [];
      invoices.push(...page.map((record) => ({
        ...(record.invoice_data || {}),
        module: record.module,
        invoiceId: record.invoice_data?.invoiceId ?? record.invoice_id,
        customerName: record.invoice_data?.customerName || record.customer_name || '',
        createdAt: record.invoice_data?.createdAt || record.created_at,
        _cloudDatabaseId: record.id
      })));
      total = Number(result.total ?? invoices.length);
      offset += page.length;

      if (!page.length && offset < total) {
        throw new Error('Cloud invoice history could not be fully loaded.');
      }
    } while (offset < total);

    return invoices;
  }

  function cacheCloudInvoicesLocally(invoices, module) {
    const moduleKey = getModuleKey(module);
    let localInvoices = [];
    try {
      const stored = JSON.parse(localStorage.getItem('invoices') || '[]');
      if (!Array.isArray(stored)) {
        throw new Error('Stored invoice data is not a list.');
      }
      localInvoices = stored;
    } catch (error) {
      console.error('Unable to read local invoice history before cloud refresh:', error);
      throw new Error('Could not refresh local invoice history because the stored data could not be read.');
    }

    for (const cloudInvoice of invoices) {
      const invoice = { ...cloudInvoice };
      delete invoice._cloudDatabaseId;
      invoice.module = moduleKey;
      const index = localInvoices.findIndex((localInvoice) =>
        localInvoice.module === moduleKey
        && String(localInvoice.invoiceId) === String(invoice.invoiceId)
      );
      if (index >= 0) {
        localInvoices[index] = invoice;
      } else {
        localInvoices.push(invoice);
      }
    }

    try {
      localStorage.setItem('invoices', JSON.stringify(localInvoices));
    } catch (error) {
      console.error('Unable to cache cloud invoices locally:', error);
      throw new Error('Cloud invoices loaded, but could not be cached on this device.');
    }
  }

  async function updateInvoiceByInvoiceNumber(invoice, module) {
    const payload = buildCloudPayload(invoice, module);
    payload.lookupByInvoiceNumber = true;
    try {
      const response = await fetch(API_PATH, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Cloud update failed.');
      return { ok: true, data: result };
    } catch (error) {
      console.warn('Cloud update skipped:', error.message || error);
      window.alert(`Invoice was updated on this device, but cloud sync failed: ${error.message || 'Check your connection and try again.'}`);
      return { ok: false, error: error.message || 'Cloud update failed.' };
    }
  }

  async function updateInvoiceInCloud(invoice, module, id) {
    const payload = buildCloudPayload(invoice, module);
    payload.id = id;
    try {
      const response = await fetch(API_PATH, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Cloud update failed.');
      }
      return { ok: true, data: result };
    } catch (error) {
      console.warn('Cloud update skipped:', error.message || error);
      return { ok: false, error: error.message || 'Cloud update failed.' };
    }
  }

  async function deleteInvoiceFromCloud(id) {
    try {
      const response = await fetch(API_PATH, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Cloud delete failed.');
      }
      return { ok: true, data: result };
    } catch (error) {
      console.warn('Cloud delete skipped:', error.message || error);
      return { ok: false, error: error.message || 'Cloud delete failed.' };
    }
  }

  window.InvoiceCloudSync = {
    saveInvoiceToCloud,
    allocateInvoiceId,
    fetchInvoicesFromCloud,
    cacheCloudInvoicesLocally,
    updateInvoiceByInvoiceNumber,
    updateInvoiceInCloud,
    deleteInvoiceFromCloud,
    getModuleKey
  };
})();
