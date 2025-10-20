/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ============================== THEME ============================== */
const THEME = {
  primary: [0, 150, 136],        // teal
  primaryDark: [0, 120, 110],
  text: [33, 37, 41],
  muted: [108, 117, 125],
  border: [222, 226, 230],
  bgSoft: [248, 249, 250],
  success: [25, 135, 84],
  danger: [220, 53, 69],
  warning: [255, 193, 7],
};

/* ============================ UTILITIES ============================ */
function normalizeDate(ts) {
  try {
    if (!ts) return null;
    if (typeof ts === 'object' && ts !== null) {
      if (typeof ts.toDate === 'function') return ts.toDate();
      if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    }
    const n = Number(ts);
    if (Number.isFinite(n)) return new Date(n);
    const d = new Date(ts);
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
}
const fmtDate = (ts) => {
  const d = normalizeDate(ts);
  return d ? d.toLocaleString() : '-';
};
const fmt = (v, d = 2) => (Number.isFinite(Number(v)) ? Number(v).toFixed(d) : String(v ?? '—'));
const safe = (s) => (s == null ? '' : String(s));

async function toDataURL(src) {
  if (!src) return null;
  if (String(src).startsWith('data:image')) return src;
  try {
    const res = await fetch(src, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ============================ DRAW HELPERS ============================ */
function sectionHeader(doc, title, x, y, width) {
  const h = 24;
  doc.setFillColor(...THEME.primary);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(x, y, width, h, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, x + 12, y + 16);
  doc.setTextColor(...THEME.text);
  return y + h + 10;
}

function divider(doc, x, y, width) {
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.8);
  doc.line(x, y, x + width, y);
  return y + 12;
}

function decisionBadge(doc, text, x, y) {
  const isHeatIsland = /heat island detected/i.test(text || '');
  const color = isHeatIsland ? THEME.danger : THEME.success;

  const padX = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const tw = doc.getTextWidth(text);
  const w = tw + padX * 2;
  const h = 18;

  doc.setFillColor(...color);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 8, 8, 'F');
  doc.text(text, x + padX, y + 12);
  doc.setTextColor(...THEME.text);
  return y + h;
}


/* =============== CORE: render one item into an existing doc =============== */
async function renderItemIntoExistingDoc(doc, item) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const innerW = pageW - marginX * 2;
  let y = 50;

  // Document properties (helps when sharing the PDF)
  doc.setProperties({
    title: 'Heat Island Detection Report',
    subject: 'Urban Heat Island analysis summary',
    author: 'HeatScape',
  });

  // Report title row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...THEME.text);
  doc.text('Heat Island Detection Report', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...THEME.muted);
  doc.text(`Generated: ${fmtDate(item?.timestamp)}`, pageW - marginX, y, { align: 'right' });
  y += 8;
  y = divider(doc, marginX, y, innerW);

  /* ---------- 1) IMAGE ---------- */
  const dataUrl = await toDataURL(item?.imagePreview || item?.imageUrl);
  if (dataUrl) {
    const maxW = innerW;
    const imgW = Math.min(420, maxW);
    const imgH = (imgW * 9) / 16;
    doc.addImage(dataUrl, 'JPEG', marginX, y, imgW, imgH, undefined, 'FAST');
    y += imgH + 16;
  }

  /* ---------- 2) SEGMENTS ---------- */
  y = sectionHeader(doc, 'Segments', marginX, y, innerW);

  const segs = Array.isArray(item?.segments) ? item.segments : [];
  const segBody = segs.length
    ? segs.map((seg, idx) => [
        String(idx + 1),
        safe(seg.label || ''),
        safe(seg.material || ''),
        fmt(seg.temp),
        fmt(seg.humidity),
        fmt(seg.area),
      ])
    : [['—', '—', '—', '—', '—', '—']];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Label', 'Material', 'Temp (°C)', 'Humidity (%)', 'Area (sq.cm)']],
    body: segBody,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 5, lineColor: THEME.border, lineWidth: 0.2 },
    headStyles: { fillColor: THEME.primaryDark, textColor: 255 },
    alternateRowStyles: { fillColor: THEME.bgSoft },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });
  y = doc.lastAutoTable.finalY + 16;

  /* ---------- 3) DETECTION SUMMARY ---------- */
  y = sectionHeader(doc, 'Detection Summary', marginX, y, innerW);

  const s = item?.results?.summary || {};
  if (s?.final_decision) {
    y = decisionBadge(doc, s.final_decision, marginX, y);
    y += 6;
  }

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Avg Temperature (°C)', fmt(s.avg_temperature)],
      ['Avg Humidity (%)', fmt(s.avg_humidity)],
      ['Heat-Retaining Area (%)', fmt(s.heat_retaining_percent, 1)],
      ['Vegetation Coverage (%)', fmt(s.vegetation_percent, 1)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 6, lineColor: THEME.border, lineWidth: 0.2 },
    headStyles: { fillColor: THEME.primary, textColor: 255 },
    margin: { left: marginX, right: marginX },
    columnStyles: { 0: { cellWidth: 220 }, 1: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Per-segment results table
  const detailed = item?.results?.detailed_results;
  if (Array.isArray(detailed) && detailed.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Per-Segment Results', marginX, y);
    y += 6;

    const detBody = detailed.map((d, i) => [
      String(i + 1),
      safe(d.location || d.label || '(segment)'),
      safe(d.material ?? ''),
      fmt(d.temperature),
      fmt(d.humidity),
      fmt(d.area),
      safe(d.heat_island ?? ''),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Location/Label', 'Material', 'Temp', 'Humid', 'Area', 'Heat Island']],
      body: detBody,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 5, lineColor: THEME.border, lineWidth: 0.2 },
      headStyles: { fillColor: THEME.primaryDark, textColor: 255 },
      alternateRowStyles: { fillColor: THEME.bgSoft },
      margin: { left: marginX, right: marginX },
      columnStyles: {
        0: { halign: 'center', cellWidth: 24 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
      },
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  /* ---------- 4) RECOMMENDATIONS ---------- */
  y = sectionHeader(doc, 'Recommendations', marginX, y, innerW);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const rec = safe(item?.recommendation || '(No recommendation)');
  const split = doc.splitTextToSize(rec, innerW);
  const needed = split.length * 12;
  if (y + needed > pageH - 40) {
    doc.addPage();
    y = 50;
  }
  doc.text(split, marginX, y);
}

/* ============================== PUBLIC APIS ============================== */
export async function exportUHIItemPDF(item) {
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  await renderItemIntoExistingDoc(doc, item);

  // Footer page numbers
  const pages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(...THEME.muted);
    doc.text(`HeatScape • UHI Report • Page ${p}/${pages}`, pageW - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  const title = item?.source === 'manual' ? 'manual' : 'session';
  const name = `${title}_report_${(item?.fsDocId || item?.id || 'image').toString().replace(/[:/]/g, '-')}.pdf`;
  doc.save(name);
}

export async function exportUHIMultiPDF(items = []) {
  if (!items.length) return;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // sequential render keeps memory low
  // eslint-disable-next-line no-restricted-syntax
  for (const [idx, item] of items.entries()) {
    if (idx > 0) doc.addPage();
    // eslint-disable-next-line no-await-in-loop
    await renderItemIntoExistingDoc(doc, item);
  }

  // Footer page numbers
  const pages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(...THEME.muted);
    doc.text(`HeatScape • UHI Batch Report • Page ${p}/${pages}`, pageW - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  const when = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  doc.save(`uhi_batch_report_${when}.pdf`);
}
