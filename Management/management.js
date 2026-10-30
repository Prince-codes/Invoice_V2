const moduleFilter = document.getElementById('moduleFilter');
const invoiceTableBody = document.getElementById('invoiceTableBody');
const detailModal = document.getElementById('invoiceDetailModal');
const detailContent = document.getElementById('invoiceDetailContent');
const backBtn = document.getElementById('backBtn');
const closeBtn = document.getElementById('closeDetailModal');
const loadButton = document.getElementById('loadInvoicesBtn');
const previousPageButton = document.getElementById('previousPageBtn');
const nextPageButton = document.getElementById('nextPageBtn');
const paginationStatus = document.getElementById('paginationStatus');
const exportStatus = document.getElementById('exportStatus');
const exportButtons = [
  document.getElementById('exportCsvBtn'),
  document.getElementById('exportExcelBtn')
];

const PAGE_SIZE = 50;
let currentPage = 0;
let totalInvoices = 0;
let requestSequence = 0;
let currentLoadController = null;
let invoicesCache = [];

window.InvoiceAuth.initializeUserDisplay('userDisplay')
  .then((username) => {
    if (username) loadInvoices(0);
  })
  .catch((error) => {
    console.error('Unable to verify the login session:', error);
    paginationStatus.textContent = 'Unable to verify your login session.';
  });

backBtn.addEventListener('click', () => {
  window.location.href = '../Selection/selection.html';
});

window.InvoiceAuth.bindLogout('logoutBtn');

closeBtn.addEventListener('click', closeDetailModal);

loadButton.addEventListener('click', () => loadInvoices(0));
previousPageButton.addEventListener('click', () => loadInvoices(currentPage - 1));
nextPageButton.addEventListener('click', () => loadInvoices(currentPage + 1));
moduleFilter.addEventListener('change', () => loadInvoices(0));
document.getElementById('exportCsvBtn').addEventListener('click', exportCurrentModuleCsv);
document.getElementById('exportExcelBtn').addEventListener('click', exportCurrentModuleExcel);

