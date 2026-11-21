import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { getLanguageMeta, SupportedLangCode } from '../i18n/languages';
import { AstBlock, parseToAst } from '../parsers/setextCustomParser';
import type { NoteRecord } from './storageService';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineHtml(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;color:#0f172a;padding:1px 5px;border-radius:4px;font-family:\'JetBrains Mono\',monospace;font-size:0.9em;">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:700;">$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

function renderAstToPrintableHtml(
  title: string,
  rawContent: string,
  langCode: SupportedLangCode,
  sourceFormat: string
): string {
  const meta = getLanguageMeta(langCode);
  const blocks: AstBlock[] = parseToAst(rawContent);

  const bodyHtml = blocks
    .map((block) => {
      switch (block.type) {
        case 'h1':
          return `<h1 style="font-size:21px;font-weight:700;color:#0f172a;margin:20px 0 8px;line-height:1.25;">${formatInlineHtml(block.text)}</h1>`;
        case 'h2':
          return `<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">${formatInlineHtml(block.text)}</h2>`;
        case 'h3':
          return `<h3 style="font-size:13.5px;font-weight:600;color:#334155;margin:12px 0 4px;">${formatInlineHtml(block.text)}</h3>`;
        case 'paragraph':
          return `<p style="font-size:12px;line-height:1.65;color:#1e293b;margin:0 0 10px;">${formatInlineHtml(block.text)}</p>`;
        case 'blockquote':
          return `<blockquote style="margin:10px 0;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:11.5px;color:#334155;font-style:italic;">${formatInlineHtml(block.text)}</blockquote>`;
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          const listStyle = block.ordered ? 'decimal' : 'disc';
          const items = block.items
            .map((item) => `<li style="margin:4px 0;">${formatInlineHtml(item)}</li>`)
            .join('');
          return `<${tag} style="margin:8px 0 12px;padding-inline-start:20px;list-style-type:${listStyle};font-size:12px;line-height:1.6;color:#1e293b;">${items}</${tag}>`;
        }
        case 'code':
          return `<div style="margin:10px 0 14px;border-radius:6px;overflow:hidden;border:1px solid #1e293b;background:#0f172a;direction:ltr;text-align:left;">
            <div style="background:#1e293b;color:#94a3b8;padding:4px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;">${escapeHtml(String(block.language))}</div>
            <pre style="margin:0;padding:10px 12px;color:#f8fafc;font-family:'JetBrains Mono',monospace;font-size:10.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${escapeHtml(block.code)}</pre>
          </div>`;
        case 'table': {
          const ths = block.headers
            .map(
              (h) =>
                `<th style="text-align:start;padding:6px 8px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;font-weight:600;">${formatInlineHtml(h)}</th>`
            )
            .join('');
          const trs = block.rows
            .map(
              (row) =>
                `<tr>${row
                  .map(
                    (c) =>
                      `<td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${formatInlineHtml(c)}</td>`
                  )
                  .join('')}</tr>`
            )
            .join('');
          return `<table style="width:100%;border-collapse:collapse;margin:10px 0 14px;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
        }
        case 'hr':
          return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:14px 0;" />`;
      }
    })
    .join('\n');

  const dateStr = new Date().toISOString().slice(0, 10);

  return `<div dir="${meta.dir}" lang="${meta.code}" style="width:740px;padding:42px 46px;background:#ffffff;color:#0f172a;font-family:'Noto Sans','Noto Naskh Arabic','Noto Sans Devanagari','Noto Sans Bengali','Noto Sans Tamil','Noto Sans Telugu','Noto Sans Ethiopic','DM Sans',sans-serif;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px;margin-bottom:18px;border-bottom:1px solid #cbd5e1;">
      <div>
        <div style="font-size:10px;color:#64748b;margin-bottom:4px;">AInotes Structured Study Export · ${escapeHtml(sourceFormat.toUpperCase())} · ${escapeHtml(meta.nativeName)} (${meta.code})</div>
        <div style="font-size:22px;font-weight:700;color:#0f172a;">${escapeHtml(title)}</div>
      </div>
      <div style="font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${dateStr}</div>
    </div>
    ${bodyHtml}
  </div>`;
}

async function appendHtmlToPdf(
  pdf: jsPDF,
  html: string,
  addNewPageBefore: boolean
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const targetNode = container.firstElementChild as HTMLElement;
    const dataUrl = await toPng(targetNode, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to rasterize PDF canvas.'));
    });

    if (addNewPageBefore) {
      pdf.addPage();
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (img.height * imgWidth) / img.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 2) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Generates and downloads a real multi-page A4 .pdf file directly in the browser.
 * Renders via SVG foreignObject (html-to-image) so HarfBuzz/browser script shaping
 * works cleanly for all 26 languages including RTL Arabic/Urdu/Farsi/Punjabi & Indic scripts.
 */
export async function exportStructuredPdf(
  title: string,
  rawContent: string,
  langCode: SupportedLangCode,
  sourceFormat = 'md'
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await appendHtmlToPdf(
    pdf,
    renderAstToPrintableHtml(title, rawContent, langCode, sourceFormat),
    false
  );

  const safeSlug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff\u0900-\u097f]+/gi, '-')
      .replace(/^-|-$/g, '') || 'ainotes-document';
  pdf.save(`${safeSlug}.pdf`);
}

