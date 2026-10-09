/**
 * DocFlow — PDF Viewer, Pagination, Text Extraction & Merge Tools
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  const PDF_BASE_SCALE = 1.2;
  let pdfDoc = null;
  let pdfCurrentPage = 1;
  let pdfTotalPages = 0;
  let pdfScale = PDF_BASE_SCALE;
  let pdfZoomPct = 100;
  let pdfRefW = 612;
  let pdfRefH = 792;
  let pdfObserver = null;
  let mergeFiles = [];

  const pdfPages = $('#pdfPages');
  const pdfWrap = $('#pdfWrap');
  const pdfPageInfo = $('#pdfPageInfo');
  const pdfZoomInfo = $('#pdfZoomInfo');

  // Initialize PDF.js worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Load PDF Tab
  async function loadPdfTab(tab) {
    if (!tab) return;
    window.DocFlow.updateTopbar(tab);
    window.DocFlow.switchMode('view');

    if (tab.pdfDoc) {
      pdfDoc = tab.pdfDoc;
      pdfTotalPages = pdfDoc.numPages;
      pdfCurrentPage = 1;
      pdfZoomPct = 100;
      pdfScale = PDF_BASE_SCALE;
      updatePdfControls();
      await buildPdfPlaceholders();
      return;
    }

    try {
      if (pdfPages) {
        pdfPages.innerHTML = '<div class="pdf-loading"><i class="fas fa-spinner"></i> Loading PDF document...</div>';
      }

      const doc = await pdfjsLib.getDocument({ data: tab.pdfData.slice(0) }).promise;
      tab.pdfDoc = doc;
      pdfDoc = doc;
      pdfTotalPages = doc.numPages;
      pdfCurrentPage = 1;
      pdfZoomPct = 100;
      pdfScale = PDF_BASE_SCALE;

      updatePdfControls();
      await buildPdfPlaceholders();

      if (!tab._greeted) {
        showToast(`Opened "${tab.name}" — ${pdfTotalPages} page${pdfTotalPages > 1 ? 's' : ''}`, 'success');
        tab._greeted = true;
      }
    } catch (err) {
      console.error('PDF load failed:', err);
      if (err && err.name === 'PasswordException') {
        showToast('This PDF is password-protected and cannot be opened', 'error');
      } else {
        showToast('Failed to load PDF: ' + ((err && err.message) || 'Unknown error'), 'error');
      }
      window.DocFlow.UI.Tabs.close(tab.id);
    }
  }

  // Build Dimensions & Placeholders for all pages
  async function buildPdfPlaceholders() {
    if (!pdfPages || !pdfDoc) return;
    pdfPages.innerHTML = '';
    pdfRefW = 612;
    pdfRefH = 792;

    try {
      const p1 = await pdfDoc.getPage(1);
      const vp = p1.getViewport({ scale: 1 });
      pdfRefW = vp.width;
      pdfRefH = vp.height;
    } catch (e) { }

    const cssW = Math.min(pdfRefW * pdfScale, window.innerWidth - 32);

    for (let i = 1; i <= pdfTotalPages; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'pdf-page-wrap';
      wrap.dataset.page = i;
      wrap.style.width = cssW + 'px';
      wrap.style.height = (pdfRefH * (cssW / (pdfRefW * pdfScale))) + 'px';
      wrap.innerHTML = `
        <div class="pdf-loading" style="padding:40px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
          <i class="fas fa-spinner"></i>
        </div>
        <span class="pdf-page-num">${i}</span>
      `;
      pdfPages.appendChild(wrap);
    }

    setupPdfObserver();
  }

  // IntersectionObserver for lazy loading pages
  function setupPdfObserver() {
    if (pdfObserver) pdfObserver.disconnect();
    if (!pdfPages || !pdfWrap) return;

    pdfObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.rendered) {
          renderPdfPage(+e.target.dataset.page, e.target);
        }
      });
    }, { root: pdfWrap, rootMargin: '450px' });

    pdfPages.querySelectorAll('.pdf-page-wrap').forEach(w => pdfObserver.observe(w));
  }

  // Render individual page canvas with Retina/HiDPI support
  async function renderPdfPage(num, container) {
    if (!pdfDoc) return;
    const scaleAtStart = pdfScale;

    try {
      const page = await pdfDoc.getPage(num);
      if (scaleAtStart !== pdfScale || !container.isConnected) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: pdfScale });
      const cssW = Math.min(vp.width, window.innerWidth - 32);
      const cssH = vp.height * (cssW / vp.width);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      container.style.width = cssW + 'px';
      container.style.height = cssH + 'px';
      container.innerHTML = '';
      container.appendChild(canvas);

      const pageNumBadge = document.createElement('span');
      pageNumBadge.className = 'pdf-page-num';
      pageNumBadge.textContent = num;
      container.appendChild(pageNumBadge);

      await page.render({
        canvasContext: ctx,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      }).promise;

      container.dataset.rendered = 'true';
    } catch (e) {
      if (container.isConnected) {
        container.innerHTML = `<div class="pdf-loading" style="color:var(--danger);">Failed to render page ${num}</div>`;
      }
    }
  }

  // Update PDF Controls Bar & Status Bar Page Counter
  function updatePdfControls() {
    if (pdfPageInfo) pdfPageInfo.textContent = `Page ${pdfCurrentPage} / ${pdfTotalPages}`;
    if (pdfZoomInfo) pdfZoomInfo.textContent = pdfZoomPct + '%';

    const prevBtn = $('#pdfPrev');
    const nextBtn = $('#pdfNext');
    if (prevBtn) prevBtn.disabled = pdfCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = pdfCurrentPage >= pdfTotalPages;

    const lineCountEl = $('#lineCount');
    if (lineCountEl && (window.DocFlow?.currentMode === 'view' || !window.DocFlow)) {
      lineCountEl.textContent = `Page ${pdfCurrentPage} of ${pdfTotalPages || 1}`;
    }
  }

  function rerenderPdf() {
    if (!pdfDoc || !pdfPages) return;
    const cssW = Math.min(pdfRefW * pdfScale, window.innerWidth - 32);

    pdfPages.querySelectorAll('.pdf-page-wrap').forEach(w => {
      delete w.dataset.rendered;
      w.style.width = cssW + 'px';
      w.style.height = (pdfRefH * (cssW / (pdfRefW * pdfScale))) + 'px';
      w.innerHTML = `
        <div class="pdf-loading" style="padding:40px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
          <i class="fas fa-spinner"></i>
        </div>
        <span class="pdf-page-num">${w.dataset.page}</span>
      `;
    });

    setupPdfObserver();
  }

  // Scroll to page with offset for the sticky header
  function scrollToPage(pageNum) {
    if (!pdfPages) return;
    const target = pdfPages.querySelector(`[data-page="${pageNum}"]`);
    if (target && pdfWrap) {
      const controlsH = $('#pdfControls')?.offsetHeight || 48;
      const targetTop = target.offsetTop - controlsH - 12;
      pdfWrap.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  }

  // Setup PDF Controls
  function setupPdfControls() {
    $('#pdfPrev')?.addEventListener('click', () => {
      if (pdfCurrentPage > 1) {
        pdfCurrentPage--;
        updatePdfControls();
        scrollToPage(pdfCurrentPage);
      }
    });

    $('#pdfNext')?.addEventListener('click', () => {
      if (pdfCurrentPage < pdfTotalPages) {
        pdfCurrentPage++;
        updatePdfControls();
        scrollToPage(pdfCurrentPage);
      }
    });

    $('#pdfZoomIn')?.addEventListener('click', () => {
      pdfZoomPct = Math.min(400, pdfZoomPct + 25);
      pdfScale = (PDF_BASE_SCALE * pdfZoomPct) / 100;
      updatePdfControls();
      rerenderPdf();
    });

    $('#pdfZoomOut')?.addEventListener('click', () => {
      pdfZoomPct = Math.max(40, pdfZoomPct - 25);
      pdfScale = (PDF_BASE_SCALE * pdfZoomPct) / 100;
      updatePdfControls();
      rerenderPdf();
    });

    // Tracking page while scrolling
    if (pdfWrap) {
      pdfWrap.addEventListener('scroll', () => {
        if (!pdfDoc || !pdfPages) return;
        const st = pdfWrap.scrollTop;
        const mid = st + (pdfWrap.clientHeight / 2);

        pdfPages.querySelectorAll('.pdf-page-wrap').forEach(w => {
          if (w.offsetTop <= mid && w.offsetTop + w.offsetHeight > mid) {
            const p = +w.dataset.page;
            if (p !== pdfCurrentPage) {
              pdfCurrentPage = p;
              updatePdfControls();
            }
          }
        });
      });
    }

    // Extract Text Button
    $('#pdfExtractBtn')?.addEventListener('click', extractTextFromPdf);
  }

  // Extract Text from PDF to Editable Document
  async function extractTextFromPdf() {
    if (!pdfDoc) return;
    showToast('Extracting text from all pages...', 'info');

    try {
      let extractedHtml = '';

      for (let i = 1; i <= pdfTotalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        if (textContent.items.length) {
          const lineMap = new Map();
          textContent.items.forEach(item => {
            if (!item.str) return;
            const y = Math.round(item.transform[5] / 3) * 3;
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y).push(item);
          });

          const ys = [...lineMap.keys()].sort((a, b) => b - a);
          ys.forEach(y => {
            const items = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
            let line = '';
            let lastRight = null;

            items.forEach(item => {
              const fs = Math.abs(item.transform[0]) || 10;
              if (lastRight !== null) {
                const gap = item.transform[4] - lastRight;
                if (gap > fs * 2.2) line += '   ';
                else if (gap > fs * 0.22) line += ' ';
              }
              line += item.str;
              lastRight = item.transform[4] + (item.width || 0);
            });

            extractedHtml += `<p>${escHtml(line)}</p>`;
          });
        }

        if (i < pdfTotalPages) {
          extractedHtml += '<hr><p><br></p>';
        }
      }

      if (!extractedHtml.replace(/<[^>]+>/g, '').trim()) {
        showToast('No extractable text found in this PDF (might be scanned images)', 'warning');
        return;
      }

      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const baseName = (activeTab ? activeTab.name : 'Document').replace(/\.pdf$/i, '');
      const tab = window.DocFlow.UI.Tabs.create(baseName + ' (extracted).html', extractedHtml, 'Extracted', 'edit');

      window.DocFlow.UI.Tabs.activateTab(tab);
      showToast('Extracted text into new editable document', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to extract text: ' + e.message, 'error');
    }
  }

  // ==========================================================================
  // Merge PDF Dialog & Operations
  // ==========================================================================
  function openMergeModal() {
    mergeFiles = [];
    renderMergeList();
    openModal('#pdfMergeModal');
  }

  function renderMergeList() {
    const list = $('#mergeFileList');
    if (!list) return;
    list.innerHTML = '';

    mergeFiles.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'merge-file-item';
      item.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        <span class="fname">${escHtml(file.name)}</span>
        <span class="fpages">${file.pages} pg</span>
        <button class="remove-merge" data-idx="${idx}" title="Remove file" aria-label="Remove ${escHtml(file.name)}">
          <i class="fas fa-xmark"></i>
        </button>
      `;

      item.querySelector('.remove-merge').addEventListener('click', () => {
        mergeFiles.splice(idx, 1);
        renderMergeList();
      });

      list.appendChild(item);
    });

    const mergeBtn = $('#mergeBtn');
    if (mergeBtn) mergeBtn.disabled = mergeFiles.length < 2;
  }

  async function addMergeFiles(files) {
    for (const f of Array.from(files)) {
      if (mergeFiles.length >= 10) {
        showToast('Maximum 10 PDFs can be merged at once', 'warning');
        break;
      }

      if (f.name.toLowerCase().endsWith('.pdf')) {
        try {
          const ab = await f.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
          mergeFiles.push({ name: f.name, data: ab, pages: doc.numPages });
        } catch (e) {
          showToast(`Cannot read "${f.name}": ${e.message}`, 'error');
        }
      } else {
        showToast(`"${f.name}" is not a PDF file`, 'error');
      }
    }
    renderMergeList();
  }

  function setupMergePdfModal() {
    const dropZone = $('#mergePdfDrop');
    const fileInput = $('#mergeFileInput');
    const mergeBtn = $('#mergeBtn');
    const clearBtn = $('#mergeClear');
    const cancelBtn = $('#mergeCancel');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = 'var(--accent)';
        dropZone.style.background = 'var(--accent-dim)';
      });

      dropZone.addEventListener('dragleave', e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
      });

      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
        if (e.dataTransfer && e.dataTransfer.files) {
          addMergeFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', e => {
        if (e.target.files) {
          addMergeFiles(e.target.files);
          fileInput.value = '';
        }
      });
    }

    clearBtn?.addEventListener('click', () => {
      mergeFiles = [];
      renderMergeList();
    });

    cancelBtn?.addEventListener('click', () => {
      closeModal('#pdfMergeModal');
      mergeFiles = [];
    });

    if (mergeBtn) {
      mergeBtn.addEventListener('click', async () => {
        if (mergeFiles.length < 2) return;
        mergeBtn.disabled = true;
        mergeBtn.textContent = 'Merging...';

        try {
          if (typeof PDFLib === 'undefined') {
            showToast('PDF merge engine not available. Please refresh.', 'error');
            mergeBtn.textContent = 'Merge PDFs';
            mergeBtn.disabled = false;
            return;
          }

          const mergedDoc = await PDFLib.PDFDocument.create();
          let totalPages = 0;

          for (const item of mergeFiles) {
            try {
              const src = await PDFLib.PDFDocument.load(item.data);
              const copiedPages = await mergedDoc.copyPages(src, src.getPageIndices());
              copiedPages.forEach(p => mergedDoc.addPage(p));
              totalPages += src.getPageCount();
            } catch (err) {
              showToast(`Error merging "${item.name}": ${err.message}`, 'error');
            }
          }

          const mergedBytes = await mergedDoc.save();
          const blob = new Blob([mergedBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'merged_document.pdf';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);

          showToast(`Successfully merged ${mergeFiles.length} PDFs (${totalPages} pages)`, 'success');
          closeModal('#pdfMergeModal');
          mergeFiles = [];
        } catch (e) {
          console.error(e);
          showToast('Failed to merge PDFs: ' + e.message, 'error');
        } finally {
          mergeBtn.textContent = 'Merge PDFs';
          mergeBtn.disabled = false;
          renderMergeList();
        }
      });
    }
  }

  function initPdfViewer() {
    setupPdfControls();
    setupMergePdfModal();
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.PDF = {
    initPdfViewer,
    loadPdfTab,
    openMergeModal
  };

})(window);
