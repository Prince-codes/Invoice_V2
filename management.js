const moduleFilter = document.getElementById('moduleFilter');
const invoiceTableBody = document.getElementById('invoiceTableBody');
const userDisplay = document.getElementById('userDisplay');
const detailModal = document.getElementById('invoiceDetailModal');
const detailContent = document.getElementById('invoiceDetailContent');
const backBtn = document.getElementById('backBtn');
const closeBtn = document.getElementById('closeDetailModal');

const loggedInUser = sessionStorage.getItem('loggedInUser') || 'Guest';
userDisplay.textContent = `Signed in as: ${loggedInUser}`;

if (!sessionStorage.getItem('loggedInUser')) {
  window.location.replace('index.html');
}

backBtn.addEventListener('click', () => {
  window.location.href = 'Selection/selection.html';
});

closeBtn.addEventListener('click', closeDetailModal);

document.getElementById('loadInvoicesBtn').addEventListener('click', loadInvoices);
document.getElementById('exportCsvBtn').addEventListener('click', exportCurrentModuleCsv);
document.getElementById('exportExcelBtn').addEventListener('click', exportCurrentModuleExcel);
document.getElementById('exportPdfBtn').addEventListener('click', exportCurrentModulePdf);

let invoicesCache = [];

async function loadInvoices() {
  const module = moduleFilter.value;
  try {
    const response = await fetch(`/api/invoices?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load invoices.');

    invoicesCache = payload.invoices || [];
    renderTable(invoicesCache);
  } catch (error) {
    alert(error.message || 'Unable to load invoices.');
  }
}

function renderTable(rows) {
  if (!rows.length) {
    invoiceTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No invoices found for this module.</td></tr>';
    return;
  }

  const rowsHtml = rows.map((invoice) => {
    const invoiceData = invoice.invoice_data || {};
    const total = Number(invoice.total || invoiceData.total || invoiceData.totals?.grand || 0).toFixed(2);
    const customerName = invoice.customerName || invoice.customer_name || 'Unknown';
    const dateLabel = invoice.dateText || invoiceData.monthText || invoiceData.billingDate || invoice.created_at || '';
    const moduleLabel = mapModuleName(invoice.module);

    return `
      <tr>
        <td>${invoice.invoice_id || invoice.id}</td>
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
      if (action === 'view') viewInvoice(invoice);
      if (action === 'edit') editInvoice(invoice);
      if (action === 'delete') deleteInvoice(invoice);
    });
  });
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
    invoice: invoice.invoice_data || {}
  };
  sessionStorage.setItem('cloudInvoiceEdit', JSON.stringify(payload));

  const redirectMap = {
    mod1: 'Mod 1/main.html',
    mod2: 'Mod 2/main.html',
    mod3: 'Mod 3/main.html'
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
    await loadInvoices();
  } catch (error) {
    alert(error.message || 'Delete failed.');
  }
}

function exportCurrentModuleCsv() {
  const rows = buildModuleRowsFromCache();
  if (!rows.length) {
    alert('No invoices to export for this module.');
    return;
  }

  const csv = [Object.keys(rows[0]).join(','), ...rows.map((row) => Object.values(row).map(escapeCsv).join(','))].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${moduleFilter.value}-invoices.csv`);
}

function exportCurrentModuleExcel() {
  const rows = buildModuleRowsFromCache();
  if (!rows.length) {
    alert('No invoices to export for this module.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
  XLSX.writeFile(workbook, `${moduleFilter.value}-invoices.xlsx`);
}

function exportCurrentModulePdf() {
  const module = moduleFilter.value;
  if (!invoicesCache.length) {
    alert('No invoices to export for this module.');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF.');
    return;
  }

  const rows = invoicesCache.map((invoice) => {
    const invoiceData = invoice.invoice_data || {};
    const total = Number(invoice.total || invoiceData.total || invoiceData.totals?.grand || 0).toFixed(2);
    const lines = buildExportRows(invoiceData, module)
      .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td></tr>`)
      .join('');

    return `
      <section style="margin-bottom: 24px; page-break-inside: avoid; border: 1px solid #d1d5db; border-radius: 10px; padding: 16px;">
        <h3>${escapeHtml(invoice.customerName || invoice.customer_name || 'Invoice')}</h3>
        <p><strong>Module:</strong> ${mapModuleName(invoice.module)} | <strong>ID:</strong> ${escapeHtml(invoice.invoice_id || invoice.id)} | <strong>Total:</strong> ₹ ${total}</p>
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr><th style="border:1px solid #d1d5db; text-align:left; padding:8px;">Field</th><th style="border:1px solid #d1d5db; text-align:left; padding:8px;">Value</th></tr></thead>
          <tbody>${lines}</tbody>
        </table>
      </section>
    `;
  }).join('');

  printWindow.document.write(`<!doctype html><html><head><title>Invoice Export</title><style>body{font-family: Arial,sans-serif; padding:24px;} table{border-collapse:collapse;} th,td{border:1px solid #d1d5db; padding:8px;}</style></head><body>${rows}</body></html>`);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

function buildModuleRowsFromCache() {
  const module = moduleFilter.value;
  return invoicesCache
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