function renderStudyGuideCoverHtml(notes: NoteRecord[]): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const tocRows = notes
    .map((n, index) => {
      const meta = getLanguageMeta(n.language);
      const tagsLabel =
        n.tags && n.tags.length > 0
          ? n.tags.map((t) => `#${escapeHtml(t)}`).join(' ')
          : '';
      return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid #e2e8f0;gap:12px;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:13px;font-weight:600;color:#0f172a;">${index + 1}. ${escapeHtml(n.title)}${
        n.pinned
          ? ' <span style="font-size:10px;font-weight:600;color:#b45309;">[PINNED]</span>'
          : ''
      }</div>
          ${
            tagsLabel
              ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">${tagsLabel}</div>`
              : ''
          }
        </div>
        <div style="font-size:10.5px;color:#475569;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${escapeHtml(
          n.sourceType.toUpperCase()
        )} · ${escapeHtml(meta.nativeName)} (${escapeHtml(n.language)})</div>
      </div>`;
    })
    .join('\n');

  return `<div dir="ltr" lang="en" style="width:740px;padding:46px 46px;background:#ffffff;color:#0f172a;font-family:'Noto Sans','Noto Naskh Arabic','Noto Sans Devanagari','Noto Sans Bengali','Noto Sans Tamil','Noto Sans Telugu','Noto Sans Ethiopic','DM Sans',sans-serif;box-sizing:border-box;">
    <div style="padding-bottom:16px;margin-bottom:20px;border-bottom:2px solid #0f172a;">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#2563eb;margin-bottom:6px;">AInotes Consolidated Study Guide</div>
      <div style="font-size:26px;font-weight:700;color:#0f172a;line-height:1.2;">Complete Active Notebook</div>
      <div style="font-size:12px;color:#475569;margin-top:8px;">${notes.length} Active ${
    notes.length === 1 ? 'Note' : 'Notes'
  } · Generated ${dateStr}</div>
    </div>
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;margin-bottom:8px;">Table of Contents</div>
    ${tocRows}
  </div>`;
}

/**
 * Packages all non-archived notes into a single consolidated multi-page PDF study guide
 * with a cover Table of Contents page followed by each note's formatted AST layout.
 */
export async function exportConsolidatedStudyGuidePdf(
  notes: NoteRecord[]
): Promise<void> {
  if (notes.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await appendHtmlToPdf(pdf, renderStudyGuideCoverHtml(notes), false);

  for (const note of notes) {
    await appendHtmlToPdf(
      pdf,
      renderAstToPrintableHtml(
        note.title,
        note.content,
        note.language || 'en',
        note.sourceType
      ),
      true
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`ainotes-study-guide-${dateStr}.pdf`);
}

/**
 * Packages all non-archived notes into a single downloadable .zip archive
 * preserving each note's source extension (.md, .mdx, .txt) and a README index.
 */
export async function exportNotesAsZip(notes: NoteRecord[]): Promise<void> {
  if (notes.length === 0) return;

  const zip = new JSZip();
  const usedNames = new Set<string>();
  const indexLines: string[] = [
    '# AInotes Export Bundle',
    '',
    `Exported on ${new Date().toISOString().slice(0, 10)} (${notes.length} active notes)`,
    '',
    '| # | File | Title | Language | Labels |',
    '| --- | --- | --- | --- | --- |',
  ];

  notes.forEach((note, idx) => {
    const ext =
      note.sourceType === 'mdx'
        ? 'mdx'
        : note.sourceType === 'txt'
        ? 'txt'
        : 'md';
    const baseSlug =
      note.title
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff\u0900-\u097f]+/gi, '-')
        .replace(/^-|-$/g, '') || 'untitled-note';

    let filename = `${baseSlug}.${ext}`;
    let counter = 2;
    while (usedNames.has(filename.toLowerCase())) {
      filename = `${baseSlug}-${counter}.${ext}`;
      counter++;
    }
    usedNames.add(filename.toLowerCase());

    zip.file(filename, note.content);
    const labels = (note.tags ?? []).join(', ') || '—';
    indexLines.push(
      `| ${idx + 1} | ${filename} | ${note.title.replace(/\|/g, '\\|')} | ${note.language} | ${labels} |`
    );
  });

  zip.file('README.md', indexLines.join('\n'));

  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ainotes-active-notes-${dateStr}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Hidden-iframe vector Print-to-PDF (no window.open) so students can also save
 * selectable vector text PDFs with native Noto font shaping.
 */
export function printVectorPdf(
  title: string,
  rawContent: string,
  langCode: SupportedLangCode,
  sourceFormat = 'md'
): void {
  const htmlBody = renderAstToPrintableHtml(title, rawContent, langCode, sourceFormat);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  const docHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Sans+Bengali:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+Ethiopic:wght@400;600&family=Noto+Sans+Tamil:wght@400;600&family=Noto+Sans+Telugu:wght@400;600&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 14mm; }
    body { margin: 0; background: #fff; }
  </style>
</head>
<body>${htmlBody}</body>
</html>`;

  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) return;
  win.document.open();
  win.document.write(docHtml);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1500);
  }, 450);
}

