/**
 * DocFlow — Document Importers (DOCX, XLSX, CSV, MD, TXT, HTML) & Exporters
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast } = window.DocFlow.UI;

  const SUPPORTED_DOC_EXTS = ['docx', 'pdf', 'txt', 'html', 'htm', 'csv', 'md', 'markdown', 'xlsx', 'xls', 'pptx', 'ppt'];

  // Helper download blob
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function getBaseName() {
    const display = $('#fileNameDisplay');
    const name = (display ? display.textContent : 'document') || 'document';
    return name.replace(/\.[^.]+$/, '') || 'document';
  }

  // ==========================================================================
  // Document Reading & Parsing
  // ==========================================================================

  async function handleFile(file) {
    if (!file) return;
    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();

    // Check if it's an image dropped into document
    if (window.DocFlow.ImageManager && window.DocFlow.ImageManager.isImageFile(file)) {
      if (window.DocFlow.currentMode === 'edit') {
        try {
          const dataUrl = await window.DocFlow.ImageManager.optimizeImage(file);
          window.DocFlow.ImageManager.insertImageIntoDocument(dataUrl, name);
          showToast(`Inserted image "${name}" into document`, 'success');
          return;
        } catch (e) {
          showToast(`Could not load image "${name}"`, 'error');
        }
      }
    }

    if (!SUPPORTED_DOC_EXTS.includes(ext)) {
      showToast(`Unsupported file type: .${ext}`, 'error');
      showToast(`Supported documents: DOCX, PDF, PPTX, XLSX, TXT, HTML, CSV, MD`, 'info');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast(`File "${name}" exceeds 50MB size limit`, 'error');
      return;
    }

    const existing = window.DocFlow.UI.Tabs.findByFile(name);
    if (existing) {
      window.DocFlow.UI.Tabs.switchTo(existing.id);
      showToast(`"${name}" is already open`, 'info');
      return;
    }

    // PDF files
    if (ext === 'pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error('File is empty');
        const tab = window.DocFlow.UI.Tabs.create(name, '', 'PDF', 'pdf');
        tab.pdfData = arrayBuffer;
        await window.DocFlow.PDF.loadPdfTab(tab);
        window.DocFlow.UI.Tabs.render();
        window.DocFlow.UI.Tabs.save();
        if (window.DocFlow?.Recent) {
          window.DocFlow.Recent.add({ name, type: 'PDF', mode: 'view', pdfData: arrayBuffer, size: file.size });
        }
      } catch (err) {
        console.error(err);
        if (err && err.name === 'PasswordException') {
          showToast('This PDF is password-protected and cannot be opened', 'error');
        } else {
          showToast(`Failed to open "${name}": ${(err && err.message) || 'Unknown error'}`, 'error');
        }
      }
      return;
    }

    // Editable text documents
    let content = '';
    let fileTypeLabel = ext.toUpperCase();

    try {
      showToast(`Opening "${name}"...`, 'info');

      if (ext === 'docx') {
        const ab = await file.arrayBuffer();
        content = await docxToHtml(ab, name);
        fileTypeLabel = 'DOCX';
      } else if (ext === 'txt') {
        const text = await file.text();
        content = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        fileTypeLabel = 'TXT';
      } else if (ext === 'html' || ext === 'htm') {
        const rawHtml = await file.text();
        // Display as raw editable code to avoid rendering preview and crashing on large files
        content = `<pre class="html-code-view" style="font-family: 'Fira Code', 'Courier New', Consolas, monospace; font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; margin: 0; background: transparent; border: none; padding: 0;">${escHtml(rawHtml)}</pre>`;
        fileTypeLabel = 'HTML';
      } else if (ext === 'csv') {
        const text = await file.text();
        content = csvToHtml(text);
        fileTypeLabel = 'CSV';
      } else if (ext === 'md' || ext === 'markdown') {
        const mdText = await file.text();
        content = `<pre class="md-code-view" style="font-family: 'Fira Code', 'Courier New', Consolas, monospace; font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; margin: 0; background: transparent; border: none; padding: 0;">${escHtml(mdText)}</pre>`;
        fileTypeLabel = 'Markdown';
      } else if (ext === 'xlsx' || ext === 'xls') {
        const ab = await file.arrayBuffer();
        content = excelToHtml(ab, name);
        fileTypeLabel = 'Excel';
      } else if (ext === 'pptx' || ext === 'ppt') {
        const ab = await file.arrayBuffer();
        content = await pptxToHtml(ab, name);
        fileTypeLabel = 'PowerPoint';
      }
    } catch (err) {
      console.error(err);
      showToast(`Failed to parse "${name}": ${err.message}`, 'error');
      return;
    }

    if (!content.trim()) content = '<p><br></p>';

    const tab = window.DocFlow.UI.Tabs.create(name, content, fileTypeLabel, 'edit');
    window.DocFlow.UI.Tabs.activateTab(tab);
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.add({ name, type: fileTypeLabel, content, mode: 'edit', size: file.size });
    }
    showToast(`Successfully opened "${name}"`, 'success');
  }

  // ==========================================================================
  // CSV & Excel Converters
  // ==========================================================================

  function parseCsv(text) {
    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const rows = [];
    let cur = '', inQ = false, row = [];
    const flush = () => {
      row.push(cur.trim());
      cur = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i], nx = text[i + 1];
      if (inQ) {
        if (ch === '"' && nx === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { row.push(cur.trim()); cur = ''; }
        else if (ch === '\n' || (ch === '\r' && nx === '\n')) { flush(); if (ch === '\r') i++; }
        else if (ch === '\r') { flush(); }
        else cur += ch;
      }
    }
    flush();
    return rows;
  }

  function looksLikeHeader(row) {
    if (!row || !row.length) return false;
    const cells = row.map(c => String(c).trim());
    const nonEmpty = cells.filter(c => c !== '');
    if (!nonEmpty.length) return false;
    const numeric = nonEmpty.filter(c => !isNaN(Number(c))).length;
    return (numeric / nonEmpty.length) < 0.5;
  }

  // High-Fidelity DOCX Parser (Bug 7: Fonts, styles, links, spacing, alignment, layout, and embedded images)
  async function docxToHtml(arrayBuffer, filename) {
    if (typeof window.JSZip === 'undefined') {
      if (window.mammoth) {
        const res = await window.mammoth.convertToHtml({ arrayBuffer });
        return res.value || '<p><br></p>';
      }
      return '<p>Document parser not loaded</p>';
    }

    try {
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const docXmlEntry = zip.file('word/document.xml');
      if (!docXmlEntry) {
        throw new Error('word/document.xml not found in package');
      }

      // Read relationships to map IDs to images and external links
      const relsMap = {};
      const relsEntry = zip.file('word/_rels/document.xml.rels');
      if (relsEntry) {
        const relsXml = await relsEntry.async('string');
        const parser = new DOMParser();
        const relsDoc = parser.parseFromString(relsXml, 'application/xml');
        relsDoc.querySelectorAll('Relationship').forEach(rel => {
          const id = rel.getAttribute('Id');
          const target = rel.getAttribute('Target');
          const type = rel.getAttribute('Type') || '';
          relsMap[id] = { target, type };
        });
      }

      // Extract all embedded images in word/media/
      const mediaMap = {};
      const mediaFiles = [];
      zip.forEach((path, entry) => {
        if (/^word\/media\//i.test(path)) {
          mediaFiles.push({ path, entry });
        }
      });

      for (const m of mediaFiles) {
        try {
          const base64 = await m.entry.async('base64');
          const ext = m.path.split('.').pop().toLowerCase();
          const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
          const dataUrl = `data:${mime};base64,${base64}`;
          const normalizedPath = m.path.replace(/^word\//i, '');
          mediaMap[normalizedPath] = dataUrl;
          mediaMap[m.path] = dataUrl;
          const fileName = m.path.split('/').pop();
          mediaMap[fileName] = dataUrl;
        } catch (e) { }
      }

      // Read document.xml and parse
      const docXml = await docXmlEntry.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXml, 'application/xml');

      const parseRunStyles = (rPr) => {
        if (!rPr) return '';
        const styles = [];
        const rFonts = rPr.querySelector('rFonts');
        if (rFonts) {
          const font = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi');
          if (font) styles.push(`font-family: '${font}', sans-serif;`);
        }
        const sz = rPr.querySelector('sz');
        if (sz) {
          const val = parseInt(sz.getAttribute('w:val'), 10);
          if (!isNaN(val)) styles.push(`font-size: ${Math.round(val / 2)}pt;`);
        }
        if (rPr.querySelector('b')) styles.push('font-weight: bold;');
        if (rPr.querySelector('i')) styles.push('font-style: italic;');
        if (rPr.querySelector('u')) styles.push('text-decoration: underline;');
        if (rPr.querySelector('strike')) styles.push('text-decoration: line-through;');
        const color = rPr.querySelector('color');
        if (color) {
          const val = color.getAttribute('w:val');
          if (val && val !== 'auto') styles.push(`color: #${val};`);
        }
        const highlight = rPr.querySelector('highlight');
        if (highlight) {
          const val = highlight.getAttribute('w:val');
          if (val && val !== 'none') styles.push(`background-color: ${val};`);
        }
        const shd = rPr.querySelector('shd');
        if (shd) {
          const fill = shd.getAttribute('w:fill');
          if (fill && fill !== 'auto' && fill !== 'none') styles.push(`background-color: #${fill};`);
        }
        return styles.join(' ');
      };

      const parseParagraphStyles = (pPr) => {
        if (!pPr) return { css: '', tag: 'p' };
        const styles = [];
        let tag = 'p';

        const jc = pPr.querySelector('jc');
        if (jc) {
          const val = jc.getAttribute('w:val');
          if (val === 'center') styles.push('text-align: center;');
          else if (val === 'right') styles.push('text-align: right;');
          else if (val === 'both') styles.push('text-align: justify;');
          else if (val === 'left') styles.push('text-align: left;');
        }

        const spacing = pPr.querySelector('spacing');
        if (spacing) {
          const line = spacing.getAttribute('w:line');
          if (line) {
            const lineVal = parseInt(line, 10);
            if (!isNaN(lineVal)) styles.push(`line-height: ${(lineVal / 240).toFixed(2)};`);
          }
          const before = spacing.getAttribute('w:before');
          if (before) styles.push(`margin-top: ${Math.round(parseInt(before, 10) / 20)}pt;`);
          const after = spacing.getAttribute('w:after');
          if (after) styles.push(`margin-bottom: ${Math.round(parseInt(after, 10) / 20)}pt;`);
        }

        const pStyle = pPr.querySelector('pStyle');
        if (pStyle) {
          const sVal = (pStyle.getAttribute('w:val') || '').toLowerCase();
          if (sVal.includes('heading 1') || sVal === 'heading1' || sVal === '1') tag = 'h1';
          else if (sVal.includes('heading 2') || sVal === 'heading2' || sVal === '2') tag = 'h2';
          else if (sVal.includes('heading 3') || sVal === 'heading3' || sVal === '3') tag = 'h3';
          else if (sVal.includes('heading 4') || sVal === 'heading4' || sVal === '4') tag = 'h4';
          else if (sVal.includes('title')) tag = 'h1';
        }

        return { css: styles.join(' '), tag };
      };

      const body = xmlDoc.querySelector('body');
      if (!body) throw new Error('w:body element missing in document.xml');

      let resultHtml = '';

      body.childNodes.forEach(node => {
        const localName = node.localName || node.nodeName.split(':').pop();

        if (localName === 'p') {
          const pPr = node.querySelector(':scope > pPr');
          const { css, tag } = parseParagraphStyles(pPr);

          let inner = '';
          node.childNodes.forEach(child => {
            const cName = child.localName || child.nodeName.split(':').pop();
            if (cName === 'r') {
              const rPr = child.querySelector(':scope > rPr');
              const rCss = parseRunStyles(rPr);

              const t = child.querySelector(':scope > t');
              if (t) {
                const textContent = escHtml(t.textContent || '');
                inner += rCss ? `<span style="${rCss}">${textContent}</span>` : textContent;
              }

              if (child.querySelector(':scope > br')) {
                inner += '<br>';
              }

              const drawings = child.querySelectorAll('drawing, pict');
              drawings.forEach(d => {
                const blip = d.querySelector('blip, imagedata');
                if (blip) {
                  const embedId = blip.getAttribute('r:embed') || blip.getAttribute('r:id');
                  if (embedId && relsMap[embedId]) {
                    const target = relsMap[embedId].target;
                    const cleanTarget = target.replace(/^word\//i, '');
                    const imgUrl = mediaMap[cleanTarget] || mediaMap[target] || mediaMap[target.split('/').pop()];
                    if (imgUrl) {
                      const extent = d.querySelector('extent');
                      let imgStyle = 'max-width:100%;height:auto;display:inline-block;margin:6px 0;border-radius:4px;';
                      if (extent) {
                        const cx = parseInt(extent.getAttribute('cx'), 10);
                        if (!isNaN(cx)) {
                          const pxWidth = Math.round(cx / 9525);
                          if (pxWidth > 20 && pxWidth < 900) imgStyle += `width:${pxWidth}px;`;
                        }
                      }
                      inner += `<img src="${imgUrl}" alt="Embedded image" style="${imgStyle}" draggable="true" data-wrap="inline">`;
                    }
                  }
                }
              });
            } else if (cName === 'hyperlink') {
              const rId = child.getAttribute('r:id');
              const targetUrl = (rId && relsMap[rId]) ? relsMap[rId].target : '#';
              let linkInner = '';
              child.querySelectorAll('r').forEach(rNode => {
                const rPr = rNode.querySelector(':scope > rPr');
                const rCss = parseRunStyles(rPr);
                const t = rNode.querySelector(':scope > t');
                if (t) {
                  const txt = escHtml(t.textContent || '');
                  linkInner += rCss ? `<span style="${rCss}">${txt}</span>` : txt;
                }
              });
              inner += `<a href="${escHtml(targetUrl)}" target="_blank" rel="noopener">${linkInner || escHtml(targetUrl)}</a>`;
            }
          });

          if (!inner.trim()) inner = '<br>';
          resultHtml += `<${tag}${css ? ` style="${css}"` : ''}>${inner}</${tag}>`;
        } else if (localName === 'tbl') {
          let tblHtml = '<table style="border-collapse:collapse;width:100%;margin:14px 0;"><tbody>';
          node.querySelectorAll(':scope > tr').forEach(tr => {
            tblHtml += '<tr>';
            tr.querySelectorAll(':scope > tc').forEach(tc => {
              const tcPr = tc.querySelector(':scope > tcPr');
              let cellStyle = 'border:1px solid #cbd5e1;padding:6px 10px;vertical-align:top;';
              if (tcPr) {
                const shd = tcPr.querySelector('shd');
                if (shd) {
                  const fill = shd.getAttribute('w:fill');
                  if (fill && fill !== 'auto') cellStyle += `background-color:#${fill};`;
                }
                const tcW = tcPr.querySelector('tcW');
                if (tcW) {
                  const wVal = parseInt(tcW.getAttribute('w:w'), 10);
                  if (!isNaN(wVal) && wVal > 0) cellStyle += `width:${Math.round(wVal / 20)}pt;`;
                }
              }

              let cellContent = '';
              tc.querySelectorAll(':scope > p').forEach(cp => {
                let pText = '';
                cp.querySelectorAll('r').forEach(r => {
                  const rPr = r.querySelector('rPr');
                  const rCss = parseRunStyles(rPr);
                  const t = r.querySelector('t');
                  if (t) {
                    const txt = escHtml(t.textContent || '');
                    pText += rCss ? `<span style="${rCss}">${txt}</span>` : txt;
                  }
                  const blip = r.querySelector('blip');
                  if (blip) {
                    const embedId = blip.getAttribute('r:embed');
                    if (embedId && relsMap[embedId]) {
                      const imgUrl = mediaMap[relsMap[embedId].target.split('/').pop()];
                      if (imgUrl) pText += `<img src="${imgUrl}" style="max-width:100%;height:auto;border-radius:3px;">`;
                    }
                  }
                });
                cellContent += `<p style="margin:2px 0;">${pText || '<br>'}</p>`;
              });

              tblHtml += `<td style="${cellStyle}">${cellContent || '<br>'}</td>`;
            });
            tblHtml += '</tr>';
          });
          tblHtml += '</tbody></table>';
          resultHtml += tblHtml;
        }
      });

      if (resultHtml.trim()) return resultHtml;
      throw new Error('Parsed document yielded empty body');
    } catch (err) {
      console.warn('DocFlow custom DOCX parser fallback to Mammoth:', err);
      if (window.mammoth) {
        const options = {
          convertImage: window.mammoth.images.imgElement(image => {
            return image.read("base64").then(imageBuffer => ({
              src: "data:" + image.contentType + ";base64," + imageBuffer
            }));
          }),
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh"
          ]
        };
        const result = await window.mammoth.convertToHtml({ arrayBuffer }, options);
        return result.value || '<p><br></p>';
      }
      return `<p>Could not render "${escHtml(filename)}": ${escHtml(err.message)}</p>`;
    }
  }

  function csvToHtml(text) {
    const rows = parseCsv(text);
    if (!rows.length) return '<p>Empty CSV file</p>';
    const cols = rows[0].length;
    let html = `<div class="excel-spreadsheet-container">`;
    html += `
      <div class="excel-formula-bar">
        <span class="excel-fx-badge">fx</span>
        <input type="text" class="excel-formula-input" placeholder="Select cell to view/edit value">
      </div>
      <div class="excel-sheet-viewport">
        <table class="excel-grid-table">
    `;
    html += '<thead><tr><th class="excel-corner" contenteditable="false"></th>';
    for (let c = 0; c < cols; c++) {
      html += `<th class="excel-col-hdr" contenteditable="false">${getExcelColLetter(c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    rows.forEach((r, rIdx) => {
      html += `<tr><th class="excel-row-hdr" contenteditable="false">${rIdx + 1}</th>`;
      for (let c = 0; c < cols; c++) {
        const val = r[c] !== undefined ? r[c] : '';
        html += `<td contenteditable="true">${escHtml(val)}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  // Convert zero-based column index to Excel column letter (0 -> A, 25 -> Z, 26 -> AA, up to 16383 -> XFD)
  function getExcelColLetter(index) {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  // Realistic Excel Spreadsheet Viewer with auto-adjusting formula bar and grid (Bug 6)
  function excelToHtml(arrayBuffer, filename) {
    if (typeof window.XLSX === 'undefined') {
      return '<p>Excel reader library not loaded. Please refresh the page.</p>';
    }

    try {
      const wb = window.XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: true,
        cellText: true,
        dateNF: 'yyyy-mm-dd'
      });

      let html = `<p style="margin-bottom:12px;color:var(--text-primary);"><strong style="color:var(--text-primary);"><i class="fas fa-file-excel" style="color:#16a34a;margin-right:6px;"></i>${escHtml(filename)}</strong> — <span style="color:var(--text-muted);">${wb.SheetNames.length} sheet(s)</span></p>`;

      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const data = window.XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: '',
          dateNF: 'yyyy-mm-dd'
        });

        let maxCols = 10;
        if (data && data.length) {
          data.forEach(r => { if (r && r.length > maxCols) maxCols = r.length; });
        }

        const rowCount = Math.max(30, (data ? data.length : 0));
        const maxDisplayRows = Math.min(rowCount, 500);

        html += `<h3 style="margin:16px 0 8px;font-size:15px;color:var(--text-primary);"><i class="fas fa-table-cells" style="color:#16a34a;margin-right:6px;"></i>Sheet: ${escHtml(sheetName)}</h3>`;
        html += `<div class="excel-spreadsheet-container">`;
        html += `
          <div class="excel-formula-bar">
            <span class="excel-fx-badge">fx</span>
            <input type="text" class="excel-formula-input" placeholder="Select cell to view/edit formula or value">
          </div>
          <div class="excel-sheet-viewport">
            <table class="excel-grid-table">
        `;

        html += '<thead><tr><th class="excel-corner" contenteditable="false"></th>';
        for (let c = 0; c < maxCols; c++) {
          html += `<th class="excel-col-hdr" contenteditable="false">${getExcelColLetter(c)}</th>`;
        }
        html += '</tr></thead><tbody>';

        for (let r = 0; r < maxDisplayRows; r++) {
          const rowData = (data && data[r]) ? data[r] : [];
          html += `<tr><th class="excel-row-hdr" contenteditable="false">${r + 1}</th>`;
          for (let c = 0; c < maxCols; c++) {
            const val = (rowData[c] !== undefined && rowData[c] !== null) ? String(rowData[c]) : '';
            html += `<td contenteditable="true">${escHtml(val)}</td>`;
          }
          html += '</tr>';
        }

        if (data && data.length > 500) {
          html += `<tr><th class="excel-row-hdr" contenteditable="false">...</th><td colspan="${maxCols}" style="text-align:center;color:#888;font-style:italic;">... ${data.length - 500} more rows</td></tr>`;
        }
        html += '</tbody></table></div></div>';
      });

      return html;
    } catch (e) {
      return `<p>Error reading Excel file: ${escHtml(e.message)}</p>`;
    }
  }

  // Parse Excel Coordinate String (e.g. A1, Z50, XFD1048576) into { col, row, colLetter }
  function parseExcelCoord(coordStr) {
    if (!coordStr || typeof coordStr !== 'string') return null;
    const match = coordStr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const colLetters = match[1];
    const rowNum = parseInt(match[2], 10);
    if (isNaN(rowNum) || rowNum < 1 || rowNum > 1048576) return null;
    let colIdx = 0;
    for (let i = 0; i < colLetters.length; i++) {
      colIdx = colIdx * 26 + (colLetters.charCodeAt(i) - 64);
    }
    if (colIdx < 1 || colIdx > 16384) return null;
    return { col: colIdx - 1, row: rowNum, colLetter: colLetters };
  }

  // Create Authentic Excel Spreadsheet Grid with 50 Rows × 50 Columns default (Issue 5)
  function createBlankExcelGrid(cols = 50, rows = 50) {
    let html = `<div class="excel-spreadsheet-container" contenteditable="false" data-total-rows="1048576" data-total-cols="16384">`;
    html += `
      <div class="excel-formula-bar" contenteditable="false">
        <input type="text" class="excel-coord-box" value="A1" placeholder="Cell" title="Name Box — Type coordinate (e.g. A1, XFD1048576) and press Enter">
        <span class="excel-fx-badge" contenteditable="false">fx</span>
        <input type="text" class="excel-formula-input" placeholder="Select cell or enter formula / value">
        <button type="button" class="excel-jump-btn" data-jump="home" title="Jump to Home Cell A1" style="font-size:11px;padding:2px 8px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:4px;color:var(--text-secondary);cursor:pointer;">A1</button>
        <button type="button" class="excel-jump-btn" data-jump="end" title="Jump to End Cell XFD1048576" style="font-size:11px;padding:2px 8px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:4px;color:var(--text-secondary);cursor:pointer;">End</button>
      </div>
      <div class="excel-sheet-viewport">
        <table class="excel-grid-table">
    `;
    html += '<thead><tr><th class="excel-corner" contenteditable="false"></th>';
    for (let c = 0; c < cols; c++) {
      html += `<th class="excel-col-hdr" contenteditable="false">${getExcelColLetter(c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows; r++) {
      html += `<tr><th class="excel-row-hdr" contenteditable="false">${r + 1}</th>`;
      for (let c = 0; c < cols; c++) {
        const coord = `${getExcelColLetter(c)}${r + 1}`;
        html += `<td contenteditable="true" data-coord="${coord}"></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div></div>';
    return html;
  }

  // PowerPoint Presentation Viewer & Slide Card Extractor (Bug 12)
  async function pptxToHtml(arrayBuffer, filename) {
    if (typeof window.JSZip === 'undefined') {
      return `<p>JSZip decompression library not loaded. Please refresh the page.</p>`;
    }

    try {
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const slideFileNames = [];

      zip.forEach((relativePath) => {
        if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
          slideFileNames.push(relativePath);
        }
      });

      if (!slideFileNames.length) {
        return `
          <div class="pptx-container">
            <div class="pptx-slide-card">
              <div class="pptx-slide-header">
                <span class="pptx-slide-badge"><i class="fas fa-file-powerpoint"></i> Presentation</span>
              </div>
              <div class="pptx-slide-title" contenteditable="true">${escHtml(filename)}</div>
              <div class="pptx-slide-body" contenteditable="true">
                <p>Presentation document loaded.</p>
              </div>
            </div>
          </div>
        `;
      }

      // Sort slides numerically: slide1, slide2, slide3...
      slideFileNames.sort((a, b) => {
        const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
        const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
        return numA - numB;
      });

      const parser = new DOMParser();
      let html = `<div style="margin-bottom:14px;"><strong><i class="fas fa-file-powerpoint" style="color:#ea580c;"></i> ${escHtml(filename)}</strong> — ${slideFileNames.length} slide(s)</div>`;
      html += '<div class="pptx-container">';

      for (let i = 0; i < slideFileNames.length; i++) {
        const slidePath = slideFileNames[i];
        const slideXmlStr = await zip.file(slidePath).async('string');
        const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml');

        // Extract slide transitions (e.g. fade, push, wipe, split, zoom, fly-in, etc.)
        let slideTransition = 'none';
        const transitionNode = xmlDoc.querySelector('p\\:transition, transition');
        if (transitionNode && transitionNode.firstElementChild) {
          const tName = transitionNode.firstElementChild.localName || transitionNode.firstElementChild.tagName.replace(/.*:/, '');
          const knownTransitions = ['fade', 'slide', 'push', 'zoom', 'flip', 'slide-up', 'bounce', 'rotate', 'wipe', 'blur', 'cube', 'split', 'flash', 'shutter', 'door', 'fly-in', 'fall'];
          if (knownTransitions.includes(tName.toLowerCase())) {
            slideTransition = tName.toLowerCase();
          } else if (tName === 'wheel' || tName === 'circle') {
            slideTransition = 'rotate';
          } else if (tName === 'comb' || tName === 'blinds') {
            slideTransition = 'split';
          } else {
            slideTransition = 'fade';
          }
        }

        // Extract slide background color
        let slideBgColor = '';
        const bgNode = xmlDoc.querySelector('p\\:bg, bg, p\\:bgPr, bgPr');
        if (bgNode) {
          const srgbClr = bgNode.querySelector('a\\:srgbClr, srgbClr');
          if (srgbClr && srgbClr.getAttribute('val')) {
            slideBgColor = '#' + srgbClr.getAttribute('val');
          }
        }

        // Extract animation info
        let hasAnimation = false;
        const timingNode = xmlDoc.querySelector('p\\:timing, timing');
        if (timingNode) {
          hasAnimation = true;
        }

        // Extract shape text blocks with rich formatting preservation
        const shapes = xmlDoc.querySelectorAll('p\\:sp, sp');
        let slideTitle = '';
        const bodyBlocks = [];

        shapes.forEach(shape => {
          const ph = shape.querySelector('p\\:ph, ph');
          const isTitle = ph && (ph.getAttribute('type') === 'title' || ph.getAttribute('type') === 'ctrTitle');

          const paras = shape.querySelectorAll('a\\:p, p');
          const paraHtmls = [];

          paras.forEach(p => {
            const pPr = p.querySelector('a\\:pPr, pPr');
            const algn = pPr ? (pPr.getAttribute('algn') || 'l') : 'l';
            let textAlign = 'left';
            if (algn === 'ctr') textAlign = 'center';
            else if (algn === 'r') textAlign = 'right';
            else if (algn === 'just') textAlign = 'justify';

            const runs = p.querySelectorAll('a\\:r, r, a\\:fld, fld');
            let pContent = '';

            runs.forEach(r => {
              const textNode = r.querySelector('a\\:t, t');
              if (!textNode || !textNode.textContent) return;
              const text = textNode.textContent;
              const rPr = r.querySelector('a\\:rPr, rPr');

              const styles = [];
              if (rPr) {
                if (rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true') styles.push('font-weight:bold');
                if (rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true') styles.push('font-style:italic');
                if (rPr.getAttribute('u') === 'sng' || rPr.getAttribute('u') === '1') styles.push('text-decoration:underline');
                const sz = rPr.getAttribute('sz');
                if (sz) styles.push(`font-size:${Math.round(parseInt(sz, 10) / 100)}pt`);
                const srgb = rPr.querySelector('a\\:srgbClr, srgbClr');
                if (srgb && srgb.getAttribute('val')) styles.push(`color:#${srgb.getAttribute('val')}`);
                const latin = rPr.querySelector('a\\:latin, latin');
                if (latin && latin.getAttribute('typeface')) styles.push(`font-family:'${latin.getAttribute('typeface')}', sans-serif`);
              }

              if (styles.length) {
                pContent += `<span style="${styles.join(';')}">${escHtml(text)}</span>`;
              } else {
                pContent += escHtml(text);
              }
            });

            if (pContent.trim()) {
              paraHtmls.push(`<div style="text-align:${textAlign};margin:4px 0;">${pContent}</div>`);
            }
          });

          if (paraHtmls.length) {
            const plainText = paraHtmls.map(h => h.replace(/<[^>]+>/g, '').trim()).join(' ');
            if ((isTitle || !slideTitle) && plainText.length <= 120) {
              if (!slideTitle) {
                slideTitle = plainText;
              } else {
                bodyBlocks.push(...paraHtmls);
              }
            } else {
              bodyBlocks.push(...paraHtmls);
            }
          }
        });

        if (!slideTitle) {
          slideTitle = `Slide ${i + 1}`;
        }

        let bodyHtml = '';
        if (bodyBlocks.length) {
          bodyHtml = bodyBlocks.join('');
        } else {
          bodyHtml = '<p style="color:#94a3b8;font-style:italic;">Empty slide content</p>';
        }

        const bgStyle = slideBgColor ? `background:${slideBgColor};` : 'background:var(--bg-secondary);';
        const animAttr = hasAnimation ? ' data-animation="fade-in"' : '';

        html += `
          <div class="pptx-slide-wrapper" data-transition="${slideTransition}" style="position:relative;margin:28px auto;max-width:850px;">
            <div class="slide-quick-action-bar" contenteditable="false">
              <button class="slide-plus-action-btn" title="Add elements to slide (+)" aria-label="Add elements to slide">
                <i class="fas fa-plus"></i>
              </button>
              <div class="slide-plus-menu" role="menu">
                <div class="slide-plus-menu-title">Insert Into Slide</div>
                <button class="slide-plus-menu-item" data-action="rect"><i class="fas fa-vector-square" style="color:#0284c7;"></i> Rectangle Box</button>
                <button class="slide-plus-menu-item" data-action="nested-rect"><i class="fas fa-layer-group" style="color:#8b5cf6;"></i> Nested Card</button>
                <button class="slide-plus-menu-item" data-action="bullets"><i class="fas fa-list-ul" style="color:#10b981;"></i> Bullet Points</button>
                <div class="slide-plus-menu-sep"></div>
                <div class="slide-plus-menu-title">Shapes</div>
                <div class="slide-plus-shapes-grid">
                  <button class="slide-shape-quick-btn" data-shape="circle" title="Circle"><i class="fas fa-circle"></i></button>
                  <button class="slide-shape-quick-btn" data-shape="star" title="Star"><i class="fas fa-star"></i></button>
                  <button class="slide-shape-quick-btn" data-shape="arrow-right" title="Arrow"><i class="fas fa-arrow-right"></i></button>
                  <button class="slide-shape-quick-btn" data-shape="diamond" title="Diamond"><i class="fas fa-diamond"></i></button>
                </div>
                <div class="slide-plus-menu-sep"></div>
                <div class="slide-plus-menu-title">Slide Layout Formats</div>
                <button class="slide-plus-menu-item" data-action="layout-blank"><i class="fas fa-square" style="color:#94a3b8;"></i> Blank Canvas</button>
                <button class="slide-plus-menu-item" data-action="layout-split"><i class="fas fa-columns" style="color:#f59e0b;"></i> Split 2 Columns</button>
                <button class="slide-plus-menu-item" data-action="layout-cards"><i class="fas fa-table-cells-large" style="color:#06b6d4;"></i> 3 Card Blocks</button>
                <div class="slide-plus-menu-sep"></div>
                <button class="slide-plus-menu-item slide-plus-next-btn" data-action="add-next-slide"><i class="fas fa-circle-plus" style="color:#ea580c;"></i> Add Next Slide</button>
              </div>
            </div>
            <div class="pptx-slide-card"${animAttr} data-slide="${i + 1}" contenteditable="true" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;${bgStyle}border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);outline:none;position:relative;box-sizing:border-box;word-break:break-word;overflow-wrap:break-word;display:flex;flex-direction:column;">
              <div class="pptx-slide-header" contenteditable="false">
                <span class="pptx-slide-badge"><i class="fas fa-file-powerpoint"></i> Slide ${i + 1} of ${slideFileNames.length}</span>
              </div>
              <div class="pptx-slide-title" contenteditable="true">${escHtml(slideTitle)}</div>
              <div class="pptx-slide-body" contenteditable="true">
                ${bodyHtml}
              </div>
            </div>
          </div>
        `;
      }

      html += '</div><p><br></p>';
      return html;
    } catch (err) {
      console.error('PPTX parse error:', err);
      return `
        <div class="pptx-container">
          <div class="pptx-slide-card">
            <div class="pptx-slide-header">
              <span class="pptx-slide-badge"><i class="fas fa-file-powerpoint"></i> Presentation</span>
            </div>
            <div class="pptx-slide-title" contenteditable="true">${escHtml(filename)}</div>
            <div class="pptx-slide-body" contenteditable="true">
              <p>Presentation document loaded. ${(err && err.message) ? escHtml(err.message) : ''}</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  function createBlankPresentation() {
    function slideTpl(idx) {
      return `
        <div class="pptx-slide-wrapper" style="position:relative;margin:28px auto;max-width:850px;">
          <div class="slide-quick-action-bar" contenteditable="false">
            <button class="slide-plus-action-btn" title="Add elements to slide (+)" aria-label="Add elements to slide">
              <i class="fas fa-plus"></i>
            </button>
            <div class="slide-plus-menu" role="menu">
              <div class="slide-plus-menu-title">Insert Into Slide</div>
              <button class="slide-plus-menu-item" data-action="rect"><i class="fas fa-vector-square" style="color:#0284c7;"></i> Rectangle Box</button>
              <button class="slide-plus-menu-item" data-action="nested-rect"><i class="fas fa-layer-group" style="color:#8b5cf6;"></i> Nested Card</button>
              <button class="slide-plus-menu-item" data-action="bullets"><i class="fas fa-list-ul" style="color:#10b981;"></i> Bullet Points</button>
              <div class="slide-plus-menu-sep"></div>
              <div class="slide-plus-menu-title">Shapes</div>
              <div class="slide-plus-shapes-grid">
                <button class="slide-shape-quick-btn" data-shape="circle" title="Circle"><i class="fas fa-circle"></i></button>
                <button class="slide-shape-quick-btn" data-shape="star" title="Star"><i class="fas fa-star"></i></button>
                <button class="slide-shape-quick-btn" data-shape="arrow-right" title="Arrow"><i class="fas fa-arrow-right"></i></button>
                <button class="slide-shape-quick-btn" data-shape="diamond" title="Diamond"><i class="fas fa-diamond"></i></button>
              </div>
              <div class="slide-plus-menu-sep"></div>
              <div class="slide-plus-menu-title">Slide Layout Formats</div>
              <button class="slide-plus-menu-item" data-action="layout-blank"><i class="fas fa-square" style="color:#94a3b8;"></i> Blank Canvas</button>
              <button class="slide-plus-menu-item" data-action="layout-split"><i class="fas fa-columns" style="color:#f59e0b;"></i> Split 2 Columns</button>
              <button class="slide-plus-menu-item" data-action="layout-cards"><i class="fas fa-table-cells-large" style="color:#06b6d4;"></i> 3 Card Blocks</button>
              <div class="slide-plus-menu-sep"></div>
              <button class="slide-plus-menu-item slide-plus-next-btn" data-action="add-next-slide"><i class="fas fa-circle-plus" style="color:#ea580c;"></i> Add Next Slide</button>
            </div>
          </div>
          <div class="pptx-slide-card" contenteditable="true" data-slide="${idx}" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);outline:none;position:relative;box-sizing:border-box;">
            <p class="slide-placeholder-text" style="color:var(--text-muted);font-style:italic;margin:0;">Empty slide. Click here or use the "+" button at top-right to add rectangle, shapes, or bullet points...</p>
          </div>
        </div>`;
    }
    return slideTpl(1);
  }

  function basicMarkdownToHtml(md) {
    const codeBlocks = [];
    md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
      codeBlocks.push(code);
      return '\u0000CB' + (codeBlocks.length - 1) + '\u0000';
    });
    md = md.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    md = md.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    md = md.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    md = md.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    md = md.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    md = md.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:8px 0;">');
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    md = md.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');
    md = md.replace(/^---$/gm, '<hr>');
    md = md.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    const lines = md.split('\n');
    const out = [];
    let inList = false;

    lines.forEach(l => {
      const li = l.match(/^\s*(?:-|\d+\.)\s+(.+)$/);
      if (li) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + li[1] + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(l);
      }
    });
    if (inList) out.push('</ul>');

    md = out.join('\n');
    md = md.replace(/\n/g, '<br>');
    md = md.replace(/\u0000CB(\d+)\u0000/g, (m, i) => '<pre><code>' + escHtml(codeBlocks[+i]) + '</code></pre>');
    return md;
  }

  // ==========================================================================
  // Exporters: HTML, TXT, PDF, Markdown
  // ==========================================================================

  function saveAsHtml() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();
    let fullDoc = '';

    const codePre = editor.querySelector('pre.html-code-view');
    if (codePre) {
      fullDoc = codePre.textContent;
    } else {
      const cleanHtml = window.DocFlow.Find.getCleanHtml();
      fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(docTitle)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 816px; margin: 40px auto; padding: 0 24px; line-height: 1.75; color: #1a1a1a; font-size: 15px; }
    h1 { font-size: 28px; margin: 24px 0 12px; font-family: sans-serif; }
    h2 { font-size: 22px; margin: 20px 0 10px; font-family: sans-serif; }
    h3 { font-size: 18px; margin: 16px 0 8px; font-family: sans-serif; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td, th { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f5f5f5; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    blockquote { border-left: 4px solid #e85d04; padding: 8px 16px; color: #555; background: #fafafa; margin: 16px 0; }
    a { color: #e85d04; }
    pre { background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; padding: 16px; overflow-x: auto; }
    code { font-family: 'Courier New', monospace; font-size: 13px; }
  </style>
</head>
<body>
${cleanHtml}
</body>
</html>`;
    }

    downloadBlob(new Blob([fullDoc], { type: 'text/html;charset=utf-8' }), docTitle + '.html');
    window.DocFlow.setModified(false);
    window.DocFlow.UI.Tabs.save();
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.updateContent(docTitle + '.html', fullDoc, new Blob([fullDoc]).size);
    }
    showToast('Saved as HTML', 'success');
  }

  function saveAsTxt() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();
    const txtContent = editor.innerText || '';
    downloadBlob(new Blob([txtContent], { type: 'text/plain;charset=utf-8' }), docTitle + '.txt');
    window.DocFlow.setModified(false);
    window.DocFlow.UI.Tabs.save();
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.updateContent(docTitle + '.txt', txtContent, new Blob([txtContent]).size);
    }
    showToast('Saved as Plain Text', 'success');
  }

  function saveAsMarkdown() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();
    const mdPre = editor.querySelector('pre.md-code-view');
    if (mdPre) {
      md = mdPre.textContent;
    } else {
      // Structured HTML to Markdown conversion
      md = md
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n')
        .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<hr[^>]*>/gi, '\n---\n\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    }

    const mdTrimmed = md.trim();
    downloadBlob(new Blob([mdTrimmed], { type: 'text/markdown;charset=utf-8' }), docTitle + '.md');
    window.DocFlow.setModified(false);
    window.DocFlow.UI.Tabs.save();
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.updateContent(docTitle + '.md', mdTrimmed, new Blob([mdTrimmed]).size);
    }
    showToast('Exported as Markdown', 'success');
  }

  async function exportAsPdf() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();

    showToast('Preparing PDF export...', 'info');

    try {
      const cleanHtml = window.DocFlow.Find.getCleanHtml();

      const container = document.createElement('div');
      container.className = 'editor-page';
      container.style.cssText = 'width:816px;padding:72px;background:#ffffff;color:#1a1a1a;position:absolute;left:-9999px;top:0;min-height:auto;height:auto;box-shadow:none;';
      container.innerHTML = cleanHtml;
      document.body.appendChild(container);

      // Render with html2canvas
      const canvas = await window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      document.body.removeChild(container);

      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(docTitle + '.pdf');
      window.DocFlow.setModified(false);
      window.DocFlow.UI.Tabs.save();
      showToast('Exported document as PDF', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF export failed: ' + (err.message || 'Check for CORS-blocked external images'), 'error');
    }
  }

  // ==========================================================================
  // File IO Setup & Listeners
  // ==========================================================================

  function initFileIO() {
    const openBtn = $('#openBtn');
    const fileInput = $('#fileInput');
    const saveBtn = $('#saveBtn');
    const saveDropdown = $('#saveDropdown');

    if (openBtn && fileInput) {
      openBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => {
        if (e.target.files) {
          Array.from(e.target.files).forEach(handleFile);
          fileInput.value = '';
        }
      });
    }

    // Save Dropdown Toggle
    if (saveBtn && saveDropdown) {
      saveBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveDropdown.classList.toggle('show');
      });

      document.addEventListener('click', e => {
        if (!saveDropdown.contains(e.target) && e.target !== saveBtn && !saveBtn.contains(e.target)) {
          saveDropdown.classList.remove('show');
        }
      });

      $$('[data-save]').forEach(btn => {
        btn.addEventListener('click', () => {
          const saveType = btn.dataset.save;
          saveDropdown.classList.remove('show');

          if (saveType === 'merge') {
            window.DocFlow.PDF.openMergeModal();
            return;
          }

          if (window.DocFlow.currentMode !== 'edit') {
            showToast('Open a document in edit mode to save', 'warning');
            return;
          }

          if (saveType === 'html') saveAsHtml();
          else if (saveType === 'txt') saveAsTxt();
          else if (saveType === 'pdf') exportAsPdf();
          else if (saveType === 'md') saveAsMarkdown();
        });
      });
    }

    // Print button
    $('#printBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode === 'empty') {
        showToast('Open a document first to print', 'info');
        return;
      }
      window.print();
    });

    // Global Document Drag & Drop
    const dropZone = $('#dropZone');
    const emptyState = $('#emptyState');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
    }

    let globalDragCounter = 0;

    document.addEventListener('dragenter', e => {
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes('Files')) return;

      // In edit mode, allow image dropping directly without showing fullscreen dropzone
      if (window.DocFlow.currentMode === 'edit') return;

      globalDragCounter++;
      dropZone?.classList.add('dragover');
      if (emptyState && window.DocFlow.currentMode !== 'empty') {
        emptyState.classList.remove('hidden');
        emptyState.style.background = 'rgba(0,0,0,0.75)';
        emptyState.style.zIndex = '50';
      }
    });

    document.addEventListener('dragleave', e => {
      if (window.DocFlow.currentMode === 'edit') return;
      globalDragCounter--;
      if (globalDragCounter <= 0) {
        globalDragCounter = 0;
        dropZone?.classList.remove('dragover');
        if (emptyState && window.DocFlow.currentMode !== 'empty') {
          emptyState.classList.add('hidden');
          emptyState.style.background = '';
          emptyState.style.zIndex = '';
        }
      }
    });

    document.addEventListener('dragover', e => {
      e.preventDefault();
    });

    document.addEventListener('drop', e => {
      if (window.DocFlow.currentMode === 'edit') return;
      e.preventDefault();
      globalDragCounter = 0;
      dropZone?.classList.remove('dragover');

      if (emptyState && window.DocFlow.currentMode !== 'empty') {
        emptyState.classList.add('hidden');
        emptyState.style.background = '';
        emptyState.style.zIndex = '';
      }

      if (e.target.closest && e.target.closest('.modal-overlay')) return;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        const files = Array.from(e.dataTransfer.files);
        files.slice(0, 10).forEach(handleFile);
      }
    });
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.FileIO = {
    initFileIO,
    handleFile,
    saveAsHtml,
    saveAsTxt,
    saveAsMarkdown,
    exportAsPdf,
    excelToHtml,
    createBlankExcelGrid,
    parseExcelCoord,
    getExcelColLetter,
    docxToHtml,
    pptxToHtml,
    createBlankPresentation
  };

})(window);