async function loadInvoices(page = currentPage) {
  if (page < 0) return;
  if (currentLoadController) currentLoadController.abort();

  const controller = new AbortController();
  currentLoadController = controller;
  const sequence = ++requestSequence;
  const offset = page * PAGE_SIZE;
  loadButton.disabled = true;
  previousPageButton.disabled = true;
  nextPageButton.disabled = true;
  paginationStatus.textContent = 'Loading invoices…';

  try {
    const query = new URLSearchParams({
      module: moduleFilter.value,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      summary: '1'
    });
    const response = await fetch(`/api/invoices?${query}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load invoices.');

    invoicesCache = payload.invoices || [];
    currentPage = page;
    totalInvoices = Number(payload.total || 0);
    renderTable(invoicesCache);
    updatePagination();
  } catch (error) {
    if (error.name !== 'AbortError' && sequence === requestSequence) {
      paginationStatus.textContent = 'Unable to load invoices.';
      alert(error.message || 'Unable to load invoices.');
    }
  } finally {
    if (sequence === requestSequence) {
      loadButton.disabled = false;
      currentLoadController = null;
    }
  }
}

function updatePagination() {
  const start = totalInvoices ? currentPage * PAGE_SIZE + 1 : 0;
  const end = Math.min((currentPage + 1) * PAGE_SIZE, totalInvoices);
  paginationStatus.textContent = `Showing ${start}–${end} of ${totalInvoices} invoices`;
  previousPageButton.disabled = currentPage === 0;
  nextPageButton.disabled = (currentPage + 1) * PAGE_SIZE >= totalInvoices;
}

function renderTable(rows) {
  if (!rows.length) {
    invoiceTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${totalInvoices ? 'No invoices on this page.' : 'No invoices found for this module.'}</td></tr>`;
    return;
  }

  const rowsHtml = rows.map((invoice) => {
    const invoiceData = invoice.invoice_data || {};
    const total = Number(invoice.total || invoiceData.total || invoiceData.totals?.grand || 0).toFixed(2);
    const customerName = invoice.customerName || invoice.customer_name || 'Unknown';
    const dateLabel = invoice.dateText || invoice.created_at || '';
    const moduleLabel = mapModuleName(invoice.module);

    return `
      <tr>
        <td>${escapeHtml(invoice.invoice_id || invoice.id)}</td>
        <td>${escapeHtml(customerName)}</td>
        <td>${moduleLabel}</td>
        <td>${escapeHtml(dateLabel)}</td>
        <td>₹ ${total}</td>
        <td>
          <div class="action-group">
            <button class="action-btn view" type="button" data-action="view" data-id="${invoice.id}">View</button>
            <button class="action-btn edit" type="button" data-action="edit" data-id="${invoice.id}">Edit</button>
            <button class="action-btn delete" type="button" data-action="delete" data-id="${invoice.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  invoiceTableBody.innerHTML = rowsHtml;

  invoiceTableBody.querySelectorAll('[data-action]').forEach((button) => {
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    button.addEventListener('click', () => {
      const invoice = rows.find((item) => Number(item.id) === id);
      if (!invoice) return;
      if (action === 'delete') deleteInvoice(invoice);
      if (action === 'view' || action === 'edit') {
        fetchInvoiceDetails(id)
          .then((fullInvoice) => {
            if (action === 'view') viewInvoice(fullInvoice);
            else editInvoice(fullInvoice);
          })
          .catch((error) => alert(error.message || 'Unable to load invoice details.'));
      }
    });
  });
}

async function fetchInvoiceDetails(id) {
  const response = await fetch(`/api/invoices?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok || !payload.invoice) {
    throw new Error(payload.error || 'Unable to load invoice details.');
  }
  return payload.invoice;
}

function mapModuleName(module) {
  if (module === 'mod1') return 'Mod 1';
  if (module === 'mod2') return 'Mod 2';
  if (module === 'mod3') return 'Mod 3';
  return module;
}

function viewInvoice(invoice) {
  const invoiceData = invoice.invoice_data || {};
  const rows = buildExportRows(invoiceData, invoice.module);
  const summary = rows.length ? rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td></tr>`).join('') : '';

  let details = `
    <div class="summary">
      <div><strong>Invoice ID:</strong> ${escapeHtml(invoice.invoice_id || invoice.id)}</div>
      <div><strong>Customer:</strong> ${escapeHtml(invoice.customerName || invoice.customer_name || '')}</div>
      <div><strong>Module:</strong> ${mapModuleName(invoice.module)}</div>
      <div><strong>Date:</strong> ${escapeHtml(invoice.dateText || invoiceData.monthText || invoiceData.billingDate || invoice.created_at || '')}</div>
      <div><strong>Total:</strong> ₹ ${Number(invoice.total || invoiceData.total || invoiceData.totals?.grand || 0).toFixed(2)}</div>
    </div>
    <table class="detail-table">
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${summary}</tbody>
    </table>
  `;

  if (rows.length && rows[0].hasTable) {
    details += `
      <h3 style="margin-top: 20px;">Invoice Lines</h3>
      <table class="detail-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  detailContent.innerHTML = details;
  detailModal.classList.remove('hidden');
}

function closeDetailModal() {
  detailModal.classList.add('hidden');
  detailContent.innerHTML = '';
}

function editInvoice(invoice) {
  const payload = {
    module: invoice.module,
    databaseId: invoice.id,
    invoice: {
      ...(invoice.invoice_data || {}),
      invoiceId: invoice.invoice_data?.invoiceId || invoice.invoice_id
    }
  };
  sessionStorage.setItem('cloudInvoiceEdit', JSON.stringify(payload));

  const redirectMap = {
    mod1: '../Mod 1/main.html',
    mod2: '../Mod 2/main.html',
    mod3: '../Mod 3/main.html'
  };

  window.location.href = redirectMap[invoice.module] || 'Selection/selection.html';
}

async function deleteInvoice(invoice) {
  const confirmed = window.confirm(`Delete invoice ${invoice.invoice_id || invoice.id}?`);
  if (!confirmed) return;

  try {
    const response = await fetch('/api/invoices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: invoice.id })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Delete failed');
    alert(payload.message || 'Invoice deleted.');
    await loadInvoices(currentPage);
    if (!invoicesCache.length && currentPage > 0) await loadInvoices(currentPage - 1);
  } catch (error) {
    alert(error.message || 'Delete failed.');
  }
}

async function fetchAllInvoices(module) {
  const invoices = [];
  let offset = 0;
  let total = 0;

  do {
    const query = new URLSearchParams({
      module,
      limit: '100',
      offset: String(offset)
    });
    const response = await fetch(`/api/invoices?${query}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Unable to load ${mapModuleName(module)} invoices.`);

    const page = payload.invoices || [];
    invoices.push(...page);
    total = Number(payload.total || 0);
    offset += page.length;
    if (!page.length && offset < total) {
      throw new Error(`Invoice export stopped early while loading ${mapModuleName(module)}.`);
    }
  } while (offset < total);

  return invoices;
}

async function withExportProgress(label, action) {
  setExporting(true);
  exportStatus.textContent = label;
  try {
    await action();
    exportStatus.textContent = 'Export ready.';
  } catch (error) {
    console.error('Invoice export failed:', error);
    exportStatus.textContent = 'Export failed.';
    alert(error.message || 'Invoice export failed.');
  } finally {
    setExporting(false);
  }
}

function setExporting(isExporting) {
  exportButtons.forEach((button) => {
    button.disabled = isExporting;
  });
}

function exportCurrentModuleCsv() {
  withExportProgress('Preparing CSV export…', async () => {
    const invoices = await fetchAllInvoices(moduleFilter.value);
    const rows = buildModuleRows(invoices);
    if (!rows.length) throw new Error('No invoices to export for this module.');

    const csv = [Object.keys(rows[0]).join(','), ...rows.map((row) => Object.values(row).map(escapeCsv).join(','))].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${moduleFilter.value}-invoices.csv`);
  });
}

function exportCurrentModuleExcel() {
  withExportProgress('Preparing Excel workbook…', async () => {
    const invoices = await fetchAllInvoices(moduleFilter.value);
    if (!invoices.length) throw new Error('No invoices to export for this module.');
    if (!window.downloadInvoiceWorkbook) throw new Error('Excel export support could not be loaded.');

    window.downloadInvoiceWorkbook(invoices.map((invoice, index) => ({
      name: buildSheetName(invoice, index),
      rows: buildInvoiceSheetRows(invoice)
    })));
  });
}

function buildSheetName(invoice, index) {
  const modulePrefix = String(invoice.module || 'invoice').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase();
  return `${modulePrefix}-DB${invoice.id || index + 1}`;
}

function buildInvoiceSheetRows(invoice) {
  const data = invoice.invoice_data || {};
  const module = invoice.module;
  const total = Number(invoice.total || data.total || data.totals?.grand || 0);
  const rows = [
    ['INVOICE SUMMARY', ''],
    ['Invoice ID', invoice.invoice_id || ''],
    ['Module', mapModuleName(module)],
    ['Customer', invoice.customerName || invoice.customer_name || data.customerName || ''],
    ['Date', invoice.dateText || data.monthText || data.dateText || data.billingDate || ''],
    ['Grand Total', total],
    ['Amount in Words', data.totalWords || ''],
    []
  ];

  if (module === 'mod2') {
    const items = data.items || [];
    const itemTotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    rows.push(
      ['ITEM DETAILS', ''],
      ['S.No.', 'Item', 'Quantity', 'Unit', 'Rate', 'Price'],
      ...items.map((item, index) => [
        item.sNo || index + 1,
        item.name || '',
        Number(item.quantity || 0),
        item.unit || '',
        Number(item.quotePrice || item.rate || 0),
        Number(item.price || 0)
      ]),
      [],
      ['Items Total', itemTotal],
      ['Previous Dues', Number(data.previousDues || 0)],
      ['Transportation Charge', Number(data.transportationCharge || 0)],
      ['Grand Total', total]
    );
  } else {
    const daily = data.daily || [];
    rows.push(
      ['DAILY AMOUNTS', ''],
      ['Day', 'Date', 'Amount'],
      ...daily.map((entry) => [
        entry.day_num || '',
        entry.date || '',
        entry.is_empty || entry.amount == null ? '' : Number(entry.amount)
      ]),
      [],
      ['Total 1 (1–15)', Number(data.totals?.t1 || 0)],
      ['Total 2 (16–end)', Number(data.totals?.t2 || 0)],
      ['Grand Total', total]
    );
  }

  return rows;
}

function buildModuleRows(invoices) {
  const module = moduleFilter.value;
  return invoices
    .filter((invoice) => invoice.module === module)
    .map((invoice) => {
      const invoiceData = invoice.invoice_data || {};
      const total = Number(invoice.total || invoiceData.total || invoiceData.totals?.grand || 0).toFixed(2);
      const base = {
        invoice_id: invoice.invoice_id || invoice.id,
        customer_name: invoice.customerName || invoice.customer_name || '',
        module: mapModuleName(invoice.module),
        date: invoice.dateText || invoiceData.monthText || invoiceData.billingDate || '',
        total
      };

      if (invoice.module === 'mod2') {
        const itemRows = (invoiceData.items || []).map((item, index) => ({
          row_index: index + 1,
          item_name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.quotePrice || item.rate,
          price: item.price,
          previous_dues: invoiceData.previousDues || 0,
          transportation_charge: invoiceData.transportationCharge || 0,
          grand_total: total
        }));
        return itemRows.length ? itemRows : [base];
      }

      if (invoice.module === 'mod1' || invoice.module === 'mod3') {
        const dailyRows = (invoiceData.daily || []).map((day, index) => ({
          row_index: index + 1,
          day_number: day.day_num,
          date: day.date,
          amount: day.amount,
          total_1: invoiceData.totals?.t1 || 0,
          total_2: invoiceData.totals?.t2 || 0,
          grand_total: total
        }));
        return dailyRows.length ? dailyRows : [base];
      }

      return [base];
    })
    .flat();
}

function buildExportRows(invoiceData, module) {
  if (module === 'mod2') {
    const items = invoiceData.items || [];
    return items.length ? items.map((item, index) => ({ label: `Item ${index + 1}`, value: `${item.name} | Qty ${item.quantity} ${item.unit} | Rate ${item.quotePrice || item.rate} | Price ${item.price}` })) : [
      { label: 'Customer', value: invoiceData.customerName || '' },
      { label: 'Bill Date', value: invoiceData.billingDate || '' },
      { label: 'Total', value: invoiceData.total || invoiceData.totals?.grand || 0 }
    ];
  }

  if (module === 'mod1' || module === 'mod3') {
    const daily = invoiceData.daily || [];
    return daily.length ? daily.map((entry) => ({ label: `Day ${entry.day_num || ''}`, value: `${entry.date || ''} — ${entry.amount === null || entry.is_empty ? 'Empty' : entry.amount}` })) : [
      { label: 'Customer', value: invoiceData.customerName || '' },
      { label: 'Month', value: invoiceData.monthText || '' },
      { label: 'Total', value: invoiceData.total || invoiceData.totals?.grand || 0 }
    ];
  }

  return [
    { label: 'Customer', value: invoiceData.customerName || '' },
    { label: 'Date', value: invoiceData.billingDate || invoiceData.monthText || '' },
    { label: 'Total', value: invoiceData.total || invoiceData.totals?.grand || 0 }
  ];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const raw = value == null ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

moduleFilter.addEventListener('change', () => {
  if (invoicesCache.length) {
    renderTable(invoicesCache.filter((invoice) => invoice.module === moduleFilter.value));
  }
});

loadInvoices();
