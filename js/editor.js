/**
 * DocFlow — Rich Text Editor & Document Formatting
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  let savedSelection = null;
  let autosaveTimer = null;
  let selChangeTimer = null;

  const editor = $('#editor');
  const editorWrap = $('#editorWrap');

  // URL Safety validator
  function isUrlSafe(url) {
    return !/^\s*(javascript|vbscript|data)\s*:/i.test(url);
  }

  // Selection Save & Restore
  function saveSelection() {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editor && (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer)) {
          savedSelection = range.cloneRange();
          return savedSelection;
        }
      }
    } catch (e) { }
    return null;
  }

  function restoreSelection() {
    if (!editor) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    if (savedSelection) {
      try {
        if (editor.contains(savedSelection.commonAncestorContainer) || editor === savedSelection.commonAncestorContainer) {
          sel.removeAllRanges();
          sel.addRange(savedSelection);
          return true;
        }
      } catch (e) { }
    }

    // Fallback: place caret at the end of editor
    try {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedSelection = range.cloneRange();
      return true;
    } catch (e) {
      return false;
    }
  }

  function focusEditor() {
    if (editor) {
      editor.focus();
      restoreSelection();
    }
  }

  // Safe Insertion at Caret Position (Guaranteed safe execution across browsers)
  function insertNodeAtCursor(node) {
    if (!editor) return;
    editor.focus();
    restoreSelection();

    const sel = window.getSelection();
    let range;

    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) && editor !== range.commonAncestorContainer) {
        range = null;
      }
    }

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    range.deleteContents();
    range.insertNode(node);

    // Position cursor immediately after inserted element
    try {
      range = document.createRange();
      range.setStartAfter(node);
      range.setEndAfter(node);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      savedSelection = range.cloneRange();
    } catch (e) { }

    notifyChange();
  }

  function insertHtmlAtCursor(html) {
    if (!editor) return;
    const activeCell = (window._activeExcelCell && document.body.contains(window._activeExcelCell))
      ? window._activeExcelCell
      : null;
    if (activeCell) {
      saveSnapshot();
      activeCell.focus();
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const textToInsert = (temp.textContent || temp.innerText || html).trim();
      const sel = window.getSelection();
      if (sel && sel.rangeCount && activeCell.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        try {
          document.execCommand('insertText', false, textToInsert);
        } catch (_) {
          activeCell.textContent = (activeCell.textContent ? activeCell.textContent + ' ' : '') + textToInsert;
        }
      } else {
        activeCell.textContent = textToInsert;
      }
      const formulaInput = document.getElementById('excelFormulaInput');
      if (formulaInput) formulaInput.value = activeCell.textContent;
      notifyChange();
      return activeCell;
    }

    saveSnapshot();
    focusEditor();
    let inserted = false;
    try {
      inserted = document.execCommand('insertHTML', false, html);
    } catch (e) {
      inserted = false;
    }
    if (!inserted) {
      const fragment = document.createRange().createContextualFragment(html);
      const lastNode = fragment.lastChild;
      insertNodeAtCursor(fragment);
      notifyChange();
      return lastNode;
    }
    notifyChange();
    return null;
  }

  // Clear All Formatting (Bug 7)
  function clearFormatting() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    focusEditor();

    try {
      document.execCommand('removeFormat', false, null);
    } catch (e) { }
    try {
      document.execCommand('unlink', false, null);
    } catch (e) { }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;

      if (!range.collapsed && container) {
        const elements = container.querySelectorAll('*');
        elements.forEach(el => {
          if (sel.containsNode(el, true)) {
            el.removeAttribute('style');
            el.removeAttribute('class');
            el.removeAttribute('face');
            el.removeAttribute('size');
            el.removeAttribute('color');
          }
        });
      }
      if (container && container !== editor) {
        container.removeAttribute('style');
        container.removeAttribute('class');
        container.removeAttribute('face');
        container.removeAttribute('size');
        container.removeAttribute('color');
      }

      try {
        document.execCommand('formatBlock', false, '<p>');
      } catch (e) { }
    }

    notifyChange();
    updateToolbarState();
    showToast('Formatting cleared', 'info');
  }

  // Undo / Redo History Stack (Issue 5: Supports macro operations like slide deletion)
  const undoStack = [];
  const redoStack = [];

  function saveSnapshot() {
    if (!editor) return;
    undoStack.push({
      html: editor.innerHTML,
      slideIdx: window.DocFlow?.getCurrentActiveSlideIndex ? window.DocFlow.getCurrentActiveSlideIndex() : 0
    });
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }

  function undo() {
    if (undoStack.length > 0) {
      redoStack.push({
        html: editor.innerHTML,
        slideIdx: window.DocFlow?.getCurrentActiveSlideIndex ? window.DocFlow.getCurrentActiveSlideIndex() : 0
      });
      const state = undoStack.pop();
      editor.innerHTML = state.html;
      notifyChange();
      if (window.DocFlow?.selectPptSlide) {
        window.DocFlow.selectPptSlide(state.slideIdx);
      } else if (window.DocFlow?.updatePptSidebar) {
        window.DocFlow.updatePptSidebar();
      }
      return true;
    }
    try {
      return document.execCommand('undo');
    } catch (e) {
      return false;
    }
  }

  function redo() {
    if (redoStack.length > 0) {
      undoStack.push({
        html: editor.innerHTML,
        slideIdx: window.DocFlow?.getCurrentActiveSlideIndex ? window.DocFlow.getCurrentActiveSlideIndex() : 0
      });
      const state = redoStack.pop();
      editor.innerHTML = state.html;
      notifyChange();
      if (window.DocFlow?.selectPptSlide) {
        window.DocFlow.selectPptSlide(state.slideIdx);
      } else if (window.DocFlow?.updatePptSidebar) {
        window.DocFlow.updatePptSidebar();
      }
      return true;
    }
    try {
      return document.execCommand('redo');
    } catch (e) {
      return false;
    }
  }

  // Command Execution
  function execCmd(cmd, value = null) {
    if (window.DocFlow.currentMode !== 'edit') return false;
    focusEditor();
    if (cmd === 'undo') {
      if (undoStack.length > 0) {
        undo();
        updateToolbarState();
        return true;
      }
    } else if (cmd === 'redo') {
      if (redoStack.length > 0) {
        redo();
        updateToolbarState();
        return true;
      }
    }
    try {
      document.execCommand(cmd, false, value);
    } catch (e) {
      console.warn('execCommand failed for ' + cmd, e);
    }
    updateToolbarState();
    notifyChange();
    return true;
  }

  // Notify document change (dirty flag & autosave)
  function notifyChange() {
    if (window.DocFlow) {
      window.DocFlow.setModified(true);
      if (typeof window.DocFlow.triggerAutoSaveTimer === 'function') {
        window.DocFlow.triggerAutoSaveTimer();
      }
    }
    updateCounts();
    updateCursorPos();
    if (window.DocFlow.Find) {
      window.DocFlow.Find.scheduleOutlineUpdate();
    }
  }

  function scheduleAutosave() {
    if (window.DocFlow && typeof window.DocFlow.triggerAutoSaveTimer === 'function') {
      window.DocFlow.triggerAutoSaveTimer();
    }
  }

  // Toolbar Button Active States
  function updateToolbarState() {
    const commands = [
      'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'insertUnorderedList', 'insertOrderedList'
    ];

    commands.forEach(cmd => {
      const btn = $(`.fmt-btn[data-cmd="${cmd}"]`);
      if (btn) {
        try {
          btn.classList.toggle('active', document.queryCommandState(cmd));
        } catch (e) { }
      }
    });

    // Heading select sync
    try {
      const block = (document.queryCommandValue('formatBlock') || '').toString().replace(/[<>]/g, '').toLowerCase();
      const headingSelect = $('#headingSelect');
      if (headingSelect) {
        headingSelect.value = ['h1', 'h2', 'h3', 'h4'].includes(block) ? block.toUpperCase() : 'p';
      }
    } catch (e) { }

    // Font Family sync
    try {
      const fontName = (document.queryCommandValue('fontName') || '').replace(/['"]/g, '');
      const fontFamily = $('#fontFamily');
      if (fontFamily && fontName) {
        for (let opt of fontFamily.options) {
          if (opt.value.toLowerCase().includes(fontName.toLowerCase())) {
            fontFamily.value = opt.value;
            break;
          }
        }
      }
    } catch (e) { }

    // Font Size Number Input sync with computed style at cursor
    try {
      const fontSizeInput = $('#fontSizeInput');
      const sel = window.getSelection();
      if (fontSizeInput && sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        if (document.activeElement !== fontSizeInput) {
          let node = sel.getRangeAt(0).startContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          if (node) {
            const compSize = window.getComputedStyle(node).fontSize;
            const pxVal = parseInt(compSize, 10);
            if (pxVal && !isNaN(pxVal)) {
              fontSizeInput.value = pxVal;
            }
          }
        }
      }
    } catch (e) { }
  }

  // Word and Character Counts (Accurate 0 chars when blank, strip phantom trailing newlines)
  function updateCounts() {
    if (!editor) return;
    let rawText = editor.innerText || '';
    rawText = rawText.replace(/\r/g, '');
    if (rawText.endsWith('\n')) {
      rawText = rawText.slice(0, -1);
    }
    const cleanText = rawText.trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const chars = cleanText.length === 0 ? 0 : rawText.length;

    const wordCountEl = $('#wordCount');
    const charCountEl = $('#charCount');

    if (wordCountEl) wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    if (charCountEl) charCountEl.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
  }

  // Accurate Line and Column Tracker across all document formats & tags
  function updateCursorPos() {
    const lineCountEl = $('#lineCount');
    if (!lineCountEl) return;

    if (window.DocFlow.currentMode === 'view') {
      // In PDF viewer mode, show page indicator in status bar
      const pInfo = $('#pdfPageInfo')?.textContent || 'Page 1';
      lineCountEl.textContent = pInfo;
      return;
    }

    if (window.DocFlow.currentMode !== 'edit' || !editor) {
      lineCountEl.textContent = 'Ln 1, Col 1';
      return;
    }

    try {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        lineCountEl.textContent = 'Ln 1, Col 1';
        return;
      }
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) && editor !== range.commonAncestorContainer) {
        lineCountEl.textContent = 'Ln 1, Col 1';
        return;
      }

      // Clone range up to cursor position
      const pre = range.cloneRange();
      pre.selectNodeContents(editor);
      pre.setEnd(range.startContainer, range.startOffset);

      // Clone contents into a temporary fragment to parse block boundaries
      const fragment = pre.cloneContents();
      const div = document.createElement('div');
      div.appendChild(fragment);

      // Convert <br> to newline
      div.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });

      // Insert linebreaks before block elements that start a new line
      const blockSelectors = 'p, div, h1, h2, h3, h4, h5, h6, li, tr, blockquote, pre, section, article';
      const blocks = div.querySelectorAll(blockSelectors);
      blocks.forEach(el => {
        if (el.previousElementSibling) {
          el.insertAdjacentText('beforebegin', '\n');
        } else if (el.previousSibling && el.previousSibling.textContent && el.previousSibling.textContent.trim()) {
          el.insertAdjacentText('beforebegin', '\n');
        }
      });

      const text = div.textContent || '';
      const lines = text.split('\n');
      const ln = Math.max(1, lines.length);
      const lastLine = lines[lines.length - 1];
      const col = Math.max(1, (lastLine ? lastLine.length : 0) + 1);

      lineCountEl.textContent = `Ln ${ln}, Col ${col}`;
    } catch (e) {
      lineCountEl.textContent = 'Ln 1, Col 1';
    }
  }

  // Color Pickers Wiring
  function setupColorPickers() {
    const textBtn = $('#textColorBtn');
    const textInput = $('#textColorInput');
    const textBar = $('#textColorBar');

    const bgBtn = $('#bgColorBtn');
    const bgInput = $('#bgColorInput');
    const bgBar = $('#bgColorBar');

    if (textBtn && textInput) {
      textBtn.addEventListener('click', () => {
        saveSelection();
        if (typeof textInput.showPicker === 'function') {
          textInput.showPicker();
        } else {
          textInput.click();
        }
      });

      textInput.addEventListener('input', function () {
        if (textBar) textBar.style.background = this.value;
      });

      textInput.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') return;
        restoreSelection();
        document.execCommand('foreColor', false, this.value);
        notifyChange();
        updateToolbarState();
      });
    }

    const defaultColorBtn = $('#defaultColorBtn');
    if (defaultColorBtn) {
      defaultColorBtn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') return;
        focusEditor();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);

        if (range.collapsed) {
          // Caret is collapsed: user wants subsequent typing in default color without highlighter
          const span = document.createElement('span');
          span.style.color = 'inherit';
          span.style.backgroundColor = 'transparent';
          span.innerHTML = '&#8203;';
          insertNodeAtCursor(span);

          const newRange = document.createRange();
          newRange.setStart(span.firstChild, 1);
          newRange.setEnd(span.firstChild, 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedSelection = newRange.cloneRange();
          showToast('Typing in default text color (no highlight)', 'info');
        } else {
          // Selection exists: reset text color and highlight for selection
          try {
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, 'inherit');
            document.execCommand('hiliteColor', false, 'transparent');
          } catch (e) { }
          notifyChange();
          showToast('Reset to default text color on selection', 'info');
        }
        updateToolbarState();
      });
    }
  }

  // Insert Table
  function setupTableInsert() {
    const btn = $('#insertTableBtn') || $('#ribbonInsertTableBtn');
    const insertBtn = $('#tableInsert');

    if (btn) {
      btn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        saveSelection();
        $('#tableRows').value = '3';
        $('#tableCols').value = '3';
        openModal('#tableModal');
      });
    }

    if (insertBtn) {
      insertBtn.addEventListener('click', () => {
        const rows = Math.min(25, Math.max(1, parseInt($('#tableRows').value) || 3));
        const cols = Math.min(12, Math.max(1, parseInt($('#tableCols').value) || 3));
        closeModal('#tableModal');

        let tableHtml = '<table><thead><tr>';
        for (let c = 1; c <= cols; c++) {
          tableHtml += '<th style="min-width:60px;height:28px;"><br></th>';
        }
        tableHtml += '</tr></thead><tbody>';
        for (let r = 1; r < rows; r++) {
          tableHtml += '<tr>';
          for (let c = 1; c <= cols; c++) {
            tableHtml += '<td><br></td>';
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p><br></p>';

        insertHtmlAtCursor(tableHtml);
        showToast(`Inserted ${rows}×${cols} empty table`, 'success');
      });
    }
  }

  // Insert Link
  function setupLinkInsert() {
    const btn = $('#insertLinkBtn') || $('#ribbonInsertLinkBtn');
    const insertBtn = $('#linkInsert');
    const linkUrlInput = $('#linkUrl');
    const linkTextInput = $('#linkText');

    if (btn) {
      btn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        saveSelection();
        const sel = window.getSelection();
        linkTextInput.value = sel ? sel.toString() : '';
        linkUrlInput.value = '';
        openModal('#linkModal');
      });
    }

    if (insertBtn) {
      insertBtn.addEventListener('click', () => {
        let url = linkUrlInput.value.trim();
        const text = linkTextInput.value.trim() || url;
        if (!url) {
          showToast('Please enter a URL', 'warning');
          return;
        }
        if (!isUrlSafe(url)) {
          showToast('This URL scheme is not allowed', 'error');
          return;
        }
        if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
          url = 'https://' + url;
        }

        closeModal('#linkModal');
        const linkHtml = `<a href="${escHtml(url)}" target="_blank" rel="noopener">${escHtml(text)}</a>`;
        insertHtmlAtCursor(linkHtml);
        showToast('Link inserted', 'success');
      });

      linkUrlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          insertBtn.click();
        }
      });
    }
  }

  // Insert Horizontal Rule with Full Customization (Issue 4) & Blockquote
  function setupHrAndQuote() {
    ($('#insertHrBtn') || $('#ribbonInsertHrBtn'))?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      openLineModal();
    });

    // Line Modal Controls
    $('#lineWidthSelect')?.addEventListener('change', updateLinePreview);
    $('#lineHeightSelect')?.addEventListener('change', updateLinePreview);
    $('#lineStyleSelect')?.addEventListener('change', updateLinePreview);
    $('#lineAlignSelect')?.addEventListener('change', updateLinePreview);
    $('#lineColorInput')?.addEventListener('input', updateLinePreview);

    $('#lineCancelBtn')?.addEventListener('click', () => {
      window.DocFlow.UI?.closeModal('#lineModal');
    });

    $('#lineInsertBtn')?.addEventListener('click', () => {
      insertCustomLine();
    });

    ($('#insertBlockquoteBtn') || $('#ribbonInsertQuoteBtn'))?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      saveSelection();
      const sel = window.getSelection();
      const quoteText = sel && sel.toString().trim() ? sel.toString() : 'Quote text here...';
      insertHtmlAtCursor(`<blockquote>${escHtml(quoteText)}</blockquote><p><br></p>`);
      showToast('Blockquote inserted', 'info');
    });
  }

  function openLineModal() {
    window.DocFlow.UI?.openModal('#lineModal');
    updateLinePreview();
  }

  function updateLinePreview() {
    const width = $('#lineWidthSelect')?.value || '100%';
    const height = $('#lineHeightSelect')?.value || '2px';
    const style = $('#lineStyleSelect')?.value || 'solid';
    const align = $('#lineAlignSelect')?.value || 'center';
    const color = $('#lineColorInput')?.value || '#e2e8f0';

    const hexLabel = $('#lineColorHex');
    if (hexLabel) hexLabel.textContent = color;

    const preview = $('#linePreviewBox');
    if (preview) {
      preview.style.width = width;
      preview.style.height = height;
      preview.style.border = 'none';
      preview.style.borderTop = `${height} ${style} ${color}`;
      preview.style.margin = align === 'left' ? '0 auto 0 0' : (align === 'right' ? '0 0 0 auto' : '0 auto');
      preview.style.backgroundColor = style === 'solid' ? color : 'transparent';
    }
  }

  function insertCustomLine() {
    const width = $('#lineWidthSelect')?.value || '100%';
    const height = $('#lineHeightSelect')?.value || '2px';
    const style = $('#lineStyleSelect')?.value || 'solid';
    const align = $('#lineAlignSelect')?.value || 'center';
    const color = $('#lineColorInput')?.value || '#e2e8f0';

    const marginStyle = align === 'left' ? 'margin: 18px auto 18px 0;' : (align === 'right' ? 'margin: 18px 0 18px auto;' : 'margin: 18px auto;');
    const hrHtml = `<hr class="doc-custom-line" style="width:${width};height:${height};border:none;border-top:${height} ${style} ${color};background-color:${style === 'solid' ? color : 'transparent'};${marginStyle}"><p><br></p>`;

    insertHtmlAtCursor(hrHtml);
    window.DocFlow.UI?.closeModal('#lineModal');
    notifyChange();
    showToast('Customized line inserted', 'success');
  }

  // Set Font Size (Arbitrary number in points/px with no limit)
  function setFontSize(val) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const size = Math.max(1, parseInt(val, 10) || 15);
    focusEditor();

    const fontSizeInput = $('#fontSizeInput');
    if (fontSizeInput) fontSizeInput.value = size;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      // Caret is collapsed: insert a styled span containing zero-width space
      // so typing continues seamlessly at the chosen font size
      const span = document.createElement('span');
      span.style.fontSize = size + 'px';
      span.innerHTML = '&#8203;';
      insertNodeAtCursor(span);

      const newRange = document.createRange();
      newRange.setStart(span.firstChild, 1);
      newRange.setEnd(span.firstChild, 1);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelection = newRange.cloneRange();
      return;
    }

    // Text is selected:
    // Execute fontSize command then replace resultant font/span elements with custom size
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch (e) { }

    try {
      document.execCommand('fontSize', false, '7');
    } catch (e) { }

    // Locate all newly created font/span elements with size 7 / xxx-large
    const fontNodes = editor.querySelectorAll('font[size="7"], [style*="-webkit-xxx-large"], [style*="xxx-large"]');
    fontNodes.forEach(node => {
      node.removeAttribute('size');
      node.style.fontSize = size + 'px';
    });

    notifyChange();
    updateToolbarState();
  }

  // Bullet and Numbering List Style Applicator
  function applyListStyle(type) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    focusEditor();

    const isOrdered = ['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'].includes(type);
    const cmd = isOrdered ? 'insertOrderedList' : 'insertUnorderedList';

    // Check if current selection is already in a matching list
    const sel = window.getSelection();
    let currentList = null;
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      currentList = node.closest(isOrdered ? 'ol' : 'ul');
    }

    if (!currentList) {
      document.execCommand(cmd, false, null);
      const selAfter = window.getSelection();
      if (selAfter && selAfter.rangeCount) {
        let n = selAfter.getRangeAt(0).commonAncestorContainer;
        if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
        currentList = n.closest(isOrdered ? 'ol' : 'ul');
      }
    }

    if (currentList) {
      currentList.classList.remove('list-circle', 'list-square', 'list-disc', 'list-arrow', 'list-check',
        'list-diamond', 'list-star', 'list-dash',
        'list-lower-alpha', 'list-upper-alpha', 'list-lower-roman', 'list-upper-roman', 'list-decimal');

      currentList.classList.add('list-' + type);
      currentList.setAttribute('data-list', type);

      if (type === 'arrow') {
        currentList.style.listStyleType = "'➔ '";
      } else if (type === 'check') {
        currentList.style.listStyleType = "'✓ '";
      } else if (type === 'diamond') {
        currentList.style.listStyleType = "'◆ '";
      } else if (type === 'star') {
        currentList.style.listStyleType = "'★ '";
      } else if (type === 'dash') {
        currentList.style.listStyleType = "'– '";
      } else {
        currentList.style.listStyleType = type;
      }

      if (isOrdered) {
        const typeAttr = type === 'decimal' ? '1'
          : type === 'lower-alpha' ? 'a'
          : type === 'upper-alpha' ? 'A'
          : type === 'lower-roman' ? 'i'
          : 'I';
        currentList.setAttribute('type', typeAttr);
      }
    }

    notifyChange();
    updateToolbarState();
  }

  // Line Spacing Applicator
  function applyLineSpacing(spacing) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    focusEditor();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    const block = node.closest('p, div, h1, h2, h3, h4, li, blockquote') || editor;
    if (block) {
      block.style.lineHeight = spacing;
      notifyChange();
    }
  }

  // Clear All Formatting with Warning Container (Bug 3)
  function clearFormatting() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    saveSelection();
    openModal('#clearFormatModal');
  }

  function executeClearFormatting() {
    closeModal('#clearFormatModal');
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed || !sel.toString().trim()) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    try {
      document.execCommand('removeFormat', false, null);
      document.execCommand('unlink', false, null);
    } catch (e) { }

    if (sel && sel.rangeCount > 0) {
      const parent = sel.getRangeAt(0).commonAncestorContainer;
      const container = parent.nodeType === 1 ? parent : parent.parentElement;
      if (container) {
        const styled = container.querySelectorAll('span, font, b, i, u, s, strong, em');
        styled.forEach(el => {
          el.removeAttribute('style');
          el.removeAttribute('face');
          el.removeAttribute('size');
          el.removeAttribute('color');
        });
      }
    }

    const fontSizeInput = $('#fontSizeInput');
    if (fontSizeInput) fontSizeInput.value = '15';
    const fontFamily = $('#fontFamily');
    if (fontFamily) fontFamily.value = "Georgia, serif";

    notifyChange();
    updateToolbarState();
    showToast('All formatting cleared successfully', 'success');
  }

  // Change Case (Sentence, lower, UPPER, Title)
  function changeTextCase(mode) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    restoreSelection();
    let sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
      showToast('Select text first to change case', 'info');
      return;
    }

    const text = sel.toString();
    if (!text || !text.trim()) {
      showToast('Select text first to change case', 'info');
      return;
    }

    let transformed = text;
    if (mode === 'upper') {
      transformed = text.toUpperCase();
    } else if (mode === 'lower') {
      transformed = text.toLowerCase();
    } else if (mode === 'title') {
      transformed = text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
    } else if (mode === 'sentence') {
      transformed = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    }

    insertHtmlAtCursor(escHtml(transformed).replace(/\n/g, '<br>'));
    notifyChange();
    $('#casePopover')?.classList.remove('show');
    showToast(`Converted to ${mode} case`, 'info');
  }

  // Format Painter (Copy and paste styles, applicable to selections and new text, double-click resets to default)
  let copiedFormatStyle = null;
  let isFormatPainterActive = false;

  function toggleFormatPainter() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const sel = window.getSelection();
    let el = null;
    if (sel && sel.rangeCount > 0) {
      const node = sel.anchorNode;
      el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    }
    if (!el || el === editor) {
      el = editor.querySelector('p, h1, h2, h3, span, strong, em') || editor;
    }

    const comp = window.getComputedStyle(el);
    copiedFormatStyle = {
      fontFamily: comp.fontFamily,
      fontSize: comp.fontSize,
      fontWeight: comp.fontWeight,
      fontStyle: comp.fontStyle,
      color: comp.color,
      backgroundColor: comp.backgroundColor,
      textDecoration: comp.textDecoration
    };

    isFormatPainterActive = true;
    const painterBtn = $('#formatPainterBtn');
    painterBtn?.classList.add('active');
    editor.style.cursor = 'copy';
    document.body.style.cursor = 'copy';
    showToast('Format copied! Highlight text or click cursor to type with copied format (double-click painter to reset)', 'info');
  }

  function resetFormatPainter() {
    copiedFormatStyle = null;
    isFormatPainterActive = false;
    const painterBtn = $('#formatPainterBtn');
    painterBtn?.classList.remove('active');
    if (editor) editor.style.cursor = '';
    document.body.style.cursor = '';
    showToast('Format painter reset to normal/default', 'info');
  }

  function applyFormatPainterToSelection() {
    if (!isFormatPainterActive || !copiedFormatStyle || !editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    if (!sel.isCollapsed) {
      // Highlighted selection: Apply formatting to selected text
      const span = document.createElement('span');
      span.style.fontFamily = copiedFormatStyle.fontFamily;
      span.style.fontSize = copiedFormatStyle.fontSize;
      span.style.fontWeight = copiedFormatStyle.fontWeight;
      span.style.fontStyle = copiedFormatStyle.fontStyle;
      span.style.color = copiedFormatStyle.color;
      if (copiedFormatStyle.backgroundColor && copiedFormatStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        span.style.backgroundColor = copiedFormatStyle.backgroundColor;
      }
      span.style.textDecoration = copiedFormatStyle.textDecoration;

      const range = sel.getRangeAt(0);
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      notifyChange();
      showToast('Formatting applied to selection', 'success');
    } else {
      // Collapsed cursor: Apply formatting for next typing
      const span = document.createElement('span');
      span.style.fontFamily = copiedFormatStyle.fontFamily;
      span.style.fontSize = copiedFormatStyle.fontSize;
      span.style.fontWeight = copiedFormatStyle.fontWeight;
      span.style.fontStyle = copiedFormatStyle.fontStyle;
      span.style.color = copiedFormatStyle.color;
      if (copiedFormatStyle.backgroundColor && copiedFormatStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        span.style.backgroundColor = copiedFormatStyle.backgroundColor;
      }
      span.style.textDecoration = copiedFormatStyle.textDecoration;
      span.innerHTML = '&#8203;'; // Zero-width space

      const range = sel.getRangeAt(0);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.setStart(span.firstChild, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      notifyChange();
      showToast('Format ready for next typing', 'info');
    }
  }

  // Sort Selected Lines or Table Rows Alphabetically (Issue 4: Ascending or Descending)
  function sortSelectedTextOrTable(direction = 'asc') {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const isDesc = direction === 'desc';
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    const table = node ? node.closest('table') : null;

    if (table) {
      // Sort table rows (skip header row if present)
      const tbody = table.querySelector('tbody') || table;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length <= 1) {
        showToast('Table needs 2 or more rows to sort', 'info');
        return;
      }
      // Determine which column index cursor is in
      const cell = node.closest('td, th');
      const colIndex = cell ? cell.cellIndex : 0;

      // Filter out header row if in the same table element
      const headerRow = rows[0].querySelector('th') ? rows[0] : null;
      const dataRows = headerRow ? rows.slice(1) : rows;

      dataRows.sort((a, b) => {
        const textA = (a.cells[colIndex]?.textContent || '').trim().toLowerCase();
        const textB = (b.cells[colIndex]?.textContent || '').trim().toLowerCase();
        return isDesc
          ? textB.localeCompare(textA, undefined, { numeric: true })
          : textA.localeCompare(textB, undefined, { numeric: true });
      });

      dataRows.forEach(r => tbody.appendChild(r));
      notifyChange();
      showToast(`Sorted table rows ${isDesc ? 'Descending (Z to A)' : 'Ascending (A to Z)'} (col ${colIndex + 1})`, 'success');
      return;
    }

    if (!sel.isCollapsed && sel.toString().trim()) {
      const text = sel.toString();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast('Select multiple lines to sort', 'info');
        return;
      }
      lines.sort((a, b) => {
        return isDesc
          ? b.trim().localeCompare(a.trim(), undefined, { numeric: true })
          : a.trim().localeCompare(b.trim(), undefined, { numeric: true });
      });
      insertHtmlAtCursor(lines.map(l => escHtml(l)).join('<br>'));
      notifyChange();
      showToast(`Sorted ${lines.length} lines ${isDesc ? 'Descending (Z to A)' : 'Ascending (A to Z)'}`, 'success');
      return;
    }

    showToast('Select lines of text or click inside a table to sort', 'info');
  }

  // Toggle PowerPoint-Style Text Drop Shadow (Issue 3 replacement)
  function toggleTextShadow() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
      showToast('Select text first to toggle text shadow', 'info');
      return;
    }

    const range = sel.getRangeAt(0);
    const parentSpan = sel.anchorNode?.parentElement;
    if (parentSpan && parentSpan.tagName === 'SPAN' && parentSpan.style.textShadow) {
      parentSpan.style.textShadow = '';
      notifyChange();
      showToast('Text shadow removed', 'info');
      return;
    }

    const span = document.createElement('span');
    span.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.45)';
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    notifyChange();
    showToast('Applied PowerPoint text shadow', 'success');
  }

  // Word Wrap Toggle (Notepad style — expands editor page width when unwrapped)
  function toggleWordWrap() {
    if (!editor) return;
    const btn = $('#wordWrapBtn');
    const isNowrap = editor.classList.contains('no-wrap-mode') || editor.style.whiteSpace === 'nowrap';
    if (isNowrap) {
      editor.classList.remove('no-wrap-mode');
      editor.style.whiteSpace = 'normal';
      editor.style.wordBreak = 'break-word';
      btn?.classList.remove('active');
      showToast('Word Wrap: ON', 'info');
    } else {
      editor.classList.add('no-wrap-mode');
      editor.style.whiteSpace = 'pre';
      editor.style.wordBreak = 'normal';
      btn?.classList.add('active');
      showToast('Word Wrap: OFF (Page auto-expands & scrolls horizontally)', 'info');
    }
    notifyChange();
  }

  // Column Break insertion (Custom visual separator line in editor, break in print)
  function insertColumnBreak() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    const html = '<div class="doc-column-break" contenteditable="false"><i class="fas fa-arrows-split-up-and-left" style="margin-right:6px;"></i>Column Break</div><p><br></p>';
    insertHtmlAtCursor(html);
    notifyChange();
    showToast('Column break inserted (content flows to next column)', 'info');
  }

  // Floating Link Bubble
  let activeLinkBubble = null;
  function removeLinkBubble() {
    if (activeLinkBubble) {
      activeLinkBubble.remove();
      activeLinkBubble = null;
    }
  }

  function showLinkBubble(anchor, href) {
    removeLinkBubble();

    const bubble = document.createElement('div');
    bubble.className = 'df-link-bubble';
    bubble.innerHTML = `
      <a href="${escHtml(href)}" target="_blank" rel="noopener" title="${escHtml(href)}">${escHtml(href)}</a>
      <button type="button" class="df-link-open-btn" title="Open Link in new tab"><i class="fas fa-arrow-up-right-from-square"></i> Open</button>
      <button type="button" class="df-link-unlink-btn" title="Remove hyperlink"><i class="fas fa-link-slash"></i> Unlink</button>
    `;

    document.body.appendChild(bubble);
    activeLinkBubble = bubble;

    const rect = anchor.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    let top = rect.bottom + 6;
    let left = rect.left;
    if (left + bubbleRect.width > window.innerWidth - 12) {
      left = window.innerWidth - bubbleRect.width - 12;
    }
    if (left < 10) left = 10;
    if (top + bubbleRect.height > window.innerHeight - 10) {
      top = rect.top - bubbleRect.height - 6;
    }

    bubble.style.top = top + 'px';
    bubble.style.left = left + 'px';

    bubble.querySelector('.df-link-open-btn').addEventListener('click', e => {
      e.stopPropagation();
      window.open(href, '_blank', 'noopener,noreferrer');
      removeLinkBubble();
    });

    bubble.querySelector('.df-link-unlink-btn').addEventListener('click', e => {
      e.stopPropagation();
      const text = anchor.textContent;
      anchor.replaceWith(document.createTextNode(text));
      removeLinkBubble();
      notifyChange();
      showToast('Hyperlink removed', 'info');
    });
  }

  // Setup Toolbar Controls
  function initEditor() {
    if (!editor) return;

    // Formatting Buttons (data-cmd)
    $$('.fmt-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        execCmd(btn.dataset.cmd);
      });
    });

    // Clear All Formatting (Bug 3: With warning confirmation)
    $('#removeFormatBtn')?.addEventListener('click', () => {
      clearFormatting();
    });
    $('#clearFormatCancel')?.addEventListener('click', () => {
      closeModal('#clearFormatModal');
    });
    $('#clearFormatConfirm')?.addEventListener('click', () => {
      executeClearFormatting();
    });

    // Change Case Popover (Positioned above editor, persists text selection)
    const changeCaseBtn = $('#changeCaseBtn');
    const casePopover = $('#casePopover');
    if (changeCaseBtn && casePopover) {
      changeCaseBtn.addEventListener('mousedown', () => saveSelection());
      changeCaseBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        const wasOpen = casePopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(changeCaseBtn, casePopover);
          } else {
            casePopover.classList.add('show');
          }
        } else {
          casePopover.classList.remove('show');
        }
      });
      $$('#casePopover .spacing-opt-item').forEach(item => {
        item.addEventListener('mousedown', e => e.preventDefault());
        item.addEventListener('click', e => {
          e.stopPropagation();
          changeTextCase(item.dataset.case);
          casePopover.classList.remove('show');
        });
      });
    }

    // Format Painter & Word Wrap & Column Break
    $('#formatPainterBtn')?.addEventListener('click', toggleFormatPainter);
    $('#formatPainterBtn')?.addEventListener('dblclick', resetFormatPainter);
    $('#wordWrapBtn')?.addEventListener('click', toggleWordWrap);
    $('#layoutColumnBreakBtn')?.addEventListener('click', insertColumnBreak);
    $('#popoverColumnBreakItem')?.addEventListener('click', () => {
      insertColumnBreak();
      $('#columnsPopover')?.classList.remove('show');
    });

    // Home Menu Sort Dropdown (Ascending / Descending) (Issue 4)
    const sortBtn = $('#homeExcelSortBtn');
    const sortPopover = $('#sortPopover');
    if (sortBtn && sortPopover) {
      sortBtn.addEventListener('mousedown', () => saveSelection());
      sortBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = sortPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(sortBtn, sortPopover);
          } else {
            sortPopover.classList.add('show');
          }
        }
      });

      $('#sortAscBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        sortPopover.classList.remove('show');
        restoreSelection();
        sortSelectedTextOrTable('asc');
      });

      $('#sortDescBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        sortPopover.classList.remove('show');
        restoreSelection();
        sortSelectedTextOrTable('desc');
      });
    }
    $('#homePptShadowBtn')?.addEventListener('click', toggleTextShadow);

    // Font Family — saves selection on focus and mousedown, restores on change
    const fontFamily = $('#fontFamily');
    if (fontFamily) {
      fontFamily.addEventListener('focus', () => saveSelection());
      fontFamily.addEventListener('mousedown', () => saveSelection());
      fontFamily.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') return;
        restoreSelection();
        document.execCommand('fontName', false, this.value);
        notifyChange();
        updateToolbarState();
      });
    }

    // Number Type Font Size Input & Stepper Buttons (No Limit)
    const fontSizeInput = $('#fontSizeInput');
    const fontSizeDec = $('#fontSizeDec');
    const fontSizeInc = $('#fontSizeInc');

    if (fontSizeInput) {
      fontSizeInput.addEventListener('mousedown', () => saveSelection());
      fontSizeInput.addEventListener('change', function () {
        setFontSize(this.value);
      });
      fontSizeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setFontSize(this.value);
        }
      });
    }

    if (fontSizeDec) {
      fontSizeDec.addEventListener('mousedown', e => e.preventDefault());
      fontSizeDec.addEventListener('click', () => {
        const cur = parseInt(fontSizeInput?.value, 10) || 15;
        setFontSize(Math.max(1, cur - 1));
      });
    }

    if (fontSizeInc) {
      fontSizeInc.addEventListener('mousedown', e => e.preventDefault());
      fontSizeInc.addEventListener('click', () => {
        const cur = parseInt(fontSizeInput?.value, 10) || 15;
        setFontSize(cur + 1);
      });
    }

    // Backward compatibility for old fontSize dropdown if present
    const oldFontSize = $('#fontSize');
    if (oldFontSize) {
      oldFontSize.addEventListener('focus', () => saveSelection());
      oldFontSize.addEventListener('mousedown', () => saveSelection());
      oldFontSize.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') return;
        restoreSelection();
        document.execCommand('fontSize', false, this.value);
        notifyChange();
        updateToolbarState();
      });
    }

    // Heading Select — saves selection on focus and mousedown, restores on change
    const headingSelect = $('#headingSelect');
    if (headingSelect) {
      headingSelect.addEventListener('focus', () => saveSelection());
      headingSelect.addEventListener('mousedown', () => saveSelection());
      headingSelect.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') return;
        restoreSelection();
        const val = this.value;
        document.execCommand('formatBlock', false, val === 'p' ? '<p>' : `<${val}>`);
        notifyChange();
        updateToolbarState();
        if (window.DocFlow.Find) window.DocFlow.Find.scheduleOutlineUpdate();
      });
    }

    // Bullets & Numbering Dropdown Popover
    const bulletDropdownBtn = $('#bulletDropdownBtn');
    const bulletPopover = $('#bulletPopover');
    if (bulletDropdownBtn && bulletPopover) {
      bulletDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        const wasOpen = bulletPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(bulletDropdownBtn, bulletPopover);
          } else {
            bulletPopover.classList.add('show');
          }
        }
      });

      $$('.bullet-opt-card').forEach(card => {
        card.addEventListener('click', () => {
          const listType = card.dataset.listType;
          restoreSelection();
          applyListStyle(listType);
          bulletPopover.classList.remove('show');
        });
      });
    }

    // Line Spacing Popover
    const lineSpacingBtn = $('#lineSpacingBtn');
    const spacingPopover = $('#spacingPopover');
    if (lineSpacingBtn && spacingPopover) {
      lineSpacingBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        const wasOpen = spacingPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(lineSpacingBtn, spacingPopover);
          } else {
            spacingPopover.classList.add('show');
          }
        }
      });

      $$('.spacing-opt-item').forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.spacing;
          restoreSelection();
          applyLineSpacing(val);
          spacingPopover.classList.remove('show');
        });
      });
    }

    // Close Popovers on Outside Click
    document.addEventListener('click', e => {
      if (!e.target.closest('.bullet-dropdown-wrap')) {
        bulletPopover?.classList.remove('show');
        spacingPopover?.classList.remove('show');
      }
    });

    // Clipboard Buttons (Cut, Copy, Paste)
    $('#btnCut')?.addEventListener('click', () => {
      focusEditor();
      try {
        document.execCommand('cut');
        showToast('Cut to clipboard', 'info');
      } catch (e) {
        showToast('Use Ctrl+X to cut', 'info');
      }
    });

    $('#btnCopy')?.addEventListener('click', () => {
      focusEditor();
      try {
        document.execCommand('copy');
        showToast('Copied to clipboard', 'info');
      } catch (e) {
        showToast('Use Ctrl+C to copy', 'info');
      }
    });

    $('#btnPaste')?.addEventListener('click', async () => {
      focusEditor();
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            insertHtmlAtCursor(escHtml(text).replace(/\n/g, '<br>'));
            showToast('Pasted from clipboard', 'info');
            return;
          }
        }
        document.execCommand('paste');
      } catch (e) {
        showToast('Use Ctrl+V to paste', 'info');
      }
    });

    // Additional Dialog Setups
    setupColorPickers();
    setupTableInsert();
    setupLinkInsert();
    setupHrAndQuote();

    // Editor Events
    editor.addEventListener('input', () => {
      saveSelection();
      notifyChange();
    });

    editor.addEventListener('mouseup', () => {
      saveSelection();
      applyFormatPainterToSelection();
      updateToolbarState();
      updateCursorPos();
    });

    editor.addEventListener('keyup', () => {
      saveSelection();
      updateToolbarState();
      updateCursorPos();
    });

    editor.addEventListener('click', e => {
      updateCursorPos();
      const link = e.target.closest('a');
      if (link && editor.contains(link)) {
        const href = link.getAttribute('href');
        if (href) {
          showLinkBubble(link, href);
          // If clicked in read-only mode or with Ctrl/Cmd key: redirect immediately
          if (e.ctrlKey || e.metaKey || window.DocFlow.currentMode !== 'edit') {
            e.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      } else if (!e.target.closest('.df-link-bubble')) {
        removeLinkBubble();
      }
    });

    // Tab key inserts 4 non-breaking spaces & Contextual Ctrl+A (Issue 5)
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        insertHtmlAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          let node = sel.getRangeAt(0).commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

          // 1. If inside an inner sub-container (rectangle, card, title box, content box, table cell, quote)
          const subContainer = node.closest(
            '.slide-freeform-rect, .slide-nested-card, .slide-title-box, .slide-content-box, td, th, blockquote, .doc-shape-container'
          );
          if (subContainer) {
            e.preventDefault();
            e.stopPropagation();
            const range = document.createRange();
            range.selectNodeContents(subContainer);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
          }

          // 2. If inside a PPT slide card / wrapper
          const slideCard = node.closest('.pptx-slide-card') || node.closest('.pptx-slide-wrapper');
          if (slideCard) {
            e.preventDefault();
            e.stopPropagation();
            const targetCard = slideCard.classList.contains('pptx-slide-card') ? slideCard : (slideCard.querySelector('.pptx-slide-card') || slideCard);
            const range = document.createRange();
            range.selectNodeContents(targetCard);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
          }
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          let node = range.commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          const slideCard = node.closest('.pptx-slide-card');
          if (slideCard) {
            const cardText = slideCard.textContent.trim();
            const selText = sel.toString().trim();
            const isFullSelected = (selText && selText === cardText) ||
              (range.startContainer === slideCard && range.endContainer === slideCard) ||
              (range.commonAncestorContainer === slideCard && range.startOffset === 0 && range.endOffset >= slideCard.childNodes.length);

            if (isFullSelected || cardText.length <= 1) {
              e.preventDefault();
              e.stopPropagation();
              slideCard.innerHTML = '<p class="slide-placeholder-text" style="color:var(--text-muted);font-style:italic;margin:0;">Click to add content...</p>';
              const newRange = document.createRange();
              const p = slideCard.querySelector('.slide-placeholder-text');
              if (p) {
                newRange.selectNodeContents(p);
                newRange.collapse(true);
              }
              sel.removeAllRanges();
              sel.addRange(newRange);
              notifyChange();
              return;
            }
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (undoStack.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        if (redoStack.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          redo();
        }
      }
    });

    // Selection Change Listener (Keeps formatting buttons in sync with cursor)
    document.addEventListener('selectionchange', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      clearTimeout(selChangeTimer);
      selChangeTimer = setTimeout(() => {
        try {
          const sel = window.getSelection();
          if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            updateToolbarState();
            updateCursorPos();
          }
        } catch (e) { }
      }, 100);
    });
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.Editor = {
    initEditor,
    saveSelection,
    restoreSelection,
    focusEditor,
    insertNodeAtCursor,
    insertHtmlAtCursor,
    execCmd,
    saveSnapshot,
    undo,
    redo,
    updateCounts,
    updateCursorPos,
    updateToolbarState,
    notifyChange,
    setFontSize,
    applyListStyle,
    applyLineSpacing,
    clearFormatting,
    changeTextCase,
    toggleFormatPainter,
    resetFormatPainter,
    sortSelectedTextOrTable,
    toggleTextShadow,
    openLineModal,
    insertCustomLine,
    toggleWordWrap,
    insertColumnBreak
  };

})(window);
