/**
 * DocFlow — UI Utilities, Theme, Toasts, Tabs & Modals
 */

(function (window) {
  'use strict';

  // DOM Shorthands
  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);

  // HTML escaping utility (escapes single quotes as &#39; as well)
  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Toast Notification System (capped at 5 to prevent infinite stacking)
  function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    if (!container) return;

    while (container.children.length >= 5) {
      container.removeChild(container.firstElementChild);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-triangle-exclamation',
      info: 'fa-info-circle'
    };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escHtml(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Theme Management
  let isDark = true;
  function setTheme(dark) {
    isDark = dark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const icon = $('#themeIcon');
    if (icon) {
      icon.className = dark ? 'fas fa-moon' : 'fas fa-sun';
    }
    try {
      localStorage.setItem('df-theme', dark ? 'dark' : 'light');
    } catch (e) { }
  }

  function initTheme() {
    try {
      const stored = localStorage.getItem('df-theme');
      if (stored) {
        setTheme(stored === 'dark');
      } else {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        setTheme(!prefersLight);
      }
    } catch (e) {
      setTheme(true);
    }

    const themeBtn = $('#themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => setTheme(!isDark));
    }
  }

  // Modal Management with Focus Trap & Escape return
  let lastActiveElement = null;

  function openModal(modalId) {
    const modal = $(modalId);
    if (modal) {
      lastActiveElement = document.activeElement;
      modal.classList.add('show');
      const firstInput = modal.querySelector('input:not([type="hidden"]), button.primary, .modal-btn');
      if (firstInput) setTimeout(() => firstInput.focus(), 80);
    }
  }

  function closeModal(modalId) {
    const modal = typeof modalId === 'string' ? $(modalId) : modalId;
    if (modal) {
      modal.classList.remove('show');
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        try { lastActiveElement.focus(); } catch (e) { }
      } else if (window.DocFlow && window.DocFlow.Editor && window.DocFlow.currentMode === 'edit') {
        window.DocFlow.Editor.focusEditor();
      }
    }
  }

  function initModals() {
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    // Close buttons inside modals
    $('#newDocCancel')?.addEventListener('click', () => closeModal('#newDocModal'));
    $('#linkCancel')?.addEventListener('click', () => closeModal('#linkModal'));
    $('#tableCancel')?.addEventListener('click', () => closeModal('#tableModal'));
    $('#statsCloseBtn')?.addEventListener('click', () => closeModal('#statsModal'));

    // Modal Focus Trap for Accessibility (WCAG compliant)
    document.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const modal = document.querySelector('.modal-overlay.show');
      if (!modal) return;

      const focusables = Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Fullscreen Handler
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        showToast('Fullscreen not available in this browser context', 'warning');
      });
    } else {
      document.exitFullscreen();
    }
  }

  function initFullscreen() {
    const btn = $('#fullscreenBtn');
    if (btn) {
      btn.addEventListener('click', toggleFullscreen);
      document.addEventListener('fullscreenchange', () => {
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = document.fullscreenElement ? 'fas fa-compress' : 'fas fa-expand';
        }
      });
    }
  }

  // Tab Manager
  const Tabs = {
    list: [],
    activeId: null,

    create(name, content, fileType, type = 'edit') {
      // Disambiguate duplicate tab names
      let finalName = name;
      let counter = 1;
      while (this.list.some(t => t.name.toLowerCase() === finalName.toLowerCase())) {
        const parts = name.split('.');
        if (parts.length > 1) {
          const ext = parts.pop();
          finalName = `${parts.join('.')} (${counter}).${ext}`;
        } else {
          finalName = `${name} (${counter})`;
        }
        counter++;
      }

      const tab = {
        id: 't' + Date.now() + Math.random().toString(36).slice(2, 6),
        name: finalName,
        content,
        fileType,
        type,
        modified: false,
        scroll: 0,
        pdfData: null,
        pdfDoc: null
      };
      this.list.push(tab);
      this.activeId = tab.id;
      this.save();
      this.render();
      return tab;
    },

    get(id) {
      return this.list.find(t => t.id === id);
    },

    saveCurrent() {
      const t = this.get(this.activeId);
      if (t && t.type === 'edit' && window.DocFlow && window.DocFlow.currentMode === 'edit') {
        const editor = $('#editor');
        const editorWrap = $('#editorWrap');
        if (editor) {
          if (window.DocFlow.Find && window.DocFlow.Find.getCleanHtml) {
            t.content = window.DocFlow.Find.getCleanHtml();
          } else {
            t.content = editor.innerHTML;
          }
        }
        t.modified = window.DocFlow.isModified || false;
        if (editorWrap) t.scroll = editorWrap.scrollTop;
      }
    },

    activateTab(tab) {
      if (!tab) return;
      if (tab.type === 'edit') {
        const editor = $('#editor');
        const editorWrap = $('#editorWrap');
        if (editor) editor.innerHTML = tab.content;
        if (editorWrap) editorWrap.scrollTop = tab.scroll || 0;

        // Auto-adjust editor canvas for Excel / CSV mode (Bug 6)
        const isExcelOrCsv = (tab.name && (tab.name.endsWith('.xlsx') || tab.name.endsWith('.xls') || tab.name.endsWith('.csv'))) ||
          tab.fileType === 'EXCEL' || tab.fileType === 'CSV' || (tab.content && tab.content.includes('excel-spreadsheet-container'));
        if (editor) {
          if (isExcelOrCsv) {
            editor.classList.add('excel-view-mode');
          } else {
            editor.classList.remove('excel-view-mode');
          }

          // Link Excel formula bar with table cells
          if (isExcelOrCsv) {
            const formulaInput = editor.querySelector('.excel-formula-input');
            if (formulaInput) {
              editor.querySelectorAll('.excel-grid-table td').forEach(td => {
                td.addEventListener('focus', () => {
                  formulaInput.value = td.textContent || '';
                  window._activeExcelCell = td;
                });
              });
              formulaInput.addEventListener('input', () => {
                if (window._activeExcelCell) {
                  window._activeExcelCell.textContent = formulaInput.value;
                  window.DocFlow.Editor?.notifyChange();
                }
              });
            }
          }
        }

        if (window.DocFlow) {
          window.DocFlow.switchMode('edit');
          window.DocFlow.updateTopbar(tab);
          window.DocFlow.setModified(tab.modified || false);
        }

        requestAnimationFrame(() => {
          if (window.DocFlow && window.DocFlow.Editor) {
            window.DocFlow.Editor.focusEditor();
            window.DocFlow.Editor.updateCounts();
            window.DocFlow.Editor.updateCursorPos();
            window.DocFlow.Editor.updateToolbarState();
          }
          if (window.DocFlow && window.DocFlow.Find) {
            window.DocFlow.Find.updateOutline();
          }
        });
      } else if (tab.type === 'pdf') {
        if (tab.pdfData && window.DocFlow && window.DocFlow.PDF) {
          window.DocFlow.PDF.loadPdfTab(tab);
        } else {
          showToast('PDF data was not persisted — please reopen the file', 'warning');
          this.close(tab.id);
        }
      }
    },

    switchTo(id) {
      if (id === this.activeId) return;
      this.saveCurrent();
      this.activeId = id;
      const tab = this.get(id);
      if (!tab) return;
      this.activateTab(tab);
      this.render();
      this.save();
    },

    close(id) {
      const idx = this.list.findIndex(t => t.id === id);
      if (idx === -1) return;
      const tab = this.list[idx];

      if (tab.modified && tab.type === 'edit') {
        if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
      }

      if (tab.pdfDoc) {
        try { tab.pdfDoc.destroy(); } catch (e) { }
        tab.pdfDoc = null;
      }

      this.list.splice(idx, 1);
      try { localStorage.removeItem('df-tab-' + id); } catch (e) { }

      if (this.list.length === 0) {
        this.activeId = null;
        if (window.DocFlow) {
          window.DocFlow.switchMode('empty');
          $('#fileNameDisplay').textContent = 'DocFlow';
          $('#fileTypeInfo').textContent = 'No file';
          window.DocFlow.setModified(false);
        }
        this.render();
        this.save();
        return;
      }

      if (this.activeId === id) {
        const nextIdx = Math.min(idx, this.list.length - 1);
        const nextTab = this.list[nextIdx];
        this.activeId = nextTab.id;
        this.activateTab(nextTab);
      }

      this.render();
      this.save();
    },

    rename(id) {
      const tab = this.get(id);
      if (!tab) return;
      const currentName = tab.name.replace(/\.[^.]+$/, '');
      const ext = tab.name.includes('.') ? '.' + tab.name.split('.').pop() : '';
      const newBase = prompt('Enter new document name:', currentName);
      if (!newBase || !newBase.trim()) return;
      const newName = newBase.trim() + ext;
      tab.name = newName;
      if (this.activeId === id) {
        const fnDisplay = $('#fileNameDisplay');
        if (fnDisplay) fnDisplay.textContent = newName;
      }
      this.render();
      this.save();
      showToast(`Renamed to "${newName}"`, 'info');
    },

    render() {
      const tabList = $('#tabList');
      const tabBar = $('#tabBar');
      if (!tabList || !tabBar) return;

      tabList.innerHTML = '';
      this.list.forEach(tab => {
        const el = document.createElement('div');
        el.className = 'tab' + (tab.id === this.activeId ? ' active' : '') + (tab.modified ? ' modified' : '');
        el.setAttribute('role', 'tab');
        el.setAttribute('aria-selected', tab.id === this.activeId ? 'true' : 'false');
        el.dataset.id = tab.id;
        el.innerHTML = `
          <span class="tab-save-dot ${tab.modified ? 'unsaved' : 'saved'}" title="${tab.modified ? 'Unsaved changes (Red)' : 'Saved (Green)'}"></span>
          <span class="tab-name" title="${escHtml(tab.name)}">${escHtml(tab.name)}</span>
          <button class="tab-more-btn" title="Options for ${escHtml(tab.name)}" aria-label="Tab options"><i class="fas fa-ellipsis-vertical"></i></button>
          <button class="tab-close" title="Close tab" aria-label="Close ${escHtml(tab.name)}">&times;</button>
          <div class="tab-menu-dropdown" role="menu">
            <button class="tab-menu-item" data-action="rename"><i class="fas fa-pen-to-square"></i> Rename</button>
            <button class="tab-menu-item" data-action="save"><i class="fas fa-floppy-disk"></i> Save</button>
            <button class="tab-menu-item" data-action="print"><i class="fas fa-print"></i> Print</button>
            <button class="tab-menu-item danger" data-action="close"><i class="fas fa-xmark"></i> Close</button>
          </div>
        `;

        el.addEventListener('click', e => {
          if (e.target.closest('.tab-close') || e.target.closest('.tab-more-btn') || e.target.closest('.tab-menu-dropdown')) return;
          this.switchTo(tab.id);
        });

        const moreBtn = el.querySelector('.tab-more-btn');
        const menuDropdown = el.querySelector('.tab-menu-dropdown');

        moreBtn?.addEventListener('click', e => {
          e.stopPropagation();
          const wasOpen = menuDropdown.classList.contains('show');
          closeAllPopovers();
          if (!wasOpen) {
            positionPopover(moreBtn, menuDropdown);
          }
        });

        menuDropdown?.querySelectorAll('.tab-menu-item').forEach(item => {
          item.addEventListener('click', e => {
            e.stopPropagation();
            menuDropdown.classList.remove('show');
            const action = item.dataset.action;
            if (action === 'rename') {
              this.rename(tab.id);
            } else if (action === 'save') {
              if (this.activeId !== tab.id) this.switchTo(tab.id);
              if (window.DocFlow && window.DocFlow.handleTabSave) {
                window.DocFlow.handleTabSave(tab.id);
              }
            } else if (action === 'print') {
              if (this.activeId !== tab.id) this.switchTo(tab.id);
              window.print();
            } else if (action === 'close') {
              this.close(tab.id);
            }
          });
        });

        el.querySelector('.tab-close')?.addEventListener('click', e => {
          e.stopPropagation();
          this.close(tab.id);
        });

        tabList.appendChild(el);
      });

      tabBar.classList.toggle('visible', this.list.length > 0);
    },

    save() {
      try {
        const meta = this.list.map(t => ({
          id: t.id,
          name: t.name,
          fileType: t.fileType,
          type: t.type,
          modified: false,
          scroll: t.scroll
        }));
        localStorage.setItem('df-tabs', JSON.stringify(meta));
        localStorage.setItem('df-active', this.activeId || '');

        this.list.forEach(t => {
          if (t.type === 'edit') {
            try {
              localStorage.setItem('df-tab-' + t.id, t.content);
            } catch (err) {
              console.warn('Quota warning for tab ' + t.id + ':', err);
            }
          }
        });
        return true;
      } catch (e) {
        console.warn('Storage save failed:', e);
        return false;
      }
    },

    load() {
      try {
        const raw = localStorage.getItem('df-tabs');
        if (!raw) return false;
        const meta = JSON.parse(raw);
        // Exclude binary PDF tabs from localStorage restoration (Bug #8)
        const editable = meta.filter(m => m.type !== 'pdf');
        if (!editable.length) return false;

        this.list = editable.map(m => ({
          id: m.id,
          name: m.name,
          fileType: m.fileType,
          type: m.type,
          modified: false,
          scroll: m.scroll || 0,
          content: localStorage.getItem('df-tab-' + m.id) || '<p><br></p>',
          pdfData: null,
          pdfDoc: null
        }));

        const storedActive = localStorage.getItem('df-active');
        this.activeId = (storedActive && this.list.some(t => t.id === storedActive))
          ? storedActive
          : this.list[0].id;
        return true;
      } catch (e) {
        return false;
      }
    },

    findByFile(name) {
      return this.list.find(t => t.name.toLowerCase() === name.toLowerCase());
    }
  };

  // Floating Popover Positioner (Prevents clipping from scrolling containers on mobile & desktop)
  function positionPopover(trigger, popover) {
    if (!trigger || !popover) return;
    const rect = trigger.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top = (rect.bottom + 4) + 'px';
    popover.style.maxHeight = 'calc(100vh - ' + (rect.bottom + 12) + 'px)';
    popover.style.overflowY = 'auto';
    popover.style.zIndex = '1200';
    popover.classList.add('show');
    const popoverWidth = popover.offsetWidth || 220;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) left = 8;
    popover.style.left = left + 'px';
  }

  function closeAllPopovers() {
    document.querySelectorAll('.margin-popover.show, .bullet-popover.show, .spacing-popover.show, .tab-menu-dropdown.show, .dropdown.show').forEach(p => {
      p.classList.remove('show');
    });
  }

  // Close floating popovers & tab context menus on outside click or window resize
  document.addEventListener('click', e => {
    if (!e.target.closest('.tab-more-btn') && !e.target.closest('.tab-menu-dropdown') &&
        !e.target.closest('.bullet-dropdown-wrap') && !e.target.closest('.margin-popover') &&
        !e.target.closest('.dropdown') && !e.target.closest('#ribbonSaveDropdownBtn')) {
      closeAllPopovers();
    }
  });

  window.addEventListener('resize', closeAllPopovers);

  // Export to namespace
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.UI = {
    $,
    $$,
    escHtml,
    showToast,
    setTheme,
    initTheme,
    openModal,
    closeModal,
    initModals,
    toggleFullscreen,
    initFullscreen,
    positionPopover,
    closeAllPopovers,
    Tabs
  };

})(window);
