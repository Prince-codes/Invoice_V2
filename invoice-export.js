(function () {
  const LOGO_URL = new URL('Assets/logo.png', window.location.href).href;
  const STAMP_URL = new URL('Assets/stamp.png', window.location.href).href;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function amount(value) {
    return Number(value || 0).toFixed(2);
  }

  function buildMonthlyInvoice(invoice, module) {
    const data = invoice.invoice_data || {};
    const daily = Array.isArray(data.daily) ? data.daily : [];
    const firstHalf = daily.filter((entry) => Number(entry.day_num) <= 15);
    const secondHalf = daily.filter((entry) => Number(entry.day_num) > 15);
    const totals = data.totals || {};
    const firstTotal = Number(totals.t1 ?? firstHalf.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
    const secondTotal = Number(totals.t2 ?? secondHalf.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
    const grandTotal = Number(totals.grand ?? data.total ?? firstTotal + secondTotal);
    const shopName = 'Shankar Vegetable Shop';
    const month = data.monthText || data.monthYearISO || invoice.dateText || '';
    const createdAt = data.createdAt || invoice.created_at;
    const issued = createdAt ? new Date(createdAt).toLocaleDateString('en-IN') : '';
    const rowMarkup = (rows) => rows.map((entry) => `
      <tr>
        <td>${escapeHtml(entry.day_num)}</td>
        <td>${escapeHtml(entry.date || '')}</td>
        <td class="amount-cell">${entry.is_empty || entry.amount == null ? '-' : amount(entry.amount)}</td>
      </tr>
    `).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><style>
      ${baseStyles()}
      body{padding:0;color:#111827;background:#fff;font:13px Montserrat,'Segoe UI',Arial,sans-serif}
      .invoice-shell{width:100%;max-width:none;margin:0 auto;padding:0;background:#fff}
      .invoice-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:12px;border-bottom:2px solid #cbd5e1}
      .brand-block{display:flex;align-items:center;gap:12px}
      .logo-wrap{display:flex;width:68px;height:68px;align-items:center;justify-content:center;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#fcd34d);box-shadow:0 6px 20px rgba(245,158,11,.16)}
      .logo-wrap img{width:54px;height:54px;object-fit:contain;border-radius:10px}
      .company-info h1{margin:0 0 4px;color:#111827;font-size:20px;letter-spacing:1px}
      .company-info p{margin:2px 0;color:#6b7280;font-size:12px}
      .invoice-meta{display:flex;min-width:180px;flex-direction:column;align-items:flex-end;text-align:right}
      .meta-pill{display:inline-block;margin-bottom:6px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:999px;background:#f3f4f6;color:#374151;font-size:11px}
      .bill-to{display:flex;justify-content:space-between;align-items:center;margin:16px 0 12px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc}
      .bill-to span{display:block;color:#6b7280;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
      .bill-to strong{color:#111827;font-size:15px}
      .status-tag{padding:6px 10px;border-radius:999px;background:#ecfeff;color:#0f766e;font-size:11px;font-weight:700}
      .table-grid{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap}
      .table-card{flex:1 1 48%;min-width:260px;overflow:hidden;border:1px solid #cbd5e1;border-radius:10px;background:#fff}
      .table-card h3{margin:0;padding:8px 10px;border-bottom:1px solid #cbd5e1;background:#f9fafb;color:#374151;font-size:13px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:7px 8px;border-bottom:1px solid #cbd5e1;font-size:12px;text-align:left}
      th{background:#f9fafb;color:#374151}
      .amount-cell{text-align:center;font-variant-numeric:tabular-nums}
      tfoot th{background:#f3f4f6;font-weight:700}
      .summary-card{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-top:16px;padding:12px 14px;border:1px solid #cbd5e1;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#f3f4f6)}
      .summary-list{flex:1}
      .summary-row{display:flex;justify-content:space-between;padding:5px 0;color:#374151;font-size:12px}
      .summary-row.total{margin-top:6px;padding-top:8px;border-top:1px dashed #d1d5db;color:#111827;font-size:14px;font-weight:700}
      .words-block{min-width:230px;padding-left:16px;border-left:2px solid #d1d5db}
      .words-block span{display:block;margin-bottom:4px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .words-block p{margin:0;color:#111827;font-size:12px;line-height:1.5}
      .signature-section{margin-top:36px;text-align:right}
      .signatory{display:inline-block;padding-top:7px;border-top:2px solid #111827;font-size:13px;font-weight:700}
      .auth-label{margin-top:4px;color:#6b7280;font-size:11px}
      .footer-note{margin-top:18px;color:#6b7280;font-size:11px;text-align:center}
    </style></head><body><main class="invoice-shell">
      <header class="invoice-header"><div class="brand-block">
        <div class="logo-wrap"><img src="${LOGO_URL}" alt="Logo"></div>
        <div class="company-info"><h1>${shopName}</h1><p>Gamharia Market Complex • 832108</p>
          <p>Phone: 8210945932</p><p>Email: shankarvegetableshop7@gmail.com</p></div>
      </div><div class="invoice-meta"><div class="meta-pill">Invoice No. #${escapeHtml(invoice.invoice_id || data.invoiceId || '')}</div>
        <div class="meta-pill">Date: ${escapeHtml(issued)}</div>
        <div class="meta-pill" style="font-size:12px;font-weight:700">Bill of Month: ${escapeHtml(month)}</div>
      </div></header>
      <section class="bill-to"><div><span>Bill To</span><strong>${escapeHtml(invoice.customerName || data.customerName || 'Customer')}</strong></div>
        <div class="status-tag">Monthly Billing</div></section>
      <div class="table-grid">
        <div class="table-card"><h3>1–15 Days</h3><table><thead><tr><th>S.no</th><th>Date</th><th>Amount</th></tr></thead>
          <tbody>${rowMarkup(firstHalf)}</tbody><tfoot><tr><th colspan="2">Total 1</th><th class="amount-cell">${amount(firstTotal)}</th></tr></tfoot></table></div>
        <div class="table-card"><h3>16–End Days</h3><table><thead><tr><th>S.no</th><th>Date</th><th>Amount</th></tr></thead>
          <tbody>${rowMarkup(secondHalf)}</tbody><tfoot><tr><th colspan="2">Total 2</th><th class="amount-cell">${amount(secondTotal)}</th></tr></tfoot></table></div>
      </div>
      <div class="summary-card"><div class="summary-list">
        <div class="summary-row"><span>Total 1 (1–15)</span><strong>₹ ${amount(firstTotal)}</strong></div>
        <div class="summary-row"><span>Total 2 (16–end)</span><strong>₹ ${amount(secondTotal)}</strong></div>
        <div class="summary-row total"><span>Total Amount</span><strong>₹ ${amount(grandTotal)}</strong></div>
      </div><div class="words-block"><span>Total Amount in Words</span><p>${escapeHtml(data.totalWords || '')}</p></div></div>
      <div class="signature-section"><div class="signatory">${shopName}</div><div class="auth-label">Authorized Signatory</div></div>
      <div class="footer-note">Thank You &amp; Visit Us Again.</div>
    </main></body></html>`;
  }

  function buildDailyInvoice(invoice) {
    const data = invoice.invoice_data || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const previousDues = Number(data.previousDues || 0);
    const transportation = Number(data.transportationCharge || 0);
    const total = Number(data.total ?? data.totals?.grand ?? itemsTotal + previousDues + transportation);
    const date = data.dateText || data.billingDate || invoice.dateText || '';
    const rows = items.map((item, index) => {
      const quantity = item.unit === '-' ? '-' : `${Number(item.quantity || 0).toFixed(2)} ${escapeHtml(item.unit || 'Kg')}`;
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.name || '')}</td><td class="number">${quantity}</td><td class="number">₹ ${amount(item.quotePrice || item.rate)}</td><td class="number">₹ ${amount(item.price)}</td></tr>`;
    }).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><style>
      ${baseStyles()}
      body{color:#172033;font:13px Montserrat,'Segoe UI',sans-serif}
      .invoice{width:100%;max-width:none;margin:0 auto}
      .header{display:flex;justify-content:space-between;gap:20px;padding-bottom:14px;border-bottom:3px solid #d9902f}
      .brand{display:flex;align-items:center;gap:12px}.logo{width:64px;height:64px;border-radius:50%;object-fit:cover}
      .company h1{margin:0 0 4px;font-size:20px;letter-spacing:1px}
      .company p{margin:3px 0;color:#657083;font-size:11px}
      .meta{color:#657083;text-align:right}.meta strong{display:block;margin-bottom:8px;color:#172033;font-size:15px}
      .bill-to{display:flex;justify-content:space-between;margin:22px 0 16px;padding:12px;border-left:4px solid #d9902f;background:#f5f7f9}
      .bill-to span{display:block;color:#657083;font-size:10px;text-transform:uppercase}.bill-to strong{font-size:16px}
      .items{width:100%;border-collapse:collapse}.items th{background:#172033;color:#fff}
      .items th,.items td{padding:10px 9px;border-bottom:1px solid #dce1e8;text-align:left}
      .items .number{text-align:right;font-variant-numeric:tabular-nums}
      .items tfoot td{background:#f5f7f9;font-weight:700}
      .summary{position:relative;display:flex;justify-content:space-between;gap:20px;margin-top:22px;padding:14px;background:#f5f7f9}
      .total-stamp{position:absolute;z-index:2;top:18px;left:8px;width:108px;height:108px;object-fit:contain}
      .grand{position:relative;z-index:1;font-size:17px;font-weight:700}
      .grand .subtotal,.grand .dues,.grand .transportation{display:block;margin-bottom:5px;color:#657083;font-size:13px;font-weight:600}
      .grand strong{display:block;font-size:21px}.words{max-width:55%;color:#657083}
      .words strong{display:block;margin-bottom:5px;color:#172033}
      .signature{position:relative;margin-top:48px;text-align:right;font-weight:700}
      .signature-stamp{position:relative;z-index:1;display:block;width:108px;height:108px;margin:0 0 -18px auto;object-fit:contain}
      .signature span{position:relative;z-index:2;display:block;padding-top:7px;border-top:2px solid #172033}
      .authorized{display:block;margin-top:4px;color:#657083;font-size:11px;font-weight:600}
      .footer{text-align:center;margin-top:28px;color:#657083;font-size:15px;font-weight:600}
    </style></head><body><main class="invoice">
      <header class="header"><div class="brand"><img class="logo" src="${LOGO_URL}" alt="Logo"><div class="company">
        <h1>Shankar Vegetable Shop</h1><p>Gamharia Market Complex • 832108</p><p>Phone: 8210945932</p>
      </div></div><div class="meta"><strong>Invoice No. #${escapeHtml(invoice.invoice_id || data.invoiceId || data.invoiceNumber || '')}</strong>${escapeHtml(date)}</div></header>
      <section class="bill-to"><div><span>Bill To</span><strong>${escapeHtml(invoice.customerName || data.customerName || 'Customer')}</strong></div>
        <div><span>Bill of Date</span><strong>${escapeHtml(date)}</strong></div></section>
      <table class="items"><thead><tr><th>S.No</th><th>Item</th><th class="number">Quantity (Pkgs. / Kgs)</th><th class="number">Rate</th><th class="number">Price</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><td colspan="4">Total Amount</td><td class="number">₹ ${amount(itemsTotal)}</td></tr>
        <tr><td colspan="4">Previous Dues</td><td class="number">₹ ${amount(previousDues)}</td></tr>
        ${data.transportationCharged || transportation ? `<tr><td colspan="4">Transportation Charge</td><td class="number">₹ ${amount(transportation)}</td></tr>` : ''}
        <tr><td colspan="4">Grand Total</td><td class="number">₹ ${amount(total)}</td></tr></tfoot></table>
      <section class="summary"><img class="total-stamp" src="${STAMP_URL}" alt="Authorised signatory stamp">
        <div class="grand"><span class="subtotal">Total Amount: ₹ ${amount(itemsTotal)}</span><span class="dues">Previous Dues: ₹ ${amount(previousDues)}</span>
          ${data.transportationCharged || transportation ? `<span class="transportation">Transportation Charge: ₹ ${amount(transportation)}</span>` : ''}
          <strong>Grand Total: ₹ ${amount(total)}</strong></div>
        <div class="words"><strong>Total Amount in Words</strong>${escapeHtml(data.totalWords || '')}</div></section>
      <div class="signature"><img class="signature-stamp" src="${STAMP_URL}" alt="Authorised signatory stamp">
        <span>Shankar Vegetable Shop</span><small class="authorized">Authorized Signatory</small></div>
      <div class="footer">Thank You &amp; Visit Us Again.</div>
    </main></body></html>`;
  }

  function baseStyles() {
    return `*{box-sizing:border-box}html,body{width:100%;margin:0;padding:0;background:#fff}
      table{page-break-inside:auto}tr{break-inside:avoid}
      @page{size:A4;margin:0}`;
  }

  function renderInvoice(invoice) {
    const module = invoice.module;
    if (module === 'mod1' || module === 'mod3') return buildMonthlyInvoice(invoice, module);
    if (module === 'mod2') return buildDailyInvoice(invoice);
    throw new Error(`Unsupported invoice module: ${module}`);
  }

  async function createPdf(invoice) {
    const { jsPDF } = window.jspdf || {};
    if (typeof window.html2canvas !== 'function' || typeof jsPDF !== 'function') {
      throw new Error('PDF export libraries could not be loaded. Refresh and try again.');
    }

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    const monthly = invoice.module === 'mod1' || invoice.module === 'mod3';
    const pageMargin = monthly ? 10 : 12;
    const pageWidth = 210;
    const pageHeight = 297;
    const printableWidth = pageWidth - pageMargin * 2;
    const printableHeight = pageHeight - pageMargin * 2;
    const viewportWidth = Math.round(printableWidth * 96 / 25.4);
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${viewportWidth}px;height:1200px;border:0;`;
    document.body.appendChild(frame);

    try {
      const loaded = new Promise((resolve, reject) => {
        frame.onload = resolve;
        frame.onerror = () => reject(new Error('Unable to render an invoice for PDF export.'));
      });
      frame.srcdoc = renderInvoice(invoice);
      await loaded;

      const frameDocument = frame.contentDocument;
      const imageLoads = Array.from(frameDocument.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
        });
      });
      await Promise.all([frameDocument.fonts?.ready, ...imageLoads]);

      const target = frameDocument.querySelector('.invoice-shell, .invoice');
      if (!target) throw new Error('The invoice layout could not be rendered.');
      const canvas = await window.html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: viewportWidth
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const imageHeight = canvas.height * printableWidth / canvas.width;
      const pages = Math.max(1, Math.ceil(imageHeight / printableHeight));
      const image = canvas.toDataURL('image/jpeg', 0.94);

      for (let page = 0; page < pages; page += 1) {
        if (page > 0) pdf.addPage();
        pdf.addImage(image, 'JPEG', pageMargin, pageMargin - page * printableHeight, printableWidth, imageHeight);
      }

      return pdf.output('blob');
    } finally {
      frame.remove();
    }
  }

  window.InvoiceExport = {
    renderInvoice,
    createPdf
  };
})();