export function exportTypstSource(
  title: string,
  rawContent: string,
  langCode: SupportedLangCode
): void {
  const meta = getLanguageMeta(langCode);
  const blocks = parseToAst(rawContent);
  const header = [
    `#set page(paper: "a4", margin: (x: 20mm, y: 22mm), numbering: "1")`,
    `#set text(font: ("Noto Sans", "Noto Naskh Arabic"), size: 10.5pt, dir: ${meta.dir}, lang: "${meta.code.split('-')[0]}")`,
    `#show raw.where(block: true): it => block(fill: rgb("#0F172A"), text(fill: rgb("#F8FAFC"), font: "JetBrains Mono", size: 9pt, it), inset: 10pt, radius: 4pt, width: 100%)`,
    `= ${title}`,
    `#text(size: 8.5pt, fill: rgb("#64748B"))[AInotes Typst Source · ${meta.nativeName} (${meta.code})]`,
    `#line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))`,
    '',
  ];

  const body = blocks.map((b) => {
    switch (b.type) {
      case 'h1':
        return `\n= ${b.text}`;
      case 'h2':
        return `\n== ${b.text}`;
      case 'h3':
        return `\n=== ${b.text}`;
      case 'paragraph':
        return b.text;
      case 'blockquote':
        return `#quote[${b.text}]`;
      case 'list':
        return b.items.map((it) => (b.ordered ? `+ ${it}` : `- ${it}`)).join('\n');
      case 'code':
        return `\`\`\`${String(b.language).toLowerCase()}\n${b.code}\n\`\`\``;
      case 'hr':
        return `#line(length: 100%)`;
      case 'table':
        return b.headers.join(' | ');
    }
  });

  const blob = new Blob([[...header, ...body].join('\n\n')], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'note'}.typ`;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeFenceLangTag(detected: string): string {
  const lower = detected.trim().toLowerCase();
  const map: Record<string, string> = {
    'dart/flutter': 'dart',
    'bash/shell': 'bash',
    'cobol/assembly': 'asm',
    'c++': 'cpp',
    'c#': 'csharp',
  };
  return map[lower] ?? lower.replace(/\s+/g, '-');
}

/**
 * Converts a NoteRecord (supporting both Setext lightweight markup and Markdown)
 * into clean standard Markdown (.md), preserving all fenced/indented code blocks
 * and floating sticky-note annotations.
 */
export function buildMarkdownExport(note: NoteRecord): string {
  const meta = getLanguageMeta(note.language || 'en');
  const lines = note.content.replace(/\r\n/g, '\n').split('\n');
  const annotations = [...(note.annotations ?? [])].sort(
    (a, b) => a.lineNumber - b.lineNumber
  );
  const placedAnnotationIds = new Set<string>();
  const output: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const current = lines[i];
    const trimmed = current.trim();
    const next = lines[i + 1] ?? '';

    // 1. Existing fenced code block — preserve contents verbatim and attach matching annotations
    if (/^```/.test(trimmed)) {
      const startLine = i + 1;
      const openFence = current;
      const codeBody: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeBody.push(lines[i]);
        i++;
      }
      const endLine = i + 1;
      const closeFence = i < lines.length ? lines[i] : '```';
      if (i < lines.length) i++;

      output.push(openFence, ...codeBody, closeFence);

      const blockAnns = annotations.filter(
        (ann) => ann.lineNumber >= startLine && ann.lineNumber <= endLine
      );
      if (blockAnns.length > 0) {
        output.push('');
        for (const ann of blockAnns) {
          placedAnnotationIds.add(ann.id);
          output.push(
            `> **Sticky Note (Line ${ann.lineNumber} · \`${ann.anchorText}\`):** ${ann.text}`
          );
        }
      }
      continue;
    }

    // 2. Setext underline headings (***, ===, ---)
    if (trimmed.length > 0 && /^\*{3,}$/.test(next.trim())) {
      output.push(`# ${trimmed}`);
      i += 2;
      continue;
    }
    if (trimmed.length > 0 && /^={3,}$/.test(next.trim())) {
      output.push(`## ${trimmed}`);
      i += 2;
      continue;
    }
    if (trimmed.length > 0 && /^-{3,}$/.test(next.trim())) {
      output.push(`### ${trimmed}`);
      i += 2;
      continue;
    }

    // 3. 3-space indented Setext code blocks -> standard fenced code blocks
    if (/^ {3}\S/.test(current)) {
      const startLine = i + 1;
      const codeLines: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('   ') || lines[i].trim() === '')
      ) {
        if (
          lines[i].trim() === '' &&
          (i + 1 >= lines.length || !lines[i + 1].startsWith('   '))
        ) {
          break;
        }
        codeLines.push(lines[i].startsWith('   ') ? lines[i].slice(3) : '');
        i++;
      }
      const endLine = i;
      const codeBody = codeLines.join('\n').trimEnd();
      const detectedLang = normalizeFenceLangTag(
        parseToAst(`\`\`\`\n${codeBody}\n\`\`\``).find((b) => b.type === 'code')
          ?.language?.toString() ?? 'text'
      );

      output.push(`\`\`\`${detectedLang}`, codeBody, '```');

      const blockAnns = annotations.filter(
        (ann) => ann.lineNumber >= startLine && ann.lineNumber <= endLine
      );
      if (blockAnns.length > 0) {
        output.push('');
        for (const ann of blockAnns) {
          placedAnnotationIds.add(ann.id);
          output.push(
            `> **Sticky Note (Line ${ann.lineNumber} · \`${ann.anchorText}\`):** ${ann.text}`
          );
        }
      }
      continue;
    }

    output.push(current);
    i++;
  }

  let markdownBody = output.join('\n').trim();
  const hasTopH1 = /^#\s+/.test(markdownBody);
  const headerLines: string[] = [];
  if (!hasTopH1 && note.title.trim()) {
    headerLines.push(`# ${note.title.trim()}`, '');
  }
  const metaParts = [`Language: ${meta.nativeName} (${note.language || 'en'})`];
  if (note.tags && note.tags.length > 0) {
    metaParts.push(`Labels: ${note.tags.join(', ')}`);
  }
  if (headerLines.length > 0) {
    headerLines.push(`> ${metaParts.join(' · ')}`, '');
  }

  const remainingAnns = annotations.filter(
    (ann) => !placedAnnotationIds.has(ann.id)
  );
  const annotationFooter: string[] = [];
  if (remainingAnns.length > 0) {
    annotationFooter.push('', '---', '', '## Annotations', '');
    for (const ann of remainingAnns) {
      annotationFooter.push(
        `- **Line ${ann.lineNumber}** (\`${ann.anchorText}\` · ${ann.color}): ${ann.text}`
      );
    }
  }

  return [...headerLines, markdownBody, ...annotationFooter].join('\n').trim() + '\n';
}

export function exportNoteAsMarkdown(note: NoteRecord): void {
  const mdContent = buildMarkdownExport(note);
  const safeSlug =
    note.title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff\u0900-\u097f]+/gi, '-')
      .replace(/^-|-$/g, '') || 'ainotes-note';

  const blob = new Blob([mdContent], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeSlug}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
