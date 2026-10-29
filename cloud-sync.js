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
      created_by: sessionStorage.getItem('loggedInUser') || 'admin',
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
      return { ok: false, error: error.message || 'Cloud save failed.' };
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
    updateInvoiceInCloud,
    deleteInvoiceFromCloud,
    getModuleKey
  };
})();
