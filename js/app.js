/**
 * DocFlow — Main Application Controller & State Coordinator
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  // Templates Definitions
  const TEMPLATES = [
    {
      id: 'blank',
      name: 'Blank Document',
      icon: 'fa-file',
      content: '<p><br></p>'
    },
    {
      id: 'letter',
      name: 'Formal Letter',
      icon: 'fa-envelope',
      content: `<h1>[Your Name]</h1>
<p>[Your Address]<br>[City, State, ZIP Code]<br>[Your Email] | [Your Phone]</p>
<p>[Date]</p>
<p>[Recipient Name]<br>[Recipient Title]<br>[Company Name]<br>[Company Address]<br>[City, State, ZIP]</p>
<p>Dear [Recipient Name],</p>
<p>[Opening paragraph stating the purpose of the letter]</p>
<p>[Body paragraph providing necessary details, context, and information]</p>
<p>[Closing paragraph with a clear call to action or next steps]</p>
<p>Sincerely,<br><br><strong>[Your Name]</strong><br>[Your Title]</p>`
    },
    {
      id: 'resume',
      name: 'Modern Resume',
      icon: 'fa-user-tie',
      content: `<h1>[Your Full Name]</h1>
<p>[Email Address] | [Phone Number] | [LinkedIn / Portfolio Profile] | [City, Country]</p>
<hr>
<h2>Professional Summary</h2>
<p>[Concise overview highlighting key expertise, accomplishments, and career goals.]</p>
<h2>Work Experience</h2>
<h3>[Job Title] — [Company Name]</h3>
<p><em>[Month, Year] – [Present]</em> | [Location]</p>
<ul>
  <li>[Spearheaded project with measurable outcomes]</li>
  <li>[Collaborated with cross-functional teams to achieve strategic goals]</li>
  <li>[Optimized workflows resulting in increased performance]</li>
</ul>
<h2>Education</h2>
<h3>[Degree Name] — [University Name]</h3>
<p><em>[Graduation Year]</em> | [Location]</p>
<h2>Skills</h2>
<p>[Skill 1] &bull; [Skill 2] &bull; [Skill 3] &bull; [Skill 4] &bull; [Skill 5]</p>`
    },
    {
      id: 'report',
      name: 'Project Report',
      icon: 'fa-chart-bar',
      content: `<h1>[Project Report Title]</h1>
<p><em>Author: [Author Name]<br>Date: [Date]<br>Status: Draft</em></p>
<hr>
<h2>1. Executive Summary</h2>
<p>[High-level overview of objectives, findings, and recommended actions.]</p>
<h2>2. Objectives</h2>
<p>[Primary and secondary goals of this initiative.]</p>
<h2>3. Key Findings</h2>
<p>[Detailed findings supported by data and observations.]</p>
<h2>4. Action Items & Next Steps</h2>
<ol>
  <li>[Immediate action item with owner and target completion date]</li>
  <li>[Secondary milestone to review during next cycle]</li>
</ol>`
    },
    {
      id: 'meeting',
      name: 'Meeting Minutes',
      icon: 'fa-users',
      content: `<h1>Meeting Minutes</h1>
<p><strong>Date:</strong> [Date] | <strong>Time:</strong> [Time] | <strong>Location:</strong> [Virtual / Room]</p>
<p><strong>Attendees:</strong> [Attendee 1, Attendee 2, Attendee 3]</p>
<hr>
<h2>Agenda</h2>
<ul>
  <li>Review previous milestone goals</li>
  <li>Sprint planning & feature alignment</li>
  <li>Open Q&A discussion</li>
</ul>
<h2>Discussion Points</h2>
<p>[Summary of discussions and key decisions made during the session.]</p>
<h2>Action Items</h2>
<table>
  <thead>
    <tr><th>Action Item</th><th>Owner</th><th>Due Date</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr><td>Deploy updated document editor</td><td>Engineering</td><td>Friday</td><td>In Progress</td></tr>
    <tr><td>Review documentation feedback</td><td>Design Team</td><td>Monday</td><td>Pending</td></tr>
  </tbody>
</table>`
    },
    {
      id: 'essay',
      name: 'Academic Essay',
      icon: 'fa-pen-nib',
      content: `<h1>[Essay Title]</h1>
<p><em>[Your Name]<br>[Course Title]<br>[Instructor Name]<br>[Date]</em></p>
<hr>
<h2>Introduction</h2>
<p>[Compelling opening statement introducing the primary subject matter.]</p>
<p><strong>Thesis:</strong> [Clear, concise statement formulating the central argument.]</p>
<h2>Main Argument</h2>
<p>[Thorough examination supported by relevant examples and textual evidence.]</p>
<h2>Conclusion</h2>
<p>[Synthesis of primary insights and closing perspectives.]</p>`
    }
  ];

  // Application State
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.currentMode = 'empty'; // 'empty' | 'edit' | 'view'
  window.DocFlow.isModified = false;

  const emptyState = $('#emptyState');
  const pdfWrap = $('#pdfWrap');
  const editorWrap = $('#editorWrap');
  const ribbonContainer = $('#ribbonContainer');
  const fileNameDisplay = $('#fileNameDisplay');
  const modifiedDot = $('#modifiedDot');
  const fileTypeInfo = $('#fileTypeInfo');
  const modeInfo = $('#modeInfo');

  // ==========================================================================
  // IndexedDB Storage for PDF Documents (Issue 1)
  // ==========================================================================
  const PdfStore = {
    DB_NAME: 'DocFlow_PDF_Store',
    STORE_NAME: 'pdf_files',
    _dbPromise: null,

    getDb() {
      if (!this._dbPromise) {
        this._dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open(this.DB_NAME, 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME, { keyPath: 'name' });
            }
          };
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });
      }
      return this._dbPromise;
    },

    async set(name, arrayBuffer) {
      if (!name || !arrayBuffer) return;
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.put({ name: name.toLowerCase(), buffer: arrayBuffer, timestamp: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('PdfStore save error:', err);
      }
    },

    async get(name) {
      if (!name) return null;
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(name.toLowerCase());
          req.onsuccess = () => resolve(req.result ? req.result.buffer : null);
          req.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('PdfStore get error:', err);
        return null;
      }
    },

    async remove(name) {
      if (!name) return;
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        tx.objectStore(this.STORE_NAME).delete(name.toLowerCase());
      } catch (e) {}
    }
  };

  // ==========================================================================
  // Recent Files Manager (Persistent, Individual Delete, Clear All, Reopen)
  // ==========================================================================
  const Recent = {
    KEY: 'docflow_recent_docs',

    getAll() {
      try {
        const raw = localStorage.getItem(this.KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    saveAll(list) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 30)));
      } catch (e) {
        console.warn('Recent files storage warning:', e);
      }
    },

    add(doc) {
      if (!doc || !doc.name) return;
      let list = this.getAll();
      // Remove previous entry with same name to prevent duplicates or data conflict
      list = list.filter(item => item.name.toLowerCase() !== doc.name.toLowerCase());

      const ext = (doc.name.split('.').pop() || '').toLowerCase();
      const isPdf = ext === 'pdf' || doc.type === 'PDF';
      const entry = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: doc.name,
        type: doc.type || (isPdf ? 'PDF' : ext.toUpperCase()) || 'DOC',
        mode: doc.mode || (isPdf ? 'view' : 'edit'),
        content: doc.content || '<p><br></p>',
        timestamp: Date.now()
      };

      if (doc.pdfData) {
        PdfStore.set(doc.name, doc.pdfData);
      }

      list.unshift(entry);
      this.saveAll(list);
      this.render();
    },

    updateContent(name, newContent) {
      if (!name) return;
      const list = this.getAll();
      const item = list.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (item) {
        item.content = newContent;
        item.timestamp = Date.now();
        this.saveAll(list);
        this.render();
      } else {
        this.add({
          name: name,
          content: newContent,
          mode: 'edit'
        });
      }
    },

    remove(id) {
      let list = this.getAll();
      const target = list.find(item => item.id === id);
      if (target && (target.type === 'PDF' || target.name.toLowerCase().endsWith('.pdf'))) {
        PdfStore.remove(target.name);
      }
      list = list.filter(item => item.id !== id);
      this.saveAll(list);
      this.render();
      showToast('Removed from recent documents', 'info');
    },

    clearAll() {
      const list = this.getAll();
      if (!list.length) {
        showToast('No recent documents to clear', 'info');
        return;
      }
      if (!confirm('Are you sure you want to clear all recent documents?')) return;
      localStorage.removeItem(this.KEY);
      this.render();
      showToast('Recent documents cleared', 'info');
    },

    openDocument(item) {
      if (!item) return;

      // Update timestamp and bring to top of recents when reopened (Issue 1)
      item.timestamp = Date.now();
      let list = this.getAll().filter(d => d.name.toLowerCase() !== item.name.toLowerCase());
      list.unshift(item);
      this.saveAll(list);
      this.render();

      // If document is already open in a tab, switch to it immediately
      const existing = window.DocFlow.UI.Tabs.findByFile ? window.DocFlow.UI.Tabs.findByFile(item.name) : window.DocFlow.UI.Tabs.list.find(t => t.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        window.DocFlow.UI.Tabs.switchTo(existing.id);
        showToast(`Switched to "${item.name}"`, 'info');
        return;
      }

      // Reopen PDF documents with full preserved binary data from PdfStore (Issue 1)
      if (item.type === 'PDF' || item.name.toLowerCase().endsWith('.pdf')) {
        showToast(`Loading PDF "${item.name}"...`, 'info');
        PdfStore.get(item.name).then(data => {
          if (data) {
            const tab = window.DocFlow.UI.Tabs.create(item.name, '', 'PDF', 'pdf');
            tab.pdfData = data;
            window.DocFlow.PDF?.loadPdfTab?.(tab);
            window.DocFlow.UI.Tabs.activateTab(tab);
            showToast(`Reopened PDF "${item.name}"`, 'success');
          } else {
            showToast(`PDF file data not found in local cache. Please browse to reopen "${item.name}".`, 'info');
            $('#openBtn')?.click();
          }
        }).catch(() => {
          showToast(`To view PDF "${item.name}", please browse or drop the file`, 'info');
          $('#openBtn')?.click();
        });
        return;
      }

      // Reopen with exact saved data without conflict
      const tab = window.DocFlow.UI.Tabs.create(item.name, item.content, item.type || 'DOC', 'edit');
      window.DocFlow.UI.Tabs.activateTab(tab);
      showToast(`Reopened "${item.name}"`, 'success');
    },

    render() {
      const listEl = $('#recentFilesList');
      if (!listEl) return;

      const list = this.getAll();
      if (!list.length) {
        listEl.innerHTML = `
          <div class="recent-empty-hint">
            <i class="fas fa-clock-rotate-left" style="font-size:22px;margin-bottom:6px;display:block;opacity:0.35;"></i>
            No recent documents yet. Create or open a file to get started.
          </div>
        `;
        return;
      }

      listEl.innerHTML = '';
      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recent-file-item';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const ext = (item.name.split('.').pop() || '').toLowerCase();
        let iconHtml = '<i class="fas fa-file-lines" style="color:var(--text-muted);"></i>';
        if (ext === 'docx' || ext === 'doc') iconHtml = '<i class="fas fa-file-word" style="color:#2563eb;"></i>';
        else if (ext === 'pdf') iconHtml = '<i class="fas fa-file-pdf" style="color:#dc2626;"></i>';
        else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') iconHtml = '<i class="fas fa-file-excel" style="color:#16a34a;"></i>';
        else if (ext === 'pptx' || ext === 'ppt') iconHtml = '<i class="fas fa-file-powerpoint" style="color:#ea580c;"></i>';
        else if (ext === 'html' || ext === 'htm') iconHtml = '<i class="fas fa-file-code" style="color:#e34c26;"></i>';
        else if (ext === 'md') iconHtml = '<i class="fab fa-markdown" style="color:#38bdf8;"></i>';

        const timeStr = formatRelativeTime(item.timestamp);

        // Delete button placed in front of each item (front/left)
        card.innerHTML = `
          <button class="recent-item-del-btn" title="Remove from recents" aria-label="Remove ${escHtml(item.name)} from recents">
            <i class="fas fa-trash-alt"></i>
          </button>
          <div class="recent-item-icon">${iconHtml}</div>
          <div class="recent-item-info">
            <div class="recent-item-title" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
            <div class="recent-item-meta">
              <span>${escHtml(item.type || ext.toUpperCase() || 'DOC')}</span> &bull; <span>${timeStr}</span>
            </div>
          </div>
        `;

        const delBtn = card.querySelector('.recent-item-del-btn');
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          this.remove(item.id);
        });

        card.addEventListener('click', () => {
          this.openDocument(item);
        });

        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openDocument(item);
          }
        });

        listEl.appendChild(card);
      });
    }
  };

  function formatRelativeTime(ts) {
    if (!ts) return 'Recent';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  // ==========================================================================
  // Auto-Save Management & 5-Second Inactivity Timer
  // ==========================================================================
  let autoSaveEnabled = true;
  try {
    const storedAutoSave = localStorage.getItem('df-autosave');
    if (storedAutoSave !== null) autoSaveEnabled = storedAutoSave === 'true';
  } catch (e) { }

  let autoSaveTimer = null;

  function updateAutoSaveUI() {
    const icon = $('#autoSaveToggleIcon');
    const text = $('#autoSaveStatusText');
    const dot = $('#fileTabDot');

    if (icon) {
      icon.className = autoSaveEnabled ? 'fas fa-toggle-on' : 'fas fa-toggle-off';
      icon.style.color = autoSaveEnabled ? 'var(--success)' : 'var(--text-muted)';
    }
    if (text) {
      text.textContent = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
    }
    if (dot) {
      if (!autoSaveEnabled) {
        dot.className = 'file-tab-dot off';
      } else {
        dot.className = `file-tab-dot ${window.DocFlow.isModified ? 'red' : 'green'}`;
      }
    }
  }

  function setFileTabDot(status) {
    const modifiedDot = $('#modifiedDot');
    const dot = $('#fileTabDot') || modifiedDot;
    if (modifiedDot) {
      if (!autoSaveEnabled && status !== 'off') {
        modifiedDot.className = 'modified-dot';
      } else if (status === 'green' || status === 'saved') {
        modifiedDot.className = 'modified-dot saved';
        modifiedDot.title = 'Saved (Auto-saved)';
      } else if (status === 'red' || status === 'unsaved') {
        modifiedDot.className = 'modified-dot unsaved';
        modifiedDot.title = 'Unsaved changes';
      } else {
        modifiedDot.className = 'modified-dot';
      }
    }
    if (dot && dot !== modifiedDot) {
      dot.className = `file-tab-dot ${status}`;
    }
  }

  function performAutoSave() {
    if (window.DocFlow.currentMode !== 'edit') return;
    const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
    if (!activeTab) return;

    window.DocFlow.UI.Tabs.saveCurrent();
    window.DocFlow.UI.Tabs.save();

    if (Recent) {
      const editor = $('#editor');
      if (editor) Recent.updateContent(activeTab.name, editor.innerHTML);
    }

    setModified(false);
    setFileTabDot('green');
  }

  function triggerAutoSaveTimer() {
    if (!autoSaveEnabled) return;
    if (window.DocFlow.currentMode !== 'edit') return;

    // Turn dot red immediately upon user activity or typing
    setFileTabDot('red');

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      performAutoSave();
    }, 5000);
  }

  // ==========================================================================
  // Mode Switching & State Coordinator
  // ==========================================================================
  function switchMode(mode) {
    window.DocFlow.currentMode = mode;
    document.body.dataset.mode = mode;

    if (emptyState) {
      emptyState.classList.toggle('hidden', mode !== 'empty');
      if (mode === 'empty') Recent.render();
    }
    if (pdfWrap) pdfWrap.classList.toggle('visible', mode === 'view');
    if (editorWrap) editorWrap.classList.toggle('visible', mode === 'edit');
    if (ribbonContainer) ribbonContainer.classList.toggle('visible', mode === 'edit');

    const wordCountItem = $('#wordCountItem');
    const charCountItem = $('#charCountItem');
    const lineInfoWrap = $('#lineInfoWrap');
    const modifiedDot = $('#modifiedDot');

    if (mode === 'empty') {
      if (wordCountItem) wordCountItem.style.display = 'none';
      if (charCountItem) charCountItem.style.display = 'none';
      if (lineInfoWrap) lineInfoWrap.style.display = 'none';
      if (modifiedDot) modifiedDot.style.display = 'none';
      if (fileNameDisplay) fileNameDisplay.textContent = 'DocFlow';
      if (fileTypeInfo) fileTypeInfo.textContent = 'No file';
      if (modeInfo) modeInfo.textContent = 'Ready';
    } else {
      if (wordCountItem) wordCountItem.style.display = 'inline-flex';
      if (charCountItem) charCountItem.style.display = 'inline-flex';
      if (lineInfoWrap) lineInfoWrap.style.display = 'inline-flex';
      if (modifiedDot) modifiedDot.style.display = 'inline-block';
      if (modeInfo) modeInfo.textContent = mode === 'edit' ? 'Editing' : 'Viewing';
    }

    if (window.DocFlow.Find) {
      window.DocFlow.Find.closeOutline();
      window.DocFlow.Find.closeFindBar();
    }

    updateBtnStates();
    if (mode === 'edit') {
      window.DocFlow.Editor?.updateCounts();
      window.DocFlow.Editor?.updateCursorPos();
      const editor = $('#editor');
      if (editor) {
        editor.contentEditable = isPptxDocument() ? 'false' : 'true';
      }
      updatePptSidebar();
    } else {
      const sidebar = $('#pptxSlideSidebar');
      if (sidebar) sidebar.style.display = 'none';
    }
  }

  function updateBtnStates() {
    const isEdit = window.DocFlow.currentMode === 'edit';
    const outlineBtn = $('#outlineBtn');
    const findBtn = $('#findBtn');

    if (outlineBtn) outlineBtn.style.opacity = isEdit ? '1' : '0.4';
    if (findBtn) findBtn.style.opacity = isEdit ? '1' : '0.4';

    $$('[data-save]').forEach(b => {
      b.disabled = (b.dataset.save !== 'merge') && !isEdit;
    });
  }

  function updateTopbar(tab) {
    if (!tab) return;
    if (fileNameDisplay) fileNameDisplay.textContent = tab.name;
    if (fileTypeInfo) fileTypeInfo.textContent = tab.fileType || 'No file';
    setModified(tab.modified || false);
  }

  function setModified(modified) {
    window.DocFlow.isModified = !!modified;
    const tab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
    if (tab) tab.modified = !!modified;

    if (modifiedDot) modifiedDot.classList.toggle('show', !!modified);

    // Synchronize tab save dot in #tabList (Bug 4: Green when saved, Red when modified)
    const activeTabEl = document.querySelector('.tab.active');
    if (activeTabEl) {
      activeTabEl.classList.toggle('modified', !!modified);
      const dot = activeTabEl.querySelector('.tab-save-dot');
      if (dot) {
        dot.className = `tab-save-dot ${modified ? 'unsaved' : 'saved'}`;
        dot.title = modified ? 'Unsaved changes (Red)' : 'Saved (Green)';
      }
    }

    if (modified && autoSaveEnabled) {
      setFileTabDot('red');
    } else if (!modified && autoSaveEnabled) {
      setFileTabDot('green');
    }
  }

  function handleTabSave(tabId) {
    const tab = window.DocFlow.UI.Tabs.get(tabId || window.DocFlow.UI.Tabs.activeId);
    if (!tab) return;
    if (window.DocFlow.UI.Tabs.activeId !== tab.id) {
      window.DocFlow.UI.Tabs.switchTo(tab.id);
    }
    const ext = (tab.name.split('.').pop() || 'html').toLowerCase();
    if (ext === 'txt') {
      window.DocFlow.FileIO?.saveAsTxt();
    } else if (ext === 'md' || ext === 'markdown') {
      window.DocFlow.FileIO?.saveAsMarkdown();
    } else if (ext === 'pdf') {
      window.DocFlow.FileIO?.exportAsPdf();
    } else {
      window.DocFlow.FileIO?.saveAsHtml();
    }
    setModified(false);
  }

  // ==========================================================================
  // New Document Modal & Format Selector (.docx, .pdf, .xlsx, .pptx, .html, .txt, .md)
  // ==========================================================================
  let selectedFormat = 'docx';
  let selectedTemplateId = 'blank';

  function initNewDocModal() {
    const titleInput = $('#newDocTitleInput');
    const formatPills = $$('#formatPillGroup .format-pill');
    const grid = $('#templateGrid');
    const createBtn = $('#newDocCreateBtn');

    // Format selection pills
    formatPills.forEach(pill => {
      pill.addEventListener('click', () => {
        formatPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedFormat = pill.dataset.ext || 'docx';
      });
    });

    // Populate template cards (Bug 2: Persistent visual feedback on chosen template)
    if (grid) {
      grid.innerHTML = '';
      TEMPLATES.forEach(tmpl => {
        const card = document.createElement('div');
        const isSelected = tmpl.id === selectedTemplateId;
        card.className = `template-card ${isSelected ? 'active selected' : ''}`;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.dataset.id = tmpl.id;
        card.innerHTML = `<i class="fas ${tmpl.icon}"></i><span>${tmpl.name}</span>`;

        card.addEventListener('click', () => {
          $$('.template-card').forEach(c => {
            c.classList.remove('active');
            c.classList.remove('selected');
          });
          card.classList.add('active');
          card.classList.add('selected');
          selectedTemplateId = tmpl.id;
        });

        card.addEventListener('dblclick', () => {
          selectedTemplateId = tmpl.id;
          handleCreateDocument();
        });

        card.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            selectedTemplateId = tmpl.id;
            handleCreateDocument();
          }
        });

        grid.appendChild(card);
      });
    }

    // Create button handler
    createBtn?.addEventListener('click', handleCreateDocument);

    function handleCreateDocument() {
      const rawTitle = titleInput ? titleInput.value.trim() : '';
      const docTitle = rawTitle || 'Untitled';
      const ext = selectedFormat || 'docx';
      const tmpl = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

      let content = tmpl.content;

      // Adapt content to chosen format (Bug 11: Real 25-row Excel grid; Bug 12: PPTX deck)
      if (ext === 'xlsx') {
        content = tmpl.id === 'blank'
          ? (window.DocFlow.FileIO?.createBlankExcelGrid(50, 50) || `<p>Spreadsheet Document</p>`)
          : `<p><strong>${escHtml(tmpl.name)}</strong></p>${content}`;
      } else if (ext === 'pptx') {
        content = window.DocFlow.FileIO?.createBlankPresentation() || '<p>Presentation Document</p>';
      } else if (ext === 'html') {
        content = tmpl.id === 'blank'
          ? `<pre class="html-code-view" style="font-family:'Fira Code',Consolas,monospace;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-all;margin:0;background:transparent;border:none;padding:0;">&lt;!DOCTYPE html&gt;&#10;&lt;html lang="en"&gt;&#10;&lt;head&gt;&#10;  &lt;meta charset="UTF-8"&gt;&#10;  &lt;title&gt;${escHtml(docTitle)}&lt;/title&gt;&#10;&lt;/head&gt;&#10;&lt;body&gt;&#10;  &lt;h1&gt;${escHtml(docTitle)}&lt;/h1&gt;&#10;  &lt;p&gt;Write your HTML here...&lt;/p&gt;&#10;&lt;/body&gt;&#10;&lt;/html&gt;</pre>`
          : content;
      } else if (ext === 'txt') {
        const tmp = document.createElement('div');
        tmp.innerHTML = content;
        content = (tmp.innerText || '').replace(/\n/g, '<br>');
      } else if (ext === 'md') {
        if (tmpl.id === 'blank') {
          content = `# ${docTitle}\n\nStart writing in markdown...`.replace(/\n/g, '<br>');
        }
      }

      const fullName = `${docTitle}.${ext}`;
      const duplicateOpen = window.DocFlow.UI.Tabs.list.some(t => t.name.toLowerCase() === fullName.toLowerCase());
      const duplicateRecent = Recent.getAll().some(r => r.name.toLowerCase() === fullName.toLowerCase());
      if (duplicateOpen || duplicateRecent) {
        showToast(`A file named "${fullName}" already exists. Please choose a different name or extension.`, 'error');
        return;
      }

      closeModal('#newDocModal');

      const tab = window.DocFlow.UI.Tabs.create(fullName, content, ext.toUpperCase(), 'edit');
      window.DocFlow.UI.Tabs.activateTab(tab);

      Recent.add({
        name: fullName,
        type: ext.toUpperCase(),
        mode: 'edit',
        content: content
      });

      showToast(`Created new document "${fullName}"`, 'success');
    }
  }

  // Keyboard Shortcuts Setup
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Escape closes open modals, search bar, outline, dropdowns
      if (e.key === 'Escape') {
        $$('.modal-overlay.show').forEach(m => closeModal(m));
        $('#saveDropdown')?.classList.remove('show');
        window.DocFlow.Find?.closeOutline();
        window.DocFlow.Find?.closeFindBar();
        return;
      }

      // Ignore standard shortcut interception inside inputs/modals
      const target = e.target;
      if (target.closest && target.closest('.modal-overlay')) return;
      if (target.tagName === 'INPUT' && target.id !== 'findInput') return;
      if (target.tagName === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'o':
            e.preventDefault();
            $('#openBtn')?.click();
            break;
          case 's':
            e.preventDefault();
            if (window.DocFlow.currentMode === 'edit') {
              $('#saveDropdown')?.classList.toggle('show');
            } else {
              showToast('Open a document in edit mode to save', 'warning');
            }
            break;
          case 'p':
            e.preventDefault();
            triggerPrint();
            break;
          case 'f':
            e.preventDefault();
            window.DocFlow.Find?.toggleFindBar();
            break;
          case 'w':
            e.preventDefault();
            if (window.DocFlow.UI.Tabs.activeId) {
              window.DocFlow.UI.Tabs.close(window.DocFlow.UI.Tabs.activeId);
            }
            break;
          case 'tab':
            e.preventDefault();
            const tabs = window.DocFlow.UI.Tabs.list;
            const currentIdx = tabs.findIndex(t => t.id === window.DocFlow.UI.Tabs.activeId);
            if (currentIdx !== -1) {
              if (e.shiftKey) {
                if (currentIdx > 0) window.DocFlow.UI.Tabs.switchTo(tabs[currentIdx - 1].id);
              } else {
                if (currentIdx < tabs.length - 1) window.DocFlow.UI.Tabs.switchTo(tabs[currentIdx + 1].id);
              }
            }
            break;
        }
      }
    });
  }

  // Standalone Print Handler (File Menu & Ctrl+P)
  function triggerPrint() {
    if (window.DocFlow.currentMode === 'closed' || !window.DocFlow.UI.Tabs.activeId) {
      showToast('Open a document first to print', 'info');
      return;
    }
    window.print();
  }

  // Multi-Page Print Watermark Replicator (Repeats across every printed page via CSS Paged Media fixed viewport)
  window.addEventListener('beforeprint', () => {
    const existing = document.getElementById('dfPrintFixedWatermark');
    if (existing) existing.remove();
    if (window.DocFlow.activeWatermark && window.DocFlow.activeWatermark.text && window.DocFlow.activeWatermark.text !== 'none') {
      const wm = document.createElement('div');
      wm.id = 'dfPrintFixedWatermark';
      wm.className = 'print-watermark-page';
      wm.innerHTML = buildWatermarkHtml(window.DocFlow.activeWatermark);
      document.body.appendChild(wm);
    }
  });

  window.addEventListener('afterprint', () => {
    const wm = document.getElementById('dfPrintFixedWatermark');
    if (wm) wm.remove();
  });

  // Ribbon Tab Switching & Control Coordination
  function switchRibbonTab(tabName) {
    $$('.ribbon-tab-btn').forEach(btn => {
      const isActive = btn.dataset.ribbon === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const panelMap = {
      file: '#ribbonPanelFile',
      home: '#ribbonPanelHome',
      insert: '#ribbonPanelInsert',
      layout: '#ribbonPanelLayout',
      view: '#ribbonPanelView',
      ppt: '#ribbonPanelPpt',
      excel: '#ribbonPanelExcel',
      pdf: '#ribbonPanelPdf'
    };

    $$('.ribbon-panel').forEach(p => p.classList.remove('active'));
    const target = $(panelMap[tabName]);
    if (target) {
      target.classList.add('active');
      if (window.DocFlow?.UI?.balanceRibbonPanel) {
        window.DocFlow.UI.balanceRibbonPanel(target);
      }
    }
  }

  // Zoom Management
  let currentZoom = 100;
  function setEditorZoom(val) {
    currentZoom = Math.min(200, Math.max(50, val));
    const page = $('.editor-page');
    if (page) {
      page.style.transform = `scale(${currentZoom / 100})`;
      page.style.transformOrigin = 'top center';
    }
    const label = $('#editorZoomLabel');
    if (label) label.textContent = `${currentZoom}%`;
  }

  // Document Statistics
  function showDocumentStats() {
    const editor = $('#editor');
    if (!editor) return;

    const text = editor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const charsWithSpaces = text.length;
    const charsWithoutSpaces = text.replace(/\s+/g, '').length;
    const paras = editor.querySelectorAll('p, h1, h2, h3, h4, li').length || (text.trim() ? 1 : 0);
    const readMins = words ? Math.max(1, Math.ceil(words / 200)) : 0;
    const speakMins = words ? Math.max(1, Math.ceil(words / 130)) : 0;

    const statsContent = $('#statsContent');
    if (statsContent) {
      statsContent.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">WORDS</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${words.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">PARAGRAPHS</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${paras.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">CHARACTERS</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${charsWithSpaces.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">NO SPACES</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${charsWithoutSpaces.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">READING TIME</div>
            <div style="font-size:20px;font-weight:700;color:var(--accent);margin-top:2px;">~${readMins} min</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">SPEAKING TIME</div>
            <div style="font-size:20px;font-weight:700;color:var(--accent);margin-top:2px;">~${speakMins} min</div>
          </div>
        </div>
      `;
    }
    openModal('#statsModal');
  }

  // Comprehensive Categorized Symbols Map (Bug 4)
  const CATEGORIZED_SYMBOLS = {
    currency: [
      { s: '$', n: 'Dollar' }, { s: '€', n: 'Euro' }, { s: '£', n: 'Pound' }, { s: '¥', n: 'Yen' },
      { s: '₹', n: 'Rupee' }, { s: '₽', n: 'Ruble' }, { s: '₩', n: 'Won' }, { s: '₿', n: 'Bitcoin' },
      { s: '¢', n: 'Cent' }, { s: '¤', n: 'Currency' }, { s: '₸', n: 'Tenge' }, { s: '₺', n: 'Lira' },
      { s: '₫', n: 'Dong' }, { s: '₴', n: 'Hryvnia' }, { s: '฿', n: 'Baht' }, { s: '₲', n: 'Guarani' },
      { s: '₱', n: 'Peso' }, { s: '₵', n: 'Cedi' }, { s: 'Fr', n: 'Franc' }, { s: '₭', n: 'Kip' }
    ],
    math: [
      { s: '±', n: 'Plus-minus' }, { s: '×', n: 'Multiply' }, { s: '÷', n: 'Divide' }, { s: '=', n: 'Equals' },
      { s: '≠', n: 'Not equal' }, { s: '≈', n: 'Approximately' }, { s: '≤', n: 'Less or equal' }, { s: '≥', n: 'Greater or equal' },
      { s: '∑', n: 'Summation' }, { s: '∏', n: 'Product' }, { s: '√', n: 'Square root' }, { s: '∛', n: 'Cube root' },
      { s: '∞', n: 'Infinity' }, { s: '∫', n: 'Integral' }, { s: '∬', n: 'Double integral' }, { s: '∂', n: 'Partial diff' },
      { s: '∇', n: 'Nabla / Del' }, { s: '∈', n: 'Element of' }, { s: '∉', n: 'Not element of' }, { s: '⊂', n: 'Subset' },
      { s: '⊃', n: 'Superset' }, { s: '∪', n: 'Union' }, { s: '∩', n: 'Intersection' }, { s: '∧', n: 'Logical AND' },
      { s: '∨', n: 'Logical OR' }, { s: '¬', n: 'Negation' }, { s: '⊕', n: 'Circled plus' }, { s: '⊗', n: 'Circled times' },
      { s: '‰', n: 'Per mille' }, { s: '½', n: 'Half' }, { s: '¼', n: 'Quarter' }, { s: '¾', n: 'Three quarters' },
      { s: '⅓', n: 'One third' }, { s: '⅔', n: 'Two thirds' }, { s: '⅛', n: 'One eighth' }, { s: '⅜', n: 'Three eighths' }
    ],
    arrows: [
      { s: '←', n: 'Left arrow' }, { s: '↑', n: 'Up arrow' }, { s: '→', n: 'Right arrow' }, { s: '↓', n: 'Down arrow' },
      { s: '↔', n: 'Left right' }, { s: '↕', n: 'Up down' }, { s: '↖', n: 'North west' }, { s: '↗', n: 'North east' },
      { s: '↘', n: 'South east' }, { s: '↙', n: 'South west' }, { s: '⇐', n: 'Double left' }, { s: '⇒', n: 'Double right' },
      { s: '⇑', n: 'Double up' }, { s: '⇓', n: 'Double down' }, { s: '⇔', n: 'Double left right' }, { s: '➔', n: 'Heavy arrow' },
      { s: '➜', n: 'Thick arrow' }, { s: '➞', n: 'Triangle arrow' }, { s: '↺', n: 'Anticlockwise' }, { s: '↻', n: 'Clockwise' }
    ],
    typography: [
      { s: '§', n: 'Section' }, { s: '¶', n: 'Pilcrow / Paragraph' }, { s: '©', n: 'Copyright' }, { s: '®', n: 'Registered' },
      { s: '™', n: 'Trademark' }, { s: '•', n: 'Bullet' }, { s: '◦', n: 'White bullet' }, { s: '‣', n: 'Triangle bullet' },
      { s: '…', n: 'Ellipsis' }, { s: '–', n: 'En dash' }, { s: '—', n: 'Em dash' }, { s: '‘', n: 'Left single quote' },
      { s: '’', n: 'Right single quote' }, { s: '“', n: 'Left double quote' }, { s: '”', n: 'Right double quote' },
      { s: '«', n: 'Left guillemet' }, { s: '»', n: 'Right guillemet' }, { s: '‹', n: 'Single left guillemet' },
      { s: '›', n: 'Single right guillemet' }, { s: '¡', n: 'Inverted exclamation' }, { s: '¿', n: 'Inverted question' },
      { s: '№', n: 'Numero' }, { s: '°', n: 'Degree' }, { s: '℃', n: 'Celsius' }, { s: '℉', n: 'Fahrenheit' }
    ],
    greek: [
      { s: 'α', n: 'alpha' }, { s: 'β', n: 'beta' }, { s: 'γ', n: 'gamma' }, { s: 'δ', n: 'delta' },
      { s: 'ε', n: 'epsilon' }, { s: 'ζ', n: 'zeta' }, { s: 'η', n: 'eta' }, { s: 'θ', n: 'theta' },
      { s: 'ι', n: 'iota' }, { s: 'κ', n: 'kappa' }, { s: 'λ', n: 'lambda' }, { s: 'μ', n: 'mu' },
      { s: 'ν', n: 'nu' }, { s: 'ξ', n: 'xi' }, { s: 'ο', n: 'omicron' }, { s: 'π', n: 'pi' },
      { s: 'ρ', n: 'rho' }, { s: 'σ', n: 'sigma' }, { s: 'τ', n: 'tau' }, { s: 'υ', n: 'upsilon' },
      { s: 'φ', n: 'phi' }, { s: 'χ', n: 'chi' }, { s: 'ψ', n: 'psi' }, { s: 'ω', n: 'omega' },
      { s: 'Γ', n: 'Gamma' }, { s: 'Δ', n: 'Delta' }, { s: 'Θ', n: 'Theta' }, { s: 'Λ', n: 'Lambda' },
      { s: 'Ξ', n: 'Xi' }, { s: 'Π', n: 'Pi' }, { s: 'Σ', n: 'Sigma' }, { s: 'Φ', n: 'Phi' },
      { s: 'Ψ', n: 'Psi' }, { s: 'Ω', n: 'Omega' }
    ],
    shapes: [
      { s: '★', n: 'Black star' }, { s: '☆', n: 'White star' }, { s: '♠', n: 'Spade' }, { s: '♣', n: 'Club' },
      { s: '♥', n: 'Heart' }, { s: '♦', n: 'Diamond' }, { s: '✦', n: 'Four point star' }, { s: '✧', n: 'Sparkle' },
      { s: '✪', n: 'Circled star' }, { s: '✓', n: 'Check' }, { s: '✔', n: 'Heavy check' }, { s: '✕', n: 'Cross' },
      { s: '✖', n: 'Heavy cross' }, { s: '✗', n: 'Ballot cross' }, { s: '✎', n: 'Pencil' }, { s: '✉', n: 'Envelope' },
      { s: '☎', n: 'Phone' }, { s: '✂', n: 'Scissors' }, { s: '✈', n: 'Airplane' }, { s: '☕', n: 'Coffee' },
      { s: '⚡', n: 'Lightning' }, { s: '❄', n: 'Snowflake' }, { s: '☀', n: 'Sun' }, { s: '☁', n: 'Cloud' },
      { s: '◼', n: 'Black square' }, { s: '◻', n: 'White square' }, { s: '▲', n: 'Up triangle' }, { s: '▼', n: 'Down triangle' },
      { s: '◆', n: 'Black diamond' }, { s: '◈', n: 'White diamond' }, { s: '◉', n: 'Fisheye' }, { s: '◌', n: 'Dotted circle' }
    ]
  };

  function initSymbolsModal() {
    const grid = $('#symbolsGrid');
    const searchInput = $('#symbolSearchInput');
    const tabs = $$('.symbol-cat-tab');
    if (!grid) return;

    let currentCategory = 'all';

    function renderSymbols(filter = '') {
      grid.innerHTML = '';
      const query = filter.toLowerCase().trim();

      let symbolList = [];
      if (currentCategory === 'all') {
        Object.values(CATEGORIZED_SYMBOLS).forEach(arr => symbolList.push(...arr));
      } else if (CATEGORIZED_SYMBOLS[currentCategory]) {
        symbolList = CATEGORIZED_SYMBOLS[currentCategory];
      }

      if (query) {
        symbolList = symbolList.filter(item => item.s.includes(query) || item.n.toLowerCase().includes(query));
      }

      if (!symbolList.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No matching symbols found</div>`;
        return;
      }

      symbolList.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'symbol-cell';
        btn.textContent = item.s;
        btn.title = `${item.n} (${item.s})`;
        btn.addEventListener('click', () => {
          if (window.DocFlow.Editor) {
            window.DocFlow.Editor.insertHtmlAtCursor(item.s);
            showToast(`Inserted symbol ${item.s}`, 'info');
          }
          closeModal('#symbolModal');
        });
        grid.appendChild(btn);
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.cat || 'all';
        renderSymbols(searchInput ? searchInput.value : '');
      });
    });

    searchInput?.addEventListener('input', e => {
      renderSymbols(e.target.value);
    });

    renderSymbols();

    $('#symbolCancel')?.addEventListener('click', () => closeModal('#symbolModal'));
    $('#statsCloseBtn')?.addEventListener('click', () => closeModal('#statsModal'));
  }

  // Custom Page Border Modal (Issue 2)
  function initCustomBorderModal() {
    const modal = $('#customPageBorderModal');
    if (!modal) return;

    const closeBtn = $('#customPageBorderCloseBtn');
    const cancelBtn = $('#customBorderCancelBtn');
    const applyBtn = $('#customBorderApplyBtn');
    const removeBtn = $('#customBorderRemoveBtn');

    const lineTypeSelect = $('#customBorderLineType');
    const widthSelect = $('#customBorderWidth');
    const colorInput = $('#customBorderColorInput');
    const colorText = $('#customBorderColorText');
    const radiusSelect = $('#customBorderRadius');
    const previewBox = $('#customBorderPreviewBox');

    function updatePreview() {
      const lineType = lineTypeSelect?.value || 'solid';
      const width = widthSelect?.value || '2px';
      const color = colorInput?.value || '#0284c7';
      const radius = radiusSelect?.value || '0px';
      if (previewBox) {
        previewBox.style.border = `${width} ${lineType} ${color}`;
        previewBox.style.borderRadius = radius;
      }
    }

    closeBtn?.addEventListener('click', () => closeModal('#customPageBorderModal'));
    cancelBtn?.addEventListener('click', () => closeModal('#customPageBorderModal'));

    colorInput?.addEventListener('input', e => {
      if (colorText) colorText.value = e.target.value;
      updatePreview();
    });

    colorText?.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(val) && colorInput) {
        colorInput.value = val;
      }
      updatePreview();
    });

    lineTypeSelect?.addEventListener('change', updatePreview);
    widthSelect?.addEventListener('change', updatePreview);
    radiusSelect?.addEventListener('change', updatePreview);

    applyBtn?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (page) {
        window.DocFlow.Editor?.saveSnapshot?.();
        const lineType = lineTypeSelect?.value || 'solid';
        const width = widthSelect?.value || '2px';
        const color = colorInput?.value || '#0284c7';
        const radius = radiusSelect?.value || '0px';

        page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
        page.style.border = `${width} ${lineType} ${color}`;
        page.style.borderRadius = radius;

        window.DocFlow.Editor?.notifyChange();
        showToast(`Custom border (${width} ${lineType}) applied`, 'success');
      }
      closeModal('#customPageBorderModal');
    });

    removeBtn?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (page) {
        window.DocFlow.Editor?.saveSnapshot?.();
        page.style.border = '';
        page.style.borderRadius = '';
        page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
        window.DocFlow.Editor?.notifyChange();
        showToast('Page border removed', 'info');
      }
      closeModal('#customPageBorderModal');
    });

    updatePreview();
  }

  // Whiteboard & Excalidraw Canvas Studio (Insert Tab -> Draw Tool)
  function initPaintModal() {
    const paintBtn = $('#openPaintModalBtn') || $('#ribbonInsertPaintBtn');
    const canvas = $('#paintCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colorInput = $('#paintColor');
    const fillInput = $('#paintFillColor');
    const transFillCheckbox = $('#paintTransparentFill');
    const brushInput = $('#paintBrushSize');
    const undoBtn = $('#paintUndoBtn');
    const clearBtn = $('#paintClearBtn');
    const cancelBtn = $('#paintCancel');
    const footerCancelBtn = $('#paintFooterCancel');
    const insertBtn = $('#paintInsertBtn');

    const tabExcalidraw = $('#tabExcalidrawStudio');
    const tabCanvas = $('#tabQuickCanvas');
    const excalidrawWrapper = $('#excalidrawWrapper');
    const quickCanvasWrapper = $('#quickCanvasWrapper');

    let excalidrawMounted = false;
    let excalidrawAPI = null;

    function mountExcalidraw() {
      const container = document.getElementById('excalidrawContainer');
      if (!container) return;
      if (window.ExcalidrawLib && window.React && window.ReactDOM) {
        if (!excalidrawMounted) {
          excalidrawMounted = true;
          const loadingEl = document.getElementById('excalidrawLoading');
          if (loadingEl) loadingEl.style.display = 'none';

          try {
            const root = window.ReactDOM.createRoot(container);
            root.render(
              window.React.createElement(window.ExcalidrawLib.Excalidraw, {
                excalidrawAPI: (api) => {
                  excalidrawAPI = api;
                  window.currentExcalidrawAPI = api;
                },
                initialData: {
                  appState: { viewBackgroundColor: '#ffffff' }
                }
              })
            );
          } catch (err) {
            console.warn('Excalidraw mount fallback:', err);
            if (loadingEl) loadingEl.textContent = 'Excalidraw loaded in Quick Canvas mode';
          }
        }
      } else {
        const loadingEl = document.getElementById('excalidrawLoading');
        if (loadingEl) {
          loadingEl.innerHTML = '<span style="color:var(--text-secondary);"><i class="fas fa-info-circle"></i> Excalidraw online engine connecting. Switch to Quick Canvas to sketch immediately.</span>';
        }
      }
    }

    tabExcalidraw?.addEventListener('click', () => {
      tabExcalidraw.classList.add('active');
      tabCanvas?.classList.remove('active');
      if (excalidrawWrapper) excalidrawWrapper.style.display = 'block';
      if (quickCanvasWrapper) quickCanvasWrapper.style.display = 'none';
      mountExcalidraw();
    });

    tabCanvas?.addEventListener('click', () => {
      tabCanvas.classList.add('active');
      tabExcalidraw?.classList.remove('active');
      if (excalidrawWrapper) excalidrawWrapper.style.display = 'none';
      if (quickCanvasWrapper) quickCanvasWrapper.style.display = 'flex';
    });

    paintBtn?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#paintModal');
      setTimeout(mountExcalidraw, 100);
    });

    cancelBtn?.addEventListener('click', () => closeModal('#paintModal'));
    footerCancelBtn?.addEventListener('click', () => closeModal('#paintModal'));

    let activeTool = 'pen';
    let isDrawing = false;
    let startX = 0, startY = 0;
    let snapshot = null;
    let undoStack = [];

    const saveUndo = () => {
      if (undoStack.length > 25) undoStack.shift();
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };

    const resetCanvas = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      undoStack = [];
      saveUndo();
    };
    resetCanvas();

    // Tool switcher buttons
    $$('#paintModal .draw-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#paintModal .draw-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTool = btn.dataset.tool || 'pen';
        showToast(`Tool: ${activeTool.toUpperCase()}`, 'info');
      });
    });

    undoBtn?.addEventListener('click', () => {
      if (undoStack.length > 1) {
        undoStack.pop(); // Remove current state
        const prev = undoStack[undoStack.length - 1];
        ctx.putImageData(prev, 0, 0);
        showToast('Undo performed', 'info');
      } else {
        showToast('Nothing to undo', 'info');
      }
    });

    clearBtn?.addEventListener('click', () => {
      resetCanvas();
      showToast('Canvas cleared', 'info');
    });

    cancelBtn?.addEventListener('click', () => closeModal('#paintModal'));

    paintBtn?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#paintModal');
    });

    const getPos = e => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const drawArrow = (fromX, fromY, toX, toY, width, color) => {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const headLen = Math.max(12, width * 3);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const startDraw = e => {
      isDrawing = true;
      const pos = getPos(e);
      startX = pos.x;
      startY = pos.y;
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (activeTool === 'pen' || activeTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
      }
    };

    const draw = e => {
      if (!isDrawing) return;
      const pos = getPos(e);
      const strokeColor = colorInput ? colorInput.value : '#1e293b';
      const fillColor = fillInput ? fillInput.value : '#fef08a';
      const isTransparent = transFillCheckbox ? transFillCheckbox.checked : true;
      const width = parseInt(brushInput?.value, 10) || 3;

      if (activeTool === 'pen') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (activeTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = width * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        // Shapes preview: restore canvas before drawing live preview
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (activeTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else if (activeTool === 'arrow') {
          drawArrow(startX, startY, pos.x, pos.y, width, strokeColor);
        } else if (activeTool === 'rect') {
          const w = pos.x - startX;
          const h = pos.y - startY;
          if (!isTransparent) ctx.fillRect(startX, startY, w, h);
          ctx.strokeRect(startX, startY, w, h);
        } else if (activeTool === 'diamond') {
          const midX = (startX + pos.x) / 2;
          const midY = (startY + pos.y) / 2;
          ctx.beginPath();
          ctx.moveTo(midX, startY);
          ctx.lineTo(pos.x, midY);
          ctx.lineTo(midX, pos.y);
          ctx.lineTo(startX, midY);
          ctx.closePath();
          if (!isTransparent) ctx.fill();
          ctx.stroke();
        } else if (activeTool === 'ellipse') {
          const rx = Math.abs(pos.x - startX) / 2;
          const ry = Math.abs(pos.y - startY) / 2;
          const cx = (startX + pos.x) / 2;
          const cy = (startY + pos.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
          if (!isTransparent) ctx.fill();
          ctx.stroke();
        }
      }
    };

    const stopDraw = () => {
      if (!isDrawing) return;
      isDrawing = false;
      const strokeColor = colorInput ? colorInput.value : '#1e293b';

      if (activeTool === 'text') {
        const text = prompt('Enter text for label:');
        if (text && text.trim()) {
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.fillStyle = strokeColor;
          ctx.fillText(text.trim(), startX, startY);
        }
      } else if (activeTool === 'note') {
        const note = prompt('Enter sticky note text:');
        if (note && note.trim()) {
          const nw = 140, nh = 90;
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.5;
          ctx.fillRect(startX, startY, nw, nh);
          ctx.strokeRect(startX, startY, nw, nh);
          ctx.font = '13px Inter, sans-serif';
          ctx.fillStyle = '#1c1917';
          ctx.fillText(note.trim().slice(0, 30), startX + 10, startY + 28);
          if (note.trim().length > 30) {
            ctx.fillText(note.trim().slice(30, 60), startX + 10, startY + 48);
          }
        }
      }
      saveUndo();
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', e => { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); draw(e); }, { passive: false });
    window.addEventListener('touchend', stopDraw);

    insertBtn?.addEventListener('click', async () => {
      // If Excalidraw Studio tab is active, export from official Excalidraw API
      if (tabExcalidraw?.classList.contains('active') && excalidrawAPI && window.ExcalidrawLib) {
        try {
          const elements = excalidrawAPI.getSceneElements();
          const files = excalidrawAPI.getFiles();
          if (elements && elements.length > 0) {
            const canvasEl = await window.ExcalidrawLib.exportToCanvas({
              elements,
              files,
              appState: { exportWithDarkMode: false, exportBackground: true }
            });
            const dataUrl = canvasEl.toDataURL('image/png');
            closeModal('#paintModal');
            if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
              window.DocFlow.ImageManager.insertImageIntoDocument(dataUrl, 'Excalidraw Whiteboard');
            } else {
              window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${dataUrl}" alt="Excalidraw Whiteboard" data-wrap="inline" style="max-width:100%;height:auto;"><p><br></p>`);
            }
            showToast('Excalidraw whiteboard diagram inserted into document', 'success');
            return;
          }
        } catch (err) {
          console.warn('Excalidraw export fallback to canvas:', err);
        }
      }

      // Quick Canvas export
      closeModal('#paintModal');
      const dataUrl = canvas.toDataURL('image/png');
      if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
        window.DocFlow.ImageManager.insertImageIntoDocument(dataUrl, 'Excalidraw Diagram');
      } else {
        window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${dataUrl}" alt="Excalidraw Diagram" data-wrap="inline" style="max-width:100%;height:auto;"><p><br></p>`);
      }
      showToast('Whiteboard diagram inserted into document', 'success');
    });
  }

  // Animated GIF Search and Insertion Modal (Enhanced Responsive Search & Direct URL)
  function initGifModal() {
    const gifBtn = $('#ribbonInsertGifBtn');
    const gifModal = $('#gifModal');
    const searchInput = $('#gifSearchInput');
    const clearSearchBtn = $('#gifClearSearchBtn');
    const searchBtn = $('#gifSearchBtn');
    const gifGrid = $('#gifGrid');
    const closeBtn = $('#gifModalClose');
    const cancelBtn = $('#gifCancel');

    const tabBrowse = $('#gifTabBrowse');
    const tabUrl = $('#gifTabUrl');
    const searchBarSection = $('#gifSearchBarSection');
    const tagChipsSection = $('#gifTagChips');
    const urlSection = $('#gifUrlSection');
    const directUrlInput = $('#gifDirectUrlInput');
    const directUrlPreview = $('#gifUrlPreview');
    const insertDirectBtn = $('#gifInsertDirectBtn');

    if (!gifModal || !gifGrid) return;

    // Comprehensive Curated Library of animated GIFs
    const CURATED_GIFS = [
      // Trending
      { url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif', title: 'Thumbs Up', tags: ['trending', 'thumbs up', 'good', 'yes', 'ok'] },
      { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', title: 'Clapping Hands', tags: ['trending', 'congratulations', 'clap', 'applause', 'bravo'] },
      { url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', title: 'Great Job', tags: ['trending', 'thumbs up', 'approve', 'congrats'] },
      { url: 'https://media.giphy.com/media/d20PG6M63A3dVd2U/giphy.gif', title: 'Excited Yay', tags: ['trending', 'celebration', 'happy', 'yay', 'excited'] },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Confetti Party', tags: ['trending', 'celebration', 'party', 'confetti'] },
      { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', title: 'Thinking Pose', tags: ['trending', 'thinking', 'hmm', 'smart', 'idea'] },

      // Cats
      { url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', title: 'Cat Typing Fast', tags: ['cat', 'cats', 'work', 'typing', 'coding', 'computer'] },
      { url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', title: 'Cute Cat Wave', tags: ['cat', 'cats', 'welcome', 'cute', 'hello', 'wave'] },
      { url: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif', title: 'Cat High Five', tags: ['cat', 'cats', 'thumbs up', 'high five', 'cool', 'yes'] },
      { url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', title: 'Cat Party', tags: ['cat', 'cats', 'celebration', 'dance', 'party'] },
      { url: 'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif', title: 'Sleepy Cat', tags: ['cat', 'cats', 'tired', 'sleep', 'rest'] },

      // Dogs
      { url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif', title: 'Happy Dog Tail', tags: ['dog', 'dogs', 'happy', 'cute', 'excited'] },
      { url: 'https://media.giphy.com/media/bbshzgyFQDqPHXBo4c/giphy.gif', title: 'Dog Typing', tags: ['dog', 'dogs', 'work', 'typing', 'computer'] },
      { url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', title: 'Dog Smiling', tags: ['dog', 'dogs', 'happy', 'smile', 'thumbs up'] },

      // Celebration & Congrats
      { url: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif', title: 'Celebration Dance', tags: ['celebration', 'party', 'dance', 'fun', 'happy'] },
      { url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', title: 'Cheers Toast', tags: ['celebration', 'congratulations', 'cheers', 'drink'] },
      { url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', title: 'Standing Ovation', tags: ['congratulations', 'applause', 'clap', 'bravo'] },
      { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', title: 'Super Excited', tags: ['celebration', 'excited', 'yay', 'happy'] },

      // Thumbs Up & Yes
      { url: 'https://media.giphy.com/media/10UeedrT5MIfPG/giphy.gif', title: 'Nodding Yes', tags: ['thumbs up', 'yes', 'agree', 'nod'] },
      { url: 'https://media.giphy.com/media/NEvPzZ8bdvtxG/giphy.gif', title: 'Approval Nod', tags: ['thumbs up', 'yes', 'approve', 'agree'] },
      { url: 'https://media.giphy.com/media/diUKszNTUghVe/giphy.gif', title: 'Double Thumbs Up', tags: ['thumbs up', 'yes', 'great', 'awesome'] },

      // Work & Coffee
      { url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif', title: 'Typing Hard', tags: ['work', 'typing', 'busy', 'computer', 'coding'] },
      { url: 'https://media.giphy.com/media/o0vwzuFwCGAFO/giphy.gif', title: 'Coffee Sip', tags: ['coffee', 'work', 'morning', 'drink'] },
      { url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', title: 'Need Coffee', tags: ['coffee', 'morning', 'energy', 'work'] },

      // Dance & Fun
      { url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', title: 'Happy Dance', tags: ['dance', 'fun', 'happy', 'music'] },
      { url: 'https://media.giphy.com/media/DhstvI3zZ598A/giphy.gif', title: 'Groovy Moves', tags: ['dance', 'party', 'music', 'fun'] },
      { url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', title: 'Dancing Celebration', tags: ['dance', 'party', 'fun'] },

      // Thinking & Smart
      { url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif', title: 'Smart Thinking', tags: ['thinking', 'smart', 'idea', 'brain'] },
      { url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif', title: 'Pondering Idea', tags: ['thinking', 'hmm', 'question', 'idea'] },

      // Welcome & Thank You
      { url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif', title: 'Welcome Wave', tags: ['welcome', 'hello', 'hi', 'wave'] },
      { url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif', title: 'Friendly Wave', tags: ['welcome', 'hello', 'wave'] },
      { url: 'https://media.giphy.com/media/osAcIGJnYE0VU76L63/giphy.gif', title: 'Thank You Bow', tags: ['thank you', 'thanks', 'gratitude'] },
      { url: 'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif', title: 'Many Thanks', tags: ['thank you', 'thanks', 'grateful'] },

      // Loading
      { url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', title: 'Loading Spinner', tags: ['loading', 'wait', 'spinner', 'progress'] }
    ];

    function renderGifs(list) {
      gifGrid.innerHTML = '';
      if (!list || !list.length) {
        gifGrid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--text-muted);font-size:12.5px;">
            <i class="fas fa-magnifying-glass" style="font-size:24px;margin-bottom:8px;opacity:0.5;display:block;"></i>
            No animated GIFs found. Try searching keywords like <strong>cat, thumbs up, celebration, work, dance</strong>, or paste a GIF URL above.
          </div>`;
        return;
      }
      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gif-card';
        card.style.cssText = 'cursor:pointer;border-radius:6px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;height:105px;border:1px solid var(--border);transition:transform 0.15s ease, box-shadow 0.15s ease;position:relative;';
        card.title = item.title || 'Click to insert';
        card.innerHTML = `<img src="${item.url}" alt="${escHtml(item.title || 'GIF')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`;

        card.addEventListener('mouseenter', () => {
          card.style.transform = 'scale(1.03)';
          card.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'scale(1)';
          card.style.boxShadow = 'none';
        });

        card.addEventListener('click', () => {
          closeModal('#gifModal');
          if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
            window.DocFlow.ImageManager.insertImageIntoDocument(item.url, item.title || 'Animated GIF');
          } else {
            window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${item.url}" alt="${escHtml(item.title)}" data-wrap="inline" style="max-width:100%;"><p><br></p>`);
          }
          showToast('Animated GIF inserted into document', 'success');
        });
        gifGrid.appendChild(card);
      });
    }

    function searchCuratedGifs(query) {
      const q = query.toLowerCase().trim();
      if (!q || q === 'trending') return CURATED_GIFS;

      return CURATED_GIFS.filter(item => {
        if (item.title.toLowerCase().includes(q)) return true;
        return item.tags.some(t => t.includes(q) || q.includes(t));
      });
    }

    async function searchNetworkGifs(query) {
      const q = query.trim();
      gifGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--text-muted);font-size:12.5px;">
          <i class="fas fa-spinner fa-spin" style="margin-right:6px;color:var(--accent);"></i> Searching GIFs for "${escHtml(q)}"...
        </div>`;

      const curatedMatches = searchCuratedGifs(q);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(q)}&limit=16`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && data.data.length) {
            const results = data.data.map(g => ({
              url: g.images.fixed_height.url || g.images.original.url,
              title: g.title || q
            }));
            renderGifs(results);
            return;
          }
        }
      } catch (e) { }

      renderGifs(curatedMatches.length ? curatedMatches : CURATED_GIFS.slice(0, 8));
    }

    tabBrowse?.addEventListener('click', () => {
      tabBrowse.classList.add('active');
      tabUrl?.classList.remove('active');
      if (searchBarSection) searchBarSection.style.display = 'flex';
      if (tagChipsSection) tagChipsSection.style.display = 'flex';
      if (urlSection) urlSection.style.display = 'none';
      if (gifGrid) gifGrid.style.display = 'grid';
    });

    tabUrl?.addEventListener('click', () => {
      tabUrl.classList.add('active');
      tabBrowse?.classList.remove('active');
      if (searchBarSection) searchBarSection.style.display = 'none';
      if (tagChipsSection) tagChipsSection.style.display = 'none';
      if (urlSection) urlSection.style.display = 'flex';
      if (gifGrid) gifGrid.style.display = 'none';
    });

    directUrlInput?.addEventListener('input', () => {
      const url = directUrlInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        if (directUrlPreview) {
          directUrlPreview.style.display = 'flex';
          directUrlPreview.innerHTML = `<img src="${url}" alt="GIF Preview" style="max-height:140px;max-width:100%;object-fit:contain;" onerror="this.parentElement.style.display='none';">`;
        }
      } else {
        if (directUrlPreview) directUrlPreview.style.display = 'none';
      }
    });

    insertDirectBtn?.addEventListener('click', () => {
      const url = directUrlInput?.value.trim();
      if (!url) {
        showToast('Please enter a GIF image URL', 'warning');
        return;
      }
      closeModal('#gifModal');
      if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
        window.DocFlow.ImageManager.insertImageIntoDocument(url, 'Animated GIF');
      } else {
        window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${url}" alt="Animated GIF" data-wrap="inline" style="max-width:100%;"><p><br></p>`);
      }
      showToast('Animated GIF inserted from URL', 'success');
      if (directUrlInput) directUrlInput.value = '';
      if (directUrlPreview) directUrlPreview.style.display = 'none';
    });

    gifBtn?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#gifModal');
      tabBrowse?.click();
      renderGifs(CURATED_GIFS);
    });

    searchBtn?.addEventListener('click', () => {
      const q = searchInput?.value.trim();
      if (q) searchNetworkGifs(q);
      else renderGifs(CURATED_GIFS);
    });

    searchInput?.addEventListener('input', () => {
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
      }
    });

    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      renderGifs(CURATED_GIFS);
    });

    searchInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchBtn?.click();
      }
    });

    $$('#gifModal .gif-tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('#gifModal .gif-tag-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const tag = chip.dataset.tag || 'trending';
        if (searchInput) {
          searchInput.value = tag === 'trending' ? '' : tag;
          if (clearSearchBtn) clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
        }
        searchNetworkGifs(tag);
      });
    });

    closeBtn?.addEventListener('click', () => closeModal('#gifModal'));
    cancelBtn?.addEventListener('click', () => closeModal('#gifModal'));
  }

  // Direct Document Creator for Ribbon Office Formats (Word, Excel, PPT, PDF - Bug 2)
  function createNewDocDirect(ext, docTitle) {
    let content = '<p><br></p>';
    if (ext === 'xlsx') {
      content = window.DocFlow.FileIO?.createBlankExcelGrid(50, 50) || '<p>Spreadsheet Document</p>';
    } else if (ext === 'pptx') {
      content = window.DocFlow.FileIO?.createBlankPresentation() || '<p>Presentation Document</p>';
    } else if (ext === 'docx') {
      content = '<p><br></p>';
    } else if (ext === 'pdf') {
      openModal('#pdfMergeModal');
      return;
    }

    const fullName = `${docTitle}.${ext}`;
    const tab = window.DocFlow.UI.Tabs.create(fullName, content, ext.toUpperCase(), 'edit');
    window.DocFlow.UI.Tabs.activateTab(tab);

    if (ext === 'xlsx') {
      setTimeout(setupExcelInteractions, 50);
    }

    Recent.add({
      name: fullName,
      type: ext.toUpperCase(),
      mode: 'edit',
      content: content
    });

    showToast(`Created new document "${fullName}"`, 'success');
  }

  // Office & Embed Helpers (PPT Outside/Nested Slides, Charts, Presentation Slideshow, Excel Sheet Protection)
  function isPptxDocument() {
    const activeTab = window.DocFlow?.UI?.Tabs?.get(window.DocFlow?.UI?.Tabs?.activeId);
    if (!activeTab) return false;
    const name = (activeTab.name || '').toLowerCase();
    const type = (activeTab.fileType || '').toLowerCase();
    return name.endsWith('.pptx') || name.endsWith('.ppt') || type === 'pptx' || type === 'ppt';
  }

  // PowerPoint Slide Deck Management & Sidebar (Issue 5)
  let currentActiveSlideIndex = 0;

  function updatePptSidebar() {
    const isPpt = isPptxDocument();
    const sidebar = $('#pptxSlideSidebar');
    const editor = $('#editor');
    if (!editor) return;

    if (!isPpt) {
      if (sidebar) sidebar.style.display = 'none';
      editor.classList.remove('is-pptx-deck');
      editor.querySelectorAll('.pptx-slide-wrapper').forEach(w => w.style.display = '');
      return;
    }

    if (sidebar) sidebar.style.display = 'flex';
    editor.classList.add('is-pptx-deck');

    let slideWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));

    if (slideWrappers.length === 0) {
      const bareCards = Array.from(editor.querySelectorAll('.pptx-slide-card'));
      if (bareCards.length > 0) {
        bareCards.forEach(card => {
          if (!card.closest('.pptx-slide-wrapper')) {
            const wrap = document.createElement('div');
            wrap.className = 'pptx-slide-wrapper';
            wrap.style.cssText = 'position:relative;margin:28px auto;max-width:850px;';
            card.parentNode.insertBefore(wrap, card);
            wrap.appendChild(card);
          }
        });
        slideWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
      }
    }

    if (slideWrappers.length === 0) {
      editor.innerHTML = createEmptySlideHtml();
      slideWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    }

    currentActiveSlideIndex = Math.max(0, Math.min(currentActiveSlideIndex, slideWrappers.length - 1));

    const slideCountEl = $('#pptxSlideCount');
    if (slideCountEl) slideCountEl.textContent = slideWrappers.length;

    // Display ONLY the slide selected by the user, not all slides at once (Issue 5)
    slideWrappers.forEach((w, idx) => {
      if (idx === currentActiveSlideIndex) {
        w.style.display = 'block';
        w.classList.add('active-slide');
      } else {
        w.style.display = 'none';
        w.classList.remove('active-slide');
      }
    });

    // Populate Sidebar Thumbnails
    const thumbsContainer = $('#pptxSidebarThumbnails');
    if (thumbsContainer) {
      if (!thumbsContainer._delegated) {
        thumbsContainer._delegated = true;
        thumbsContainer.addEventListener('click', e => {
          const delBtn = e.target.closest('.pptx-thumbnail-delete-btn');
          if (delBtn) {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.deleteIdx, 10);
            deletePptSlide(idx);
            return;
          }
          const thumb = e.target.closest('.pptx-thumbnail-item');
          if (thumb) {
            const idx = parseInt(thumb.dataset.slideIndex, 10);
            if (!isNaN(idx)) selectPptSlide(idx);
          }
        });
      }
      thumbsContainer.innerHTML = '';
      slideWrappers.forEach((w, idx) => {
        const card = w.querySelector('.pptx-slide-card') || w;
        const titleText = card.querySelector('.pptx-slide-title, .slide-title-box, h1, h2, h3, h4')?.textContent.trim() || `Slide ${idx + 1}`;
        const snippetText = (card.innerText || '').replace(titleText, '').trim().substring(0, 60);

        const thumb = document.createElement('div');
        thumb.className = `pptx-thumbnail-item ${idx === currentActiveSlideIndex ? 'active' : ''}`;
        thumb.dataset.slideIndex = idx;
        thumb.innerHTML = `
          <div class="pptx-thumbnail-num">${idx + 1}</div>
          <div class="pptx-thumbnail-card-wrap">
            <div class="pptx-thumbnail-preview">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(titleText)}</div>
              <div style="font-size:7.5px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(snippetText || 'Empty slide')}</div>
            </div>
            <button class="pptx-thumbnail-delete-btn" data-delete-idx="${idx}" title="Delete slide ${idx + 1}">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        `;
        thumbsContainer.appendChild(thumb);
      });
    }
  }

  function selectPptSlide(index) {
    currentActiveSlideIndex = index;
    updatePptSidebar();
    const editor = $('#editor');
    if (editor) {
      const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
      const activeWrapper = slides[currentActiveSlideIndex];
      if (activeWrapper) {
        activeWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const focusable = activeWrapper.querySelector('.slide-title-box, .slide-content-box, [contenteditable="true"]') || activeWrapper.querySelector('.pptx-slide-card');
        if (focusable) {
          focusable.focus();
          clearSlidePlaceholder(activeWrapper.querySelector('.pptx-slide-card'));
        }
      }
    }
  }

  function deletePptSlide(index) {
    const editor = $('#editor');
    if (!editor) return;
    const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    if (index >= 0 && index < slides.length) {
      if (slides.length <= 1) {
        showToast('Presentation must have at least one slide', 'warning');
        return;
      }
      // Save Undo snapshot so Ctrl+Z restores deleted slide
      window.DocFlow.Editor?.saveSnapshot?.();
      slides[index].remove();
      if (currentActiveSlideIndex >= slides.length - 1) {
        currentActiveSlideIndex = Math.max(0, slides.length - 2);
      }
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('Slide deleted. Press Ctrl+Z to undo', 'info');
    }
  }

  function duplicatePptSlide() {
    const editor = $('#editor');
    if (!editor) return;
    const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    if (currentActiveSlideIndex >= 0 && currentActiveSlideIndex < slides.length) {
      window.DocFlow.Editor?.saveSnapshot?.();
      const current = slides[currentActiveSlideIndex];
      const clone = current.cloneNode(true);
      current.insertAdjacentElement('afterend', clone);
      window.DocFlow.Editor?.notifyChange();
      selectPptSlide(currentActiveSlideIndex + 1);
      showToast('Slide duplicated', 'success');
    }
  }

  function movePptSlide(direction) {
    const editor = $('#editor');
    if (!editor) return;
    const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    const idx = currentActiveSlideIndex;
    if (direction === -1 && idx > 0) {
      window.DocFlow.Editor?.saveSnapshot?.();
      slides[idx - 1].insertAdjacentElement('beforebegin', slides[idx]);
      selectPptSlide(idx - 1);
      window.DocFlow.Editor?.notifyChange();
    } else if (direction === 1 && idx < slides.length - 1) {
      window.DocFlow.Editor?.saveSnapshot?.();
      slides[idx + 1].insertAdjacentElement('afterend', slides[idx]);
      selectPptSlide(idx + 1);
      window.DocFlow.Editor?.notifyChange();
    }
  }

  function createEmptySlideHtml(layout = 'blank') {
    let bodyContent = `<p class="slide-placeholder-text" style="color:var(--text-muted);font-style:italic;margin:0;">Empty slide. Click here or use the "+" button at top-right to add rectangle, shapes, or bullet points...</p>`;
    if (layout === 'title') {
      bodyContent = `<div class="slide-title-box" contenteditable="true" style="font-size:32px;font-weight:700;color:var(--text-primary);text-align:center;padding:24px 16px 8px;min-height:50px;">Presentation Title</div><div class="slide-content-box" contenteditable="true" style="font-size:18px;color:var(--text-muted);text-align:center;padding:8px 16px;min-height:36px;">Subtitle / Presenter Name</div>`;
    } else if (layout === 'title-box') {
      bodyContent = `<div class="slide-title-box" contenteditable="true" style="font-size:26px;font-weight:700;color:var(--text-primary);border:1.5px dashed var(--border);border-radius:6px;padding:12px 16px;margin-bottom:18px;min-height:50px;">Click to add Title</div><div class="slide-content-box" contenteditable="true" style="font-size:16px;line-height:1.6;color:var(--text-secondary);border:1.5px dashed var(--border);border-radius:6px;padding:16px;min-height:180px;">Click to add text, bullet points, or paste content...</div>`;
    } else if (layout === 'split') {
      bodyContent = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0;min-height:220px;"><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Left Column</h4><p>Click to edit...</p></div><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Right Column</h4><p>Click to edit...</p></div></div>`;
    } else if (layout === 'cards') {
      bodyContent = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:12px 0;min-height:180px;"><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 1</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 2</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 3</h4><p>Details...</p></div></div>`;
    }

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
            <button class="slide-plus-menu-item" data-action="layout-title-box"><i class="fas fa-table-cells-large" style="color:#ea580c;"></i> Title & Box</button>
            <button class="slide-plus-menu-item" data-action="layout-blank"><i class="fas fa-square" style="color:#94a3b8;"></i> Blank Canvas</button>
            <button class="slide-plus-menu-item" data-action="layout-split"><i class="fas fa-columns" style="color:#f59e0b;"></i> Split 2 Columns</button>
            <button class="slide-plus-menu-item" data-action="layout-cards"><i class="fas fa-table-cells-large" style="color:#06b6d4;"></i> 3 Card Blocks</button>
            <div class="slide-plus-menu-sep"></div>
            <button class="slide-plus-menu-item" data-action="bg-image"><i class="fas fa-image" style="color:#10b981;"></i> Background Image</button>
            <div class="slide-plus-menu-sep"></div>
            <button class="slide-plus-menu-item slide-plus-next-btn" data-action="add-next-slide"><i class="fas fa-circle-plus" style="color:#ea580c;"></i> Add Next Slide</button>
          </div>
        </div>
        <div class="pptx-slide-card" contenteditable="true" style="aspect-ratio:16/9;width:100%;min-height:360px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);outline:none;position:relative;box-sizing:border-box;">
          ${bodyContent}
        </div>
      </div><p><br></p>`;
  }

  function insertPptSlide(isNested = false, layout = 'blank') {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    if (!isPptxDocument()) {
      showToast('PPT slides can only be added to PowerPoint (.pptx) documents', 'warning');
      return;
    }

    const sel = window.getSelection();
    let parentWrapper = null;
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      parentWrapper = node.closest('.pptx-slide-wrapper') || node.closest('.pptx-slide-card');
    }
    const slides = Array.from(document.querySelectorAll('#editor .pptx-slide-wrapper'));
    if (!parentWrapper && slides.length > 0) {
      parentWrapper = slides[currentActiveSlideIndex] || slides[slides.length - 1];
    }

    window.DocFlow.Editor?.saveSnapshot?.();

    if (!isNested && parentWrapper) {
      const topWrapper = parentWrapper.closest('.pptx-slide-wrapper') || parentWrapper;
      const slidesList = Array.from(document.querySelectorAll('#editor .pptx-slide-wrapper'));
      const curIdx = slidesList.indexOf(topWrapper);
      topWrapper.insertAdjacentHTML('afterend', createEmptySlideHtml(layout));
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      selectPptSlide(curIdx >= 0 ? curIdx + 1 : currentActiveSlideIndex + 1);
      showToast('New Presentation Slide added', 'success');
    } else if (isNested && parentWrapper) {
      const card = parentWrapper.querySelector('.pptx-slide-card') || parentWrapper;
      clearSlidePlaceholder(card);
      card.insertAdjacentHTML('beforeend', `
        <div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:18px;margin:12px 0;background:var(--bg-primary);box-shadow:var(--shadow-sm);">
          <h4 style="margin:0 0 8px;color:var(--text-primary);font-size:16px;">Nested Card Title</h4>
          <p style="margin:0;color:var(--text-secondary);font-size:14px;">Nested card content...</p>
        </div><p><br></p>`);
      window.DocFlow.Editor?.notifyChange();
      showToast('Nested Slide Card added (Inside)', 'success');
    } else {
      const editor = $('#editor');
      if (editor) {
        editor.insertAdjacentHTML('beforeend', createEmptySlideHtml(layout));
        window.DocFlow.Editor?.notifyChange();
        updatePptSidebar();
        const count = editor.querySelectorAll('.pptx-slide-wrapper').length;
        selectPptSlide(Math.max(0, count - 1));
        showToast('Presentation slide inserted', 'success');
      }
    }
  }

  function clearSlidePlaceholder(slideCard) {
    if (!slideCard) return;
    const hint = slideCard.querySelector('.slide-placeholder-text');
    if (hint) {
      hint.remove();
      if (!slideCard.innerHTML.trim() || slideCard.innerHTML === '<p></p>') {
        slideCard.innerHTML = '<p><br></p>';
      }
      window.DocFlow.Editor?.notifyChange();
    }
  }

  function setupSlideInteractions() {
    const editor = $('#editor');
    if (!editor) return;

    editor.addEventListener('click', e => {
      const plusBtn = e.target.closest('.slide-plus-action-btn');
      if (plusBtn) {
        e.preventDefault();
        e.stopPropagation();
        const actionBar = plusBtn.closest('.slide-quick-action-bar');
        const menu = actionBar?.querySelector('.slide-plus-menu');
        document.querySelectorAll('.slide-plus-menu.open').forEach(m => {
          if (m !== menu) m.classList.remove('open');
        });
        if (menu) menu.classList.toggle('open');
        return;
      }

      const menuItem = e.target.closest('.slide-plus-menu-item, .slide-shape-quick-btn');
      if (menuItem) {
        e.preventDefault();
        e.stopPropagation();
        const wrapper = menuItem.closest('.pptx-slide-wrapper');
        const slideCard = wrapper?.querySelector('.pptx-slide-card');
        const menu = menuItem.closest('.slide-plus-menu');
        if (menu) menu.classList.remove('open');
        if (!slideCard) return;

        handleSlideAction(menuItem, wrapper, slideCard);
        return;
      }

      if (!e.target.closest('.slide-quick-action-bar')) {
        document.querySelectorAll('.slide-plus-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    // Instant placeholder removal on any user interaction with slide cards (Issue 4)
    editor.addEventListener('pointerdown', e => {
      if (isPptxDocument()) {
        const slideCard = e.target.closest('.pptx-slide-card');
        if (slideCard) {
          clearSlidePlaceholder(slideCard);
          return;
        }
        if (e.target.closest('.slide-quick-action-bar') || e.target.closest('.slide-speaker-notes') || e.target.closest('#pptxSlideSidebar')) {
          return;
        }
        // Clicked outside slide in PPT deck: prevent caret placement outside slide cards
        e.preventDefault();
        const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
        const curSlide = slides[currentActiveSlideIndex] || slides[0];
        const focusTarget = curSlide?.querySelector('.slide-title-box, .slide-content-box, [contenteditable="true"]') || curSlide?.querySelector('.pptx-slide-card');
        if (focusTarget) {
          focusTarget.focus();
          clearSlidePlaceholder(focusTarget.closest('.pptx-slide-card'));
        }
      }
    });

    editor.addEventListener('focusin', e => {
      const slideCard = e.target.closest('.pptx-slide-card');
      if (slideCard) {
        clearSlidePlaceholder(slideCard);
      }
    });

    editor.addEventListener('beforeinput', e => {
      const slideCard = e.target.closest('.pptx-slide-card');
      if (slideCard) {
        clearSlidePlaceholder(slideCard);
      }
    });

    editor.addEventListener('keydown', e => {
      const slideCard = e.target.closest('.pptx-slide-card');
      if (slideCard) {
        clearSlidePlaceholder(slideCard);
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.slide-quick-action-bar')) {
        document.querySelectorAll('.slide-plus-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    // Keyboard Arrow navigation between PPT slides (Issue 5)
    document.addEventListener('keydown', e => {
      if (isPptxDocument()) {
        const activeEl = document.activeElement;
        const isEditingText = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl.isContentEditable && activeEl.closest('.slide-freeform-rect, .slide-nested-card, .slide-title-box, .slide-content-box, p, h1, h2, h3')));
        if (!isEditingText) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
            e.preventDefault();
            const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
            if (currentActiveSlideIndex < slides.length - 1) {
              selectPptSlide(currentActiveSlideIndex + 1);
            }
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            if (currentActiveSlideIndex > 0) {
              selectPptSlide(currentActiveSlideIndex - 1);
            }
          }
        }
      }
    });

    // Freeform drag for slide content boxes extending beyond slide boundaries (Issue 5)
    editor.addEventListener('mousedown', e => {
      const box = e.target.closest('.slide-freeform-rect, .slide-nested-card');
      if (!box || !editor.contains(box)) return;

      const rect = box.getBoundingClientRect();
      const isTopHandle = (e.clientY - rect.top) < 18;
      const isBorder = (e.clientX - rect.left) < 12 || (rect.right - e.clientX) < 12 || (rect.bottom - e.clientY) < 12;
      if (!isTopHandle && !isBorder && !e.altKey) return;

      e.preventDefault();
      e.stopPropagation();

      box.setAttribute('data-dragging', 'true');
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(box.style.left) || 0;
      const startTop = parseFloat(box.style.top) || 0;

      const onMouseMove = ev => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        box.style.position = 'relative';
        box.style.left = `${startLeft + dx}px`;
        box.style.top = `${startTop + dy}px`;
      };

      const onMouseUp = () => {
        box.removeAttribute('data-dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.DocFlow.Editor?.notifyChange();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Add Slide button on PPT Sidebar (Issue 3: Shows dropdown and performs layout insertion)
    const pptSidebarAddBtn = $('#pptxSidebarAddBtn');
    const pptSidebarAddPopover = $('#pptxSidebarAddPopover');
    if (pptSidebarAddBtn) {
      pptSidebarAddBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (pptSidebarAddPopover) {
          pptSidebarAddPopover.classList.toggle('show');
        } else {
          insertPptSlide(false);
        }
      });
    }

    $$('#pptxSidebarAddPopover .spacing-opt-item[data-ppt-layout]').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const layout = item.dataset.pptLayout || 'blank';
        insertPptSlide(false, layout);
        pptSidebarAddPopover?.classList.remove('show');
      });
    });

    // Directly click slide inside editor to activate it and select its thumbnail
    editor.addEventListener('click', e => {
      const wrapper = e.target.closest('.pptx-slide-wrapper');
      if (wrapper && !e.target.closest('.slide-plus-action-btn, .slide-plus-menu')) {
        const allWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
        const idx = allWrappers.indexOf(wrapper);
        if (idx !== -1 && idx !== currentActiveSlideIndex) {
          selectPptSlide(idx);
        }
      }
    });
  }

  function handleSlideAction(item, wrapper, slideCard) {
    slideCard.querySelector('.slide-placeholder-text')?.remove();

    const action = item.dataset.action;
    const shape = item.dataset.shape;

    if (action === 'rect') {
      const rectHtml = `<div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--accent, #ea580c);border-radius:8px;padding:16px;margin:12px 0;background:var(--bg-tertiary);min-height:50px;">Rectangle Box (Click to edit text)</div><p><br></p>`;
      slideCard.insertAdjacentHTML('beforeend', rectHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Rectangle added to slide', 'success');
    } else if (action === 'nested-rect') {
      const nestedHtml = `<div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:18px;margin:12px 0;background:var(--bg-primary);box-shadow:var(--shadow-sm);"><h4 style="margin:0 0 8px;color:var(--text-primary);font-size:16px;">Nested Card Title</h4><p style="margin:0;color:var(--text-secondary);font-size:14px;">Nested card content...</p></div><p><br></p>`;
      slideCard.insertAdjacentHTML('beforeend', nestedHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Nested Card added to slide', 'success');
    } else if (action === 'bullets') {
      const bulletsHtml = `<ul style="margin:12px 0 12px 24px;color:var(--text-primary);font-size:15px;line-height:1.7;"><li contenteditable="true">Presentation Key Point 1</li><li contenteditable="true">Presentation Key Point 2</li><li contenteditable="true">Presentation Key Point 3</li></ul><p><br></p>`;
      slideCard.insertAdjacentHTML('beforeend', bulletsHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Bullet points added to slide', 'success');
    } else if (shape) {
      const fill = '#ea580c';
      const stroke = '#c2410c';
      const svg = window.DocFlow.ImageManager?.getShapeSvg ? window.DocFlow.ImageManager.getShapeSvg(shape, fill, stroke, 2, 100) : '';
      const shapeHtml = `<div class="doc-shape-container" contenteditable="false" style="display:inline-block;margin:12px;cursor:pointer;">${svg}</div>`;
      slideCard.insertAdjacentHTML('beforeend', shapeHtml);
      const inserted = slideCard.querySelector('.doc-shape-container:last-of-type');
      if (inserted) {
        window.DocFlow.ImageManager?.attachShapeListeners(inserted);
        window.DocFlow.ImageManager?.selectImage(inserted);
      }
      window.DocFlow.Editor?.notifyChange();
      showToast(`Shape (${shape}) added to slide`, 'success');
    } else if (action === 'layout-title-box') {
      slideCard.innerHTML = `
        <div class="slide-title-box" contenteditable="true" style="font-size:26px;font-weight:700;color:var(--text-primary);border:1.5px dashed var(--border);border-radius:6px;padding:12px 16px;margin-bottom:18px;min-height:50px;">Click to add Title</div>
        <div class="slide-content-box" contenteditable="true" style="font-size:16px;line-height:1.6;color:var(--text-secondary);border:1.5px dashed var(--border);border-radius:6px;padding:16px;min-height:180px;">Click to add text, bullet points, or paste content...</div>
        <p><br></p>`;
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('Title & Box layout applied', 'success');
    } else if (action === 'layout-blank') {
      slideCard.innerHTML = '<p><br></p>';
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('Blank canvas applied', 'info');
    } else if (action === 'layout-split') {
      slideCard.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0;min-height:220px;"><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Left Column</h4><p>Click to edit...</p></div><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Right Column</h4><p>Click to edit...</p></div></div><p><br></p>`;
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('2-Column split layout applied', 'success');
    } else if (action === 'layout-cards') {
      slideCard.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:12px 0;min-height:180px;"><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 1</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 2</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 3</h4><p>Details...</p></div></div><p><br></p>`;
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('3-Card grid layout applied', 'success');
    } else if (action === 'bg-image') {
      $('#pptBgFileInput')?.click();
    } else if (action === 'add-next-slide') {
      wrapper.insertAdjacentHTML('afterend', createEmptySlideHtml());
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      selectPptSlide(currentActiveSlideIndex + 1);
      showToast('New Presentation Slide added below', 'success');
    }
  }

  // ==========================================================================
  // Excel Toolbar Actions (Issue 7)
  // ==========================================================================
  function insertExcelSheetTable(rows = 6, cols = 5) {
    let colHeaders = '';
    for (let c = 0; c < cols; c++) {
      colHeaders += `<th style="background:var(--bg-tertiary);border:1px solid var(--border);padding:6px 10px;font-size:12px;font-weight:700;text-align:center;">${String.fromCharCode(65 + c)}</th>`;
    }
    let bodyRows = '';
    for (let r = 1; r <= rows; r++) {
      let cells = `<td style="background:var(--bg-tertiary);border:1px solid var(--border);padding:4px 8px;font-size:11px;font-weight:700;text-align:center;user-select:none;">${r}</td>`;
      for (let c = 0; c < cols; c++) {
        cells += `<td style="border:1px solid var(--border);padding:6px 10px;min-width:60px;min-height:22px;" contenteditable="true"></td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }
    const tableHtml = `
      <div class="excel-table-container" style="overflow-x:auto;margin:16px 0;">
        <table class="df-excel-table" style="border-collapse:collapse;width:100%;min-width:400px;background:var(--bg-primary);border:1px solid var(--border);">
          <thead><tr><th style="background:var(--bg-tertiary);border:1px solid var(--border);width:36px;">#</th>${colHeaders}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div><p><br></p>`;
    window.DocFlow.Editor?.insertHtmlAtCursor(tableHtml);
    window.DocFlow.Editor?.notifyChange();
    showToast('Spreadsheet Table inserted', 'success');
  }

  function getActiveTableCell() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    return node.closest('td, th');
  }

  function getExcelColLetter(index) {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  function renumberExcelTable(table) {
    if (!table) return;
    const theadTr = table.querySelector('thead tr');
    if (theadTr) {
      const ths = Array.from(theadTr.children);
      let colIdx = 0;
      ths.forEach((th, idx) => {
        if (th.classList.contains('excel-corner') || idx === 0) {
          th.textContent = '';
        } else {
          const letter = getExcelColLetter(colIdx);
          th.textContent = letter;
          th.dataset.col = colIdx;
          colIdx++;
        }
      });
    }

    const tbody = table.querySelector('tbody') || table;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach((tr, rIdx) => {
      const rowHdr = tr.querySelector('.excel-row-hdr') || (tr.firstElementChild && tr.firstElementChild.tagName === 'TH' ? tr.firstElementChild : null);
      if (rowHdr) {
        rowHdr.textContent = rIdx + 1;
        rowHdr.dataset.row = rIdx + 1;
      }
      const dataCells = Array.from(tr.querySelectorAll('td'));
      dataCells.forEach((td, cIdx) => {
        const coord = `${getExcelColLetter(cIdx)}${rIdx + 1}`;
        td.dataset.coord = coord;
      });
    });
  }

  function restoreCellFocus(preferredCell) {
    setTimeout(() => {
      const table = document.querySelector('.excel-grid-table') || document.querySelector('#editor table');
      if (!table) return;
      let target = preferredCell;
      if (!target || !document.body.contains(target) || target.tagName !== 'TD') {
        target = table.querySelector('td.excel-cell-selected') || table.querySelector('tbody tr td') || window._activeExcelCell;
      }
      if (target && document.body.contains(target)) {
        target.focus();
        window._activeExcelCell = target;
        const coordBox = document.querySelector('.excel-coord-box');
        if (coordBox && target.dataset.coord) {
          coordBox.value = target.dataset.coord;
        }
      }
    }, 20);
  }

  function handleExcelTableAction(action) {
    const cell = getActiveTableCell();
    const table = cell ? cell.closest('table') : document.querySelector('#editor table');
    if (!table) {
      if (action === 'insert-grid') insertExcelSheetTable();
      else showToast('Click inside a spreadsheet table first', 'info');
      return;
    }

    const theadTr = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody') || table;

    if (action === 'add-row-below' || action === 'add-row-above') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const targetRow = cell ? cell.closest('tr') : tbody.querySelector('tr:last-child');
      if (targetRow) {
        const newRow = document.createElement('tr');
        const rowHdr = document.createElement('th');
        rowHdr.className = 'excel-row-hdr';
        rowHdr.contentEditable = 'false';
        newRow.appendChild(rowHdr);

        const colCount = theadTr ? theadTr.querySelectorAll('th:not(.excel-corner)').length : targetRow.querySelectorAll('td').length;
        for (let c = 0; c < Math.max(1, colCount); c++) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          newRow.appendChild(td);
        }

        if (action === 'add-row-above') {
          targetRow.insertAdjacentElement('beforebegin', newRow);
        } else {
          targetRow.insertAdjacentElement('afterend', newRow);
        }

        renumberExcelTable(table);
        setupExcelInteractions();
        window.DocFlow.Editor?.notifyChange();
        showToast('Row inserted', 'success');
        restoreCellFocus(newRow.querySelector('td'));
      }
    } else if (action === 'delete-row') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const selectedRows = Array.from(table.querySelectorAll('tr.excel-row-selected'));
      let fallbackCell = null;
      if (selectedRows.length > 0) {
        const lastRow = selectedRows[selectedRows.length - 1];
        const nextRow = lastRow.nextElementSibling || selectedRows[0].previousElementSibling;
        fallbackCell = nextRow?.querySelector('td');
        selectedRows.forEach(r => r.remove());
        renumberExcelTable(table);
        window.DocFlow.Editor?.notifyChange();
        showToast(`Deleted ${selectedRows.length} row(s)`, 'success');
      } else {
        const row = cell?.closest('tr');
        if (row && tbody.querySelectorAll('tr').length > 1) {
          const adjacent = row.nextElementSibling || row.previousElementSibling;
          const cIdx = cell ? cell.cellIndex : 1;
          fallbackCell = adjacent ? (adjacent.children[cIdx] || adjacent.querySelector('td')) : null;
          row.remove();
          renumberExcelTable(table);
          window.DocFlow.Editor?.notifyChange();
          showToast('Row deleted', 'info');
        } else {
          showToast('Table must have at least one row', 'warning');
          fallbackCell = cell;
        }
      }
      setupExcelInteractions();
      restoreCellFocus(fallbackCell);
    } else if (action === 'add-col-right' || action === 'add-col-left') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const colIdx = cell ? (cell.cellIndex - 1) : 0;
      const insertIdx = action === 'add-col-left' ? Math.max(0, colIdx) : (colIdx + 1);

      if (theadTr) {
        const targetTh = theadTr.children[insertIdx + 1];
        const newTh = document.createElement('th');
        newTh.className = 'excel-col-hdr';
        newTh.contentEditable = 'false';
        if (targetTh) theadTr.insertBefore(newTh, targetTh);
        else theadTr.appendChild(newTh);
      }

      Array.from(tbody.querySelectorAll('tr')).forEach(r => {
        const targetTd = r.children[insertIdx + 1];
        const newTd = document.createElement('td');
        newTd.contentEditable = 'true';
        if (targetTd) r.insertBefore(newTd, targetTd);
        else r.appendChild(newTd);
      });

      renumberExcelTable(table);
      setupExcelInteractions();
      window.DocFlow.Editor?.notifyChange();
      showToast('Column inserted', 'success');
      restoreCellFocus(tbody.querySelector('tr')?.children[insertIdx + 1]);
    } else if (action === 'delete-col') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const selectedColHeaders = Array.from(table.querySelectorAll('th.excel-col-selected'));
      let fallbackCell = null;
      if (selectedColHeaders.length > 0) {
        const colIndices = selectedColHeaders.map(th => Array.from(th.parentElement.children).indexOf(th)).filter(idx => idx > 0);
        colIndices.sort((a, b) => b - a);

        const firstCol = Math.min(...colIndices);
        const adjacentColIdx = Math.max(1, firstCol - 1);
        const sampleRow = tbody.querySelector('tr');
        fallbackCell = sampleRow?.children[adjacentColIdx];

        colIndices.forEach(idx => {
          if (theadTr && theadTr.children[idx]) theadTr.children[idx].remove();
          Array.from(tbody.querySelectorAll('tr')).forEach(r => {
            if (r.children[idx]) r.children[idx].remove();
          });
        });

        renumberExcelTable(table);
        window.DocFlow.Editor?.notifyChange();
        showToast(`Deleted ${colIndices.length} column(s)`, 'success');
      } else if (cell) {
        const cellColIdx = cell.cellIndex;
        if (cellColIdx > 0 && Array.from(tbody.querySelectorAll('tr'))[0]?.children.length > 2) {
          const targetColIdx = Math.max(1, cellColIdx - 1);
          const sampleRow = cell.closest('tr') || tbody.querySelector('tr');
          fallbackCell = sampleRow?.children[targetColIdx];

          if (theadTr && theadTr.children[cellColIdx]) theadTr.children[cellColIdx].remove();
          Array.from(tbody.querySelectorAll('tr')).forEach(r => {
            if (r.children[cellColIdx]) r.children[cellColIdx].remove();
          });
          renumberExcelTable(table);
          window.DocFlow.Editor?.notifyChange();
          showToast('Column deleted', 'info');
        } else {
          showToast('Table must have at least one column', 'warning');
          fallbackCell = cell;
        }
      }
      setupExcelInteractions();
      restoreCellFocus(fallbackCell);
    } else if (action === 'merge') {
      const selectedCells = Array.from(table.querySelectorAll('td.excel-cell-selected'));
      if (selectedCells.length < 2) {
        showToast('Please select at least 2 cells, a row, or a column to merge', 'warning');
        restoreCellFocus(cell);
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.();
      const firstCell = selectedCells[0];
      const combinedText = selectedCells.map(c => c.textContent.trim()).filter(Boolean).join(' ');
      firstCell.textContent = combinedText;

      const minRow = Math.min(...selectedCells.map(c => c.closest('tr').rowIndex));
      const maxRow = Math.max(...selectedCells.map(c => c.closest('tr').rowIndex));
      const minCol = Math.min(...selectedCells.map(c => c.cellIndex));
      const maxCol = Math.max(...selectedCells.map(c => c.cellIndex));

      firstCell.colSpan = Math.max(1, maxCol - minCol + 1);
      firstCell.rowSpan = Math.max(1, maxRow - minRow + 1);
      firstCell.style.textAlign = 'center';

      selectedCells.slice(1).forEach(c => c.remove());
      table.querySelectorAll('td.excel-cell-selected').forEach(c => c.classList.remove('excel-cell-selected'));

      renumberExcelTable(table);
      setupExcelInteractions();
      window.DocFlow.Editor?.notifyChange();
      showToast(`Merged ${selectedCells.length} cells`, 'success');
      restoreCellFocus(firstCell);
    } else if (action === 'unmerge') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const targetCell = (cell && (cell.colSpan > 1 || cell.rowSpan > 1)) ? cell : table.querySelector('td[colspan], td[rowspan]');
      if (targetCell && ((targetCell.colSpan && targetCell.colSpan > 1) || (targetCell.rowSpan && targetCell.rowSpan > 1))) {
        const cSpan = targetCell.colSpan || 1;
        const rSpan = targetCell.rowSpan || 1;
        targetCell.colSpan = 1;
        targetCell.rowSpan = 1;

        for (let i = 1; i < cSpan; i++) {
          const newTd = document.createElement('td');
          newTd.contentEditable = 'true';
          targetCell.insertAdjacentElement('afterend', newTd);
        }

        if (rSpan > 1) {
          const tr = targetCell.closest('tr');
          let nextTr = tr.nextElementSibling;
          for (let r = 1; r < rSpan && nextTr; r++) {
            for (let c = 0; c < cSpan; c++) {
              const newTd = document.createElement('td');
              newTd.contentEditable = 'true';
              nextTr.appendChild(newTd);
            }
            nextTr = nextTr.nextElementSibling;
          }
        }

        renumberExcelTable(table);
        setupExcelInteractions();
        window.DocFlow.Editor?.notifyChange();
        showToast('Cell split into individual cells', 'success');
        restoreCellFocus(targetCell);
      } else {
        showToast('Active cell is not merged', 'info');
        restoreCellFocus(cell);
      }
    }
  }

  function applyExcelFormula(funcName) {
    const cell = getActiveTableCell();
    if (!cell) {
      showToast('Click a spreadsheet cell to calculate formula', 'info');
      return;
    }
    const table = cell.closest('table');
    if (!table) return;

    const colIdx = cell.cellIndex;
    const nums = [];
    Array.from(table.rows).forEach(r => {
      const c = r.cells[colIdx];
      if (c && c !== cell) {
        const val = parseFloat(c.textContent.replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) nums.push(val);
      }
    });

    let result = 0;
    if (nums.length === 0) {
      cell.textContent = `= ${funcName}()`;
      window.DocFlow.Editor?.notifyChange();
      restoreCellFocus(cell);
      return;
    }

    if (funcName === 'SUM') result = nums.reduce((a, b) => a + b, 0);
    else if (funcName === 'AVERAGE') result = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
    else if (funcName === 'COUNT') result = nums.length;
    else if (funcName === 'MAX') result = Math.max(...nums);
    else if (funcName === 'MIN') result = Math.min(...nums);
    else if (funcName === 'MEDIAN') {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      result = sorted.length % 2 !== 0 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
    } else if (funcName === 'PRODUCT') {
      result = nums.reduce((a, b) => a * b, 1);
    } else if (funcName === 'COUNTA') {
      let countA = 0;
      Array.from(table.rows).forEach(r => {
        const c = r.cells[colIdx];
        if (c && c !== cell && c.textContent.trim().length > 0) countA++;
      });
      result = countA;
    } else if (funcName === 'STDEV') {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length > 1 ? nums.length - 1 : 1);
      result = Math.sqrt(variance).toFixed(2);
    } else if (funcName === 'ROUND') {
      result = Math.round(nums[nums.length - 1] || nums[0] || 0);
    }

    cell.textContent = String(result);
    cell.style.fontWeight = 'bold';
    window.DocFlow.Editor?.notifyChange();
    showToast(`Formula ${funcName} calculated: ${result}`, 'success');
    restoreCellFocus(cell);
  }

  // Visual Chart Generator (Issue 5: 9 Chart Types with Corner Resize & Drag)
  function insertChartIntoDocument() {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    const chartType = $('#chartTypeSelect')?.value || 'column';
    const chartTitle = $('#chartTitleInput')?.value.trim() || 'Data Chart';
    const valInput = $('#chartValuesInput')?.value.trim() || '45, 82, 63, 95';
    const values = valInput.split(',').map(v => parseFloat(v.trim()) || 0);
    const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'].slice(0, values.length);
    const maxVal = Math.max(...values, 10);
    const colors = ['#0284c7', '#16a34a', '#ea580c', '#8b5cf6', '#eab308', '#ec4899', '#06b6d4'];

    const w = 520;
    const h = 280;
    let svgContent = '';

    if (chartType === 'column') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const barWidth = Math.min(50, Math.floor((plotW / values.length) * 0.65));
      const colStep = plotW / values.length;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      values.forEach((val, idx) => {
        const barH = Math.round((val / maxVal) * (plotH - 20));
        const barX = Math.round(padLeft + idx * colStep + (colStep - barWidth) / 2);
        const barY = h - padBottom - barH;
        const color = colors[idx % colors.length];

        svgContent += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="${color}" />`;
        svgContent += `<text x="${barX + barWidth / 2}" y="${barY - 6}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${barX + barWidth / 2}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `Item ${idx+1}`}</text>`;
      });
    } else if (chartType === 'bar') {
      const padLeft = 60, padBottom = 25, padTop = 30, padRight = 45;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const barHeight = Math.min(30, Math.floor((plotH / values.length) * 0.65));
      const rowStep = plotH / values.length;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${padLeft}" y2="${padTop}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      values.forEach((val, idx) => {
        const barW = Math.round((val / maxVal) * plotW);
        const barY = Math.round(padTop + idx * rowStep + (rowStep - barHeight) / 2);
        const color = colors[idx % colors.length];

        svgContent += `<rect x="${padLeft}" y="${barY}" width="${barW}" height="${barHeight}" rx="3" fill="${color}" />`;
        svgContent += `<text x="${padLeft - 8}" y="${barY + barHeight / 2 + 4}" font-size="11" text-anchor="end" fill="var(--text-muted, #64748b)">${labels[idx] || `Item ${idx+1}`}</text>`;
        svgContent += `<text x="${padLeft + barW + 8}" y="${barY + barHeight / 2 + 4}" font-size="11" font-weight="600" fill="var(--text-primary, #334155)">${val}</text>`;
      });
    } else if (chartType === 'line') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const step = plotW / (values.length - 1 || 1);

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      let points = [];
      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));
        points.push(`${px},${py}`);
        svgContent += `<circle cx="${px}" cy="${py}" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="2" />`;
        svgContent += `<text x="${px}" y="${py - 8}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${px}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `P${idx+1}`}</text>`;
      });
      svgContent = `<polyline points="${points.join(' ')}" fill="none" stroke="#0284c7" stroke-width="3" />` + svgContent;
    } else if (chartType === 'doughnut') {
      const cx = w / 2 - 40, cy = h / 2 + 8, r = 85, rInner = 52;
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let startAngle = 0;

      values.forEach((val, idx) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const x3 = cx + rInner * Math.cos(endAngle);
        const y3 = cy + rInner * Math.sin(endAngle);
        const x4 = cx + rInner * Math.cos(startAngle);
        const y4 = cy + rInner * Math.sin(startAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const color = colors[idx % colors.length];

        const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
        svgContent += `<path d="${pathData}" fill="${color}" stroke="var(--bg-secondary, #ffffff)" stroke-width="1.5" />`;

        const legY = 32 + idx * 24;
        const pct = Math.round((val / total) * 100);
        svgContent += `<rect x="${w - 110}" y="${legY}" width="12" height="12" rx="2" fill="${color}" />`;
        svgContent += `<text x="${w - 92}" y="${legY + 10}" font-size="11" fill="var(--text-primary, #334155)">${labels[idx] || `Item ${idx+1}`} (${pct}%)</text>`;

        startAngle = endAngle;
      });

      svgContent += `<text x="${cx}" y="${cy - 4}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--text-muted, #64748b)">TOTAL</text>`;
      svgContent += `<text x="${cx}" y="${cy + 16}" font-size="16" font-weight="800" text-anchor="middle" fill="var(--text-primary, #0f172a)">${total}</text>`;
    } else if (chartType === 'area') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const step = plotW / (values.length - 1 || 1);
      const gradId = 'areaGrad_' + Math.floor(Math.random() * 100000);

      svgContent += `<defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05" />
        </linearGradient>
      </defs>`;
      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      let points = [];
      let areaPoints = [`${padLeft},${h - padBottom}`];
      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));
        points.push(`${px},${py}`);
        areaPoints.push(`${px},${py}`);
      });
      areaPoints.push(`${padLeft + (values.length - 1) * step},${h - padBottom}`);

      svgContent += `<polygon points="${areaPoints.join(' ')}" fill="url(#${gradId})" />`;
      svgContent += `<polyline points="${points.join(' ')}" fill="none" stroke="#0284c7" stroke-width="3" />`;

      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));
        svgContent += `<circle cx="${px}" cy="${py}" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="2" />`;
        svgContent += `<text x="${px}" y="${py - 8}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${px}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `P${idx+1}`}</text>`;
      });
    } else if (chartType === 'radar') {
      const cx = w / 2 - 40, cy = h / 2 + 8, r = 85;
      const count = values.length || 4;

      [0.33, 0.66, 1.0].forEach(factor => {
        let gridPts = [];
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI / count) - (Math.PI / 2);
          gridPts.push(`${cx + r * factor * Math.cos(angle)},${cy + r * factor * Math.sin(angle)}`);
        }
        svgContent += `<polygon points="${gridPts.join(' ')}" fill="none" stroke="var(--border, #cbd5e1)" stroke-width="1" stroke-dasharray="2 2" />`;
      });

      let dataPts = [];
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI / count) - (Math.PI / 2);
        const sx = cx + r * Math.cos(angle);
        const sy = cy + r * Math.sin(angle);
        svgContent += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="var(--border, #cbd5e1)" stroke-width="1" />`;

        const lx = cx + (r + 16) * Math.cos(angle);
        const ly = cy + (r + 16) * Math.sin(angle) + 4;
        svgContent += `<text x="${lx}" y="${ly}" font-size="10" font-weight="600" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[i] || `A${i+1}`}</text>`;

        const val = values[i] || 0;
        const dist = (val / maxVal) * r;
        const dx = cx + dist * Math.cos(angle);
        const dy = cy + dist * Math.sin(angle);
        dataPts.push(`${dx},${dy}`);
      }

      svgContent += `<polygon points="${dataPts.join(' ')}" fill="rgba(139, 92, 246, 0.35)" stroke="#8b5cf6" stroke-width="2.5" />`;
      dataPts.forEach((pt) => {
        const [px, py] = pt.split(',');
        svgContent += `<circle cx="${px}" cy="${py}" r="4" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5" />`;
      });
    } else if (chartType === 'scatter') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      for (let g = 1; g <= 3; g++) {
        const gy = Math.round(h - padBottom - (g / 4) * plotH);
        svgContent += `<line x1="${padLeft}" y1="${gy}" x2="${w - padRight}" y2="${gy}" stroke="var(--border, #cbd5e1)" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />`;
      }

      const step = plotW / (values.length - 1 || 1);
      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));

        svgContent += `<circle cx="${px}" cy="${py}" r="8" fill="rgba(234, 88, 12, 0.2)" />`;
        svgContent += `<circle cx="${px}" cy="${py}" r="5" fill="#ea580c" stroke="#ffffff" stroke-width="2" />`;
        svgContent += `<text x="${px}" y="${py - 10}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${px}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `P${idx+1}`}</text>`;
      });
    } else if (chartType === 'stacked') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const barWidth = Math.min(48, Math.floor((plotW / values.length) * 0.65));
      const colStep = plotW / values.length;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      values.forEach((val, idx) => {
        const totalBarH = Math.round((val / maxVal) * (plotH - 20));
        const seg1H = Math.round(totalBarH * 0.6);
        const seg2H = totalBarH - seg1H;
        const barX = Math.round(padLeft + idx * colStep + (colStep - barWidth) / 2);
        const seg1Y = h - padBottom - seg1H;
        const seg2Y = seg1Y - seg2H;

        svgContent += `<rect x="${barX}" y="${seg1Y}" width="${barWidth}" height="${seg1H}" fill="#0284c7" />`;
        svgContent += `<rect x="${barX}" y="${seg2Y}" width="${barWidth}" height="${seg2H}" rx="3" fill="#10b981" />`;

        svgContent += `<text x="${barX + barWidth / 2}" y="${seg2Y - 6}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${barX + barWidth / 2}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `Item ${idx+1}`}</text>`;
      });

      svgContent += `<rect x="${w - 140}" y="${padTop}" width="10" height="10" fill="#0284c7" />`;
      svgContent += `<text x="${w - 124}" y="${padTop + 9}" font-size="10" fill="var(--text-primary, #334155)">Series A (60%)</text>`;
      svgContent += `<rect x="${w - 140}" y="${padTop + 16}" width="10" height="10" fill="#10b981" />`;
      svgContent += `<text x="${w - 124}" y="${padTop + 25}" font-size="10" fill="var(--text-primary, #334155)">Series B (40%)</text>`;
    } else {
      const cx = w / 2 - 40, cy = h / 2 + 8, r = 85;
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let startAngle = 0;

      values.forEach((val, idx) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const color = colors[idx % colors.length];

        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        svgContent += `<path d="${pathData}" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`;

        const legY = 40 + idx * 24;
        const pct = Math.round((val / total) * 100);
        svgContent += `<rect x="${w - 110}" y="${legY}" width="12" height="12" rx="2" fill="${color}" />`;
        svgContent += `<text x="${w - 92}" y="${legY + 10}" font-size="11" fill="var(--text-primary, #334155)">${labels[idx] || `Item ${idx+1}`} (${pct}%)</text>`;

        startAngle = endAngle;
      });
    }

    const chartHtml = `
      <div class="doc-chart-container" contenteditable="false" style="margin:16px auto;width:${w}px;max-width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:14px;box-shadow:var(--shadow-sm);cursor:pointer;position:relative;">
        <div class="chart-header-title" style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;text-align:center;">
          <i class="fas fa-chart-column" style="color:#0284c7;margin-right:6px;"></i>${escHtml(chartTitle)}
        </div>
        <svg class="doc-chart-svg" width="100%" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;display:block;">
          ${svgContent}
        </svg>
      </div><p><br></p>`;

    window.DocFlow.Editor?.insertHtmlAtCursor(chartHtml);
    window.DocFlow.Editor?.notifyChange();
    closeModal('#chartModal');
    showToast('Visual Data Chart inserted', 'success');

    setTimeout(() => {
      const charts = $('#editor')?.querySelectorAll('.doc-chart-container');
      if (charts && charts.length) {
        const newlyInserted = charts[charts.length - 1];
        window.DocFlow.ImageManager?.attachShapeListeners(newlyInserted);
        window.DocFlow.ImageManager?.selectImage(newlyInserted);
      }
    }, 50);
  }

  // Presentation Slide Show Player (Issue 7: restricted to .pptx documents)
  let slideShowSlides = [];
  let currentSlideShowIdx = 0;

  function startSlideShow() {
    if (!isPptxDocument()) {
      showToast('Slide Show presentation mode is only available for PowerPoint (.pptx) documents', 'warning');
      return;
    }
    const editor = $('#editor');
    if (!editor) return;

    let slideCards = Array.from(editor.querySelectorAll('.pptx-slide-card'));
    if (!slideCards.length) {
      slideCards = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    }
    if (!slideCards.length) {
      showToast('No slides found to present in this presentation', 'info');
      return;
    }

    slideShowSlides = slideCards.map(c => {
      const clone = c.cloneNode(true);
      clone.querySelectorAll('.slide-placeholder-text, .slide-quick-action-bar').forEach(el => el.remove());
      return clone.innerHTML || '<p>Slide content</p>';
    });

    currentSlideShowIdx = 0;
    const overlay = $('#slideshowOverlay');
    if (!overlay) return;

    overlay.classList.add('show');
    showSlideShowIndex(0);

    document.removeEventListener('keydown', handleSlideShowKey);
    document.addEventListener('keydown', handleSlideShowKey);
    showToast('Presentation Slide Show started. Press Esc to exit.', 'info');
  }

  function showSlideShowIndex(idx) {
    if (idx < 0) idx = 0;
    if (idx >= slideShowSlides.length) idx = slideShowSlides.length - 1;
    currentSlideShowIdx = idx;

    const body = $('#slideshowCurrentSlideBody');
    const counter = $('#slideshowCounter');
    if (body) {
      body.innerHTML = slideShowSlides[idx];
    }
    if (counter) {
      counter.textContent = `${idx + 1} / ${slideShowSlides.length}`;
    }
  }

  function exitSlideShow() {
    const overlay = $('#slideshowOverlay');
    if (overlay) overlay.classList.remove('show');
    document.removeEventListener('keydown', handleSlideShowKey);
    showToast('Exited presentation slide show', 'info');
  }

  function handleSlideShowKey(e) {
    const overlay = $('#slideshowOverlay');
    if (!overlay || !overlay.classList.contains('show')) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      showSlideShowIndex(currentSlideShowIdx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      showSlideShowIndex(currentSlideShowIdx - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitSlideShow();
    }
  }

  // Layout Tools (Issue 5: Page Orientation, Page Borders, Print Area)
  function togglePageOrientation() {
    const page = $('.editor-page');
    if (!page) return;
    const isLandscape = page.classList.toggle('landscape-page');
    $('#layoutOrientationBtn')?.classList.toggle('active', isLandscape);
    showToast(isLandscape ? 'Page Orientation: Landscape (11" × 8.5")' : 'Page Orientation: Portrait (8.5" × 11")', 'info');
  }

  function togglePageBorders() {
    const page = $('.editor-page');
    if (!page) return;
    const hasBorders = page.classList.toggle('page-borders-mode');
    $('#layoutPageBordersBtn')?.classList.toggle('active', hasBorders);
    showToast(hasBorders ? 'Page Borders: ON' : 'Page Borders: OFF', 'info');
  }

  function setPrintArea() {
    const page = $('.editor-page');
    if (!page) return;
    const isArea = page.classList.toggle('print-area-active');
    $('#layoutPrintAreaBtn')?.classList.toggle('active', isArea);
    showToast(isArea ? 'Print Area defined for document' : 'Print Area cleared', 'info');
  }

  // True Excel Capacity & Coordinates Controller (Issues 7, 8, 9)
  function jumpToExcelCoord(container, coordStr) {
    if (!container || !coordStr) return;
    const parsed = window.DocFlow.FileIO?.parseExcelCoord ?
      window.DocFlow.FileIO.parseExcelCoord(coordStr) : null;
    if (!parsed) {
      showToast(`Invalid Excel coordinate: "${coordStr}". Valid range: A1 to XFD1048576`, 'error');
      return;
    }

    const { col, row, colLetter } = parsed;
    const targetCoord = `${colLetter}${row}`;
    const table = container.querySelector('.excel-grid-table');
    if (!table) return;

    let targetCell = table.querySelector(`td[data-coord="${targetCoord}"]`);

    if (!targetCell) {
      const tbody = table.querySelector('tbody');
      const thead = table.querySelector('thead tr');
      const getLetter = window.DocFlow.FileIO?.getExcelColLetter || (i => i === 16383 ? 'XFD' : 'A');

      if (row > 100 || col > 50) {
        let colHdr = table.querySelector(`th.excel-col-hdr[data-col="${col}"]`);
        if (!colHdr) {
          const th = document.createElement('th');
          th.className = 'excel-col-hdr';
          th.dataset.col = col;
          th.contentEditable = 'false';
          th.textContent = colLetter;
          thead.appendChild(th);
        }
        let tr = tbody.querySelector(`tr[data-row="${row}"]`);
        if (!tr) {
          tr = document.createElement('tr');
          tr.dataset.row = row;
          const rowHdr = document.createElement('th');
          rowHdr.className = 'excel-row-hdr';
          rowHdr.contentEditable = 'false';
          rowHdr.textContent = row;
          tr.appendChild(rowHdr);
          tbody.appendChild(tr);
        }
        targetCell = tr.querySelector(`td[data-coord="${targetCoord}"]`);
        if (!targetCell) {
          targetCell = document.createElement('td');
          targetCell.contentEditable = 'true';
          targetCell.dataset.coord = targetCoord;
          tr.appendChild(targetCell);
        }
      } else {
        const currentCols = thead.querySelectorAll('.excel-col-hdr').length;
        for (let c = currentCols; c <= col; c++) {
          const th = document.createElement('th');
          th.className = 'excel-col-hdr';
          th.contentEditable = 'false';
          th.textContent = getLetter(c);
          thead.appendChild(th);
        }
        const currentRows = tbody.querySelectorAll('tr').length;
        for (let r = currentRows + 1; r <= row; r++) {
          const tr = document.createElement('tr');
          const rowHdr = document.createElement('th');
          rowHdr.className = 'excel-row-hdr';
          rowHdr.contentEditable = 'false';
          rowHdr.textContent = r;
          tr.appendChild(rowHdr);
          const totalCols = thead.querySelectorAll('.excel-col-hdr').length;
          for (let c = 0; c < totalCols; c++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.dataset.coord = `${getLetter(c)}${r}`;
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        targetCell = table.querySelector(`td[data-coord="${targetCoord}"]`);
      }
    }

    if (targetCell) {
      targetCell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      targetCell.focus();
      window._activeExcelCell = targetCell;
      const coordBox = container.querySelector('.excel-coord-box');
      const formulaInput = container.querySelector('.excel-formula-input');
      if (coordBox) coordBox.value = targetCoord;
      if (formulaInput) formulaInput.value = targetCell.textContent || '';
      showToast(`Jumped to cell ${targetCoord}`, 'info');
    }
  }

  function setupExcelInteractions() {
    const editor = $('#editor');
    if (!editor) return;

    const container = editor.querySelector('.excel-spreadsheet-container');
    if (!container) return;

    // Issue 7 & 9: Lock editor canvas so whole sheet cannot be deleted by freeform selection
    editor.contentEditable = 'false';
    container.contentEditable = 'false';

    const formulaInput = container.querySelector('.excel-formula-input');
    const coordBox = container.querySelector('.excel-coord-box');

    const attachCellSync = (td) => {
      if (td._excelSynced) return;
      td._excelSynced = true;

      td.addEventListener('focus', () => {
        window._activeExcelCell = td;
        if (formulaInput) formulaInput.value = td.textContent || '';
        if (coordBox) coordBox.value = td.dataset.coord || 'A1';
      });

      td.addEventListener('input', () => {
        if (formulaInput && window._activeExcelCell === td) {
          formulaInput.value = td.textContent || '';
        }
        window.DocFlow.Editor?.notifyChange();
      });

      td.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          const tr = td.closest('tr');
          const nextTr = tr?.nextElementSibling;
          if (nextTr) {
            const target = nextTr.children[td.cellIndex] || nextTr.querySelector('td');
            if (target && target.tagName === 'TD') {
              e.preventDefault();
              target.focus();
            }
          }
        } else if (e.key === 'ArrowUp') {
          const tr = td.closest('tr');
          const prevTr = tr?.previousElementSibling;
          if (prevTr) {
            const target = prevTr.children[td.cellIndex] || prevTr.querySelector('td');
            if (target && target.tagName === 'TD') {
              e.preventDefault();
              target.focus();
            }
          }
        } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
          const sel = window.getSelection();
          const isAtEnd = e.key === 'Tab' || (sel && sel.isCollapsed && sel.anchorOffset >= td.textContent.length);
          if (isAtEnd) {
            const next = td.nextElementSibling;
            if (next && next.tagName === 'TD') {
              e.preventDefault();
              next.focus();
            } else if (e.key === 'Tab') {
              const tr = td.closest('tr');
              const nextTr = tr?.nextElementSibling;
              const firstTd = nextTr?.querySelector('td');
              if (firstTd) {
                e.preventDefault();
                firstTd.focus();
              }
            }
          }
        } else if (e.key === 'ArrowLeft') {
          const sel = window.getSelection();
          const isAtStart = (sel && sel.isCollapsed && sel.anchorOffset === 0);
          if (isAtStart) {
            const prev = td.previousElementSibling;
            if (prev && prev.tagName === 'TD') {
              e.preventDefault();
              prev.focus();
            }
          }
        }
      });
    };

    container.querySelectorAll('.excel-grid-table td').forEach(attachCellSync);

    const table = container.querySelector('.excel-grid-table');
    if (table && !table._hdrListeners) {
      table._hdrListeners = true;
      table.addEventListener('click', e => {
        const rowHdr = e.target.closest('.excel-row-hdr');
        if (rowHdr) {
          const tr = rowHdr.closest('tr');
          if (tr) {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
              table.querySelectorAll('td.excel-cell-selected').forEach(c => {
                c.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
              });
              table.querySelectorAll('tr.excel-row-selected, th.excel-col-selected').forEach(el => el.classList.remove('excel-row-selected', 'excel-col-selected'));
            }
            const isSelected = tr.classList.toggle('excel-row-selected');
            tr.querySelectorAll('td').forEach(td => td.classList.toggle('excel-cell-selected', isSelected));
            const firstTd = tr.querySelector('td');
            if (firstTd && isSelected) {
              firstTd.focus();
              window._activeExcelCell = firstTd;
              if (coordBox) coordBox.value = firstTd.dataset.coord || 'A1';
              if (formulaInput) formulaInput.value = firstTd.textContent || '';
            }
          }
          return;
        }

        const colHdr = e.target.closest('.excel-col-hdr');
        if (colHdr) {
          const tr = colHdr.parentElement;
          const idx = Array.from(tr.children).indexOf(colHdr);
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            table.querySelectorAll('td.excel-cell-selected').forEach(c => {
              c.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
            });
            table.querySelectorAll('tr.excel-row-selected, th.excel-col-selected').forEach(el => el.classList.remove('excel-row-selected', 'excel-col-selected'));
          }
          const isSelected = colHdr.classList.toggle('excel-col-selected');
          table.querySelectorAll('tbody tr').forEach(row => {
            const cell = row.children[idx];
            if (cell && cell.tagName === 'TD') cell.classList.toggle('excel-cell-selected', isSelected);
          });
          const firstTd = table.querySelector(`tbody tr td:nth-child(${idx + 1})`);
          if (firstTd && isSelected) {
            firstTd.focus();
            window._activeExcelCell = firstTd;
            if (coordBox) coordBox.value = firstTd.dataset.coord || 'A1';
            if (formulaInput) formulaInput.value = firstTd.textContent || '';
          }
          return;
        }
      });

      let isSelecting = false;
      let startCell = null;

      // Mouse Selection (Hold Ctrl for multi-cell click selection)
      table.addEventListener('mousedown', e => {
        const td = e.target.closest('td');
        if (!td) return;

        if (e.ctrlKey || e.metaKey) {
          td.classList.toggle('excel-cell-selected');
          window._activeExcelCell = td;
          if (coordBox) coordBox.value = td.dataset.coord || 'A1';
          if (formulaInput) formulaInput.value = td.textContent || '';
          return;
        }

        if (!e.shiftKey) {
          table.querySelectorAll('td.excel-cell-selected').forEach(c => {
            c.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
          });
          table.querySelectorAll('tr.excel-row-selected, th.excel-col-selected').forEach(el => {
            el.classList.remove('excel-row-selected', 'excel-col-selected');
          });
        }
        isSelecting = true;
        startCell = td;
        td.classList.add('excel-cell-selected');
        window._activeExcelCell = td;
        if (coordBox) coordBox.value = td.dataset.coord || 'A1';
        if (formulaInput) formulaInput.value = td.textContent || '';
      });

      table.addEventListener('mouseover', e => {
        if (!isSelecting || !startCell) return;
        const currentTd = e.target.closest('td');
        if (!currentTd) return;

        const startTr = startCell.closest('tr');
        const currTr = currentTd.closest('tr');
        if (!startTr || !currTr) return;

        const minR = Math.min(startTr.rowIndex, currTr.rowIndex);
        const maxR = Math.max(startTr.rowIndex, currTr.rowIndex);
        const minC = Math.min(startCell.cellIndex, currentTd.cellIndex);
        const maxC = Math.max(startCell.cellIndex, currentTd.cellIndex);

        table.querySelectorAll('tbody tr').forEach(r => {
          if (r.rowIndex >= minR && r.rowIndex <= maxR) {
            Array.from(r.children).forEach(c => {
              if (c.tagName === 'TD') {
                if (c.cellIndex >= minC && c.cellIndex <= maxC) {
                  c.classList.add('excel-cell-selected');
                } else if (!e.shiftKey) {
                  c.classList.remove('excel-cell-selected');
                }
              }
            });
          } else if (!e.shiftKey) {
            r.querySelectorAll('td').forEach(c => c.classList.remove('excel-cell-selected'));
          }
        });
      });

      window.addEventListener('mouseup', () => {
        isSelecting = false;
      });

      // Mobile long-press multi-cell / row / col selection (Issue 4)
      let touchTimer = null;
      let touchStartX = 0;
      let touchStartY = 0;
      let touchTarget = null;

      table.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchTarget = e.target.closest('td, th.excel-row-hdr, th.excel-col-hdr');
        if (!touchTarget) return;

        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => {
          if (!touchTarget) return;
          if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (_) {}
          }
          if (touchTarget.tagName === 'TD') {
            const isSel = touchTarget.classList.toggle('excel-cell-selected');
            window._activeExcelCell = touchTarget;
            if (coordBox) coordBox.value = touchTarget.dataset.coord || 'A1';
            if (formulaInput) formulaInput.value = touchTarget.textContent || '';
            showToast(`Cell ${touchTarget.dataset.coord || ''} ${isSel ? 'selected' : 'unselected'}`, 'info');
          } else if (touchTarget.classList.contains('excel-row-hdr')) {
            const tr = touchTarget.closest('tr');
            if (tr) {
              const isSel = tr.classList.toggle('excel-row-selected');
              tr.querySelectorAll('td').forEach(c => c.classList.toggle('excel-cell-selected', isSel));
              showToast(`Row ${touchTarget.textContent.trim()} ${isSel ? 'selected' : 'unselected'}`, 'info');
            }
          } else if (touchTarget.classList.contains('excel-col-hdr')) {
            const tr = touchTarget.parentElement;
            const idx = Array.from(tr.children).indexOf(touchTarget);
            const isSel = touchTarget.classList.toggle('excel-col-selected');
            table.querySelectorAll('tbody tr').forEach(row => {
              const cell = row.children[idx];
              if (cell && cell.tagName === 'TD') cell.classList.toggle('excel-cell-selected', isSel);
            });
            showToast(`Column ${touchTarget.textContent.trim()} ${isSel ? 'selected' : 'unselected'}`, 'info');
          }
        }, 420);
      }, { passive: true });

      table.addEventListener('touchmove', e => {
        if (!touchTarget || !touchTimer) return;
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - touchStartX) > 12 || Math.abs(touch.clientY - touchStartY) > 12) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }, { passive: true });

      table.addEventListener('touchend', () => {
        clearTimeout(touchTimer);
        touchTimer = null;
      });

      table.addEventListener('touchcancel', () => {
        clearTimeout(touchTimer);
        touchTimer = null;
      });
    }

    if (formulaInput && !formulaInput._excelSynced) {
      formulaInput._excelSynced = true;
      formulaInput.addEventListener('input', () => {
        if (window._activeExcelCell) {
          window._activeExcelCell.textContent = formulaInput.value;
          window.DocFlow.Editor?.notifyChange();
        }
      });
      formulaInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window._activeExcelCell?.focus();
        }
      });
    }

    if (coordBox && !coordBox._excelSynced) {
      coordBox._excelSynced = true;
      coordBox.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          jumpToExcelCoord(container, coordBox.value);
        }
      });
      coordBox.addEventListener('change', () => {
        jumpToExcelCoord(container, coordBox.value);
      });
    }

    container.querySelectorAll('.excel-jump-btn').forEach(btn => {
      if (btn._excelSynced) return;
      btn._excelSynced = true;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const type = btn.dataset.jump;
        if (type === 'home') {
          jumpToExcelCoord(container, 'A1');
        } else if (type === 'end') {
          jumpToExcelCoord(container, 'XFD1048576');
        }
      });
    });

    if (!container._deletionProtected) {
      container._deletionProtected = true;
      container.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
          if (document.activeElement === formulaInput || document.activeElement === coordBox) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const table = container.querySelector('.excel-grid-table');
          if (table) {
            table.querySelectorAll('th').forEach(th => th.classList.remove('excel-row-selected', 'excel-col-selected'));
            table.querySelectorAll('tr').forEach(tr => tr.classList.remove('excel-row-selected'));
            table.querySelectorAll('td').forEach(td => {
              td.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
            });

            // Content area detection (Excel style square border covering content)
            const allTds = Array.from(table.querySelectorAll('tbody td'));
            const contentCells = allTds.filter(c => c.textContent.trim().length > 0);

            let minR = 1, maxR = 1, minC = 1, maxC = 1;
            if (contentCells.length > 0) {
              minR = Math.min(...contentCells.map(c => c.closest('tr').rowIndex));
              maxR = Math.max(...contentCells.map(c => c.closest('tr').rowIndex));
              minC = Math.min(...contentCells.map(c => c.cellIndex));
              maxC = Math.max(...contentCells.map(c => c.cellIndex));
            } else {
              const rows = table.querySelectorAll('tbody tr');
              minR = 1;
              maxR = Math.min(rows.length, 10);
              minC = 1;
              maxC = Math.min(rows[0]?.children.length - 1 || 10, 10);
            }

            table.querySelectorAll('tbody tr').forEach(r => {
              if (r.rowIndex >= minR && r.rowIndex <= maxR) {
                Array.from(r.children).forEach(c => {
                  if (c.tagName === 'TD' && c.cellIndex >= minC && c.cellIndex <= maxC) {
                    c.classList.add('excel-cell-selected');
                    if (r.rowIndex === minR) c.classList.add('excel-sel-top');
                    if (r.rowIndex === maxR) c.classList.add('excel-sel-bottom');
                    if (c.cellIndex === minC) c.classList.add('excel-sel-left');
                    if (c.cellIndex === maxC) c.classList.add('excel-sel-right');
                  }
                });
              }
            });
            showToast('Spreadsheet content area selected (Excel perimeter border)', 'info');
          }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          if (window._activeExcelCell && document.activeElement === window._activeExcelCell) {
            setTimeout(() => {
              if (formulaInput) formulaInput.value = window._activeExcelCell.textContent || '';
              window.DocFlow.Editor?.notifyChange();
            }, 0);
          }
        }
      });
    }

    if (!editor._focusLockedToExcel) {
      editor._focusLockedToExcel = true;
      editor.addEventListener('click', e => {
        if (editor.querySelector('.excel-spreadsheet-container')) {
          if (!e.target.closest('.excel-spreadsheet-container')) {
            e.preventDefault();
            e.stopPropagation();
            if (window._activeExcelCell) {
              window._activeExcelCell.focus();
            } else {
              container.querySelector('td')?.focus();
            }
          }
        }
      });
    }
  }

  // Watermark Inner HTML Generator
  function buildWatermarkHtml(activeWm) {
    if (!activeWm || !activeWm.text || activeWm.text === 'none') return '';
    const text = activeWm.text;
    const angle = activeWm.angle !== undefined ? activeWm.angle : -35;
    const color = activeWm.color || 'rgba(148, 163, 184, 0.18)';
    const pos = activeWm.pos || 'center';
    const count = activeWm.count || '1';

    let alignStyle = 'align-items: center; justify-content: center;';
    if (pos === 'top') alignStyle = 'align-items: flex-start; justify-content: center; padding-top: 80px;';
    if (pos === 'bottom') alignStyle = 'align-items: flex-end; justify-content: center; padding-bottom: 80px;';

    const singleSpan = `<span style="font-size: 64px; font-weight: 800; color: ${color}; transform: rotate(${angle}deg); letter-spacing: 10px; text-transform: uppercase; margin: 20px; display: inline-block;">${escHtml(text)}</span>`;

    let inner = singleSpan;
    if (count === '2') {
      inner = `<div style="display:flex; flex-direction:column; justify-content:space-around; height:100%; width:100%; align-items:center;">${singleSpan}${singleSpan}</div>`;
    } else if (count === '4') {
      inner = `<div style="display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; height:100%; width:100%; place-items:center;">${singleSpan}${singleSpan}${singleSpan}${singleSpan}</div>`;
    } else if (count === 'repeat') {
      inner = `<div style="display:flex; flex-wrap:wrap; justify-content:space-around; align-content:space-around; height:100%; width:100%; opacity:0.85;">${singleSpan.repeat(8)}</div>`;
    }

    return inner;
  }

  // Ribbon Action Handlers
  function initRibbon() {
    // 1. Tab buttons
    $$('.ribbon-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchRibbonTab(btn.dataset.ribbon);
      });
    });

    // 2. File Panel
    $('#ribbonNewBtn')?.addEventListener('click', () => openModal('#newDocModal'));
    $('#ribbonOpenBtn')?.addEventListener('click', () => $('#openBtn')?.click());
    $('#ribbonFilePrintBtn')?.addEventListener('click', triggerPrint);

    // File Panel Office Buttons (Word, Excel, PPT, PDF - Bug 2)
    $('#ribbonNewWordBtn')?.addEventListener('click', () => createNewDocDirect('docx', 'Untitled Word Document'));
    $('#ribbonNewExcelBtn')?.addEventListener('click', () => createNewDocDirect('xlsx', 'Workbook'));
    $('#ribbonNewPptBtn')?.addEventListener('click', () => createNewDocDirect('pptx', 'Presentation'));
    $('#ribbonNewPdfBtn')?.addEventListener('click', () => createNewDocDirect('pdf', 'Document'));

    // File Panel Save Dropdown (Bug 6: HTML, Text, Markdown, PDF, Merge PDFs, Print)
    const ribbonSaveDropdownBtn = $('#ribbonSaveDropdownBtn');
    const ribbonSaveDropdown = $('#ribbonSaveDropdown');
    if (ribbonSaveDropdownBtn && ribbonSaveDropdown) {
      ribbonSaveDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = ribbonSaveDropdown.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(ribbonSaveDropdownBtn, ribbonSaveDropdown);
          } else {
            ribbonSaveDropdown.classList.add('show');
          }
        }
      });
    }

    $('#ribbonSaveHtml')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsHtml();
    });
    $('#ribbonSaveTxt')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsTxt();
    });
    $('#ribbonSaveMd')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsMarkdown();
    });
    $('#ribbonSavePdf')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.exportAsPdf();
    });
    $('#ribbonMergeBtn')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      openModal('#pdfMergeModal');
    });
    $('#ribbonPrintBtn')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      triggerPrint();
    });

    // Auto-Save Toggle Button in File Panel
    $('#autoSaveToggleBtn')?.addEventListener('click', () => {
      autoSaveEnabled = !autoSaveEnabled;
      try {
        localStorage.setItem('df-autosave', autoSaveEnabled ? 'true' : 'false');
      } catch (e) { }
      updateAutoSaveUI();
      showToast(`Auto-Save is now ${autoSaveEnabled ? 'ON (5s timer)' : 'OFF'}`, autoSaveEnabled ? 'success' : 'info');
    });

    // Home Panel Office Integration Buttons (Issue 4: Sort Dropdown handled in editor.js)
    $('#homePptShadowBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.toggleTextShadow();
    });

    // 3. Insert Panel (Date, Symbol, Checklist, Note, Paint, Office Embeds)
    $('#ribbonInsertChartBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#chartModal');
    });
    $('#chartCancelBtn')?.addEventListener('click', () => closeModal('#chartModal'));
    $('#chartInsertBtn')?.addEventListener('click', insertChartIntoDocument);

    // Line Customization Modal Trigger (Issue 4)
    $('#ribbonInsertHrBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.openLineModal();
    });

    // PPT Slide Dropdown & actions (Issue 4: Next Slide / Outside & Nested Slide / Inside)
    const pptSlideDropdownBtn = $('#ribbonInsertPptSlideBtn');
    const pptSlidePopover = $('#pptSlidePopover');
    if (pptSlideDropdownBtn && pptSlidePopover) {
      pptSlideDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = pptSlidePopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(pptSlideDropdownBtn, pptSlidePopover);
          } else {
            pptSlidePopover.classList.add('show');
          }
        }
      });
    }

    $('#pptInsertNextSlideBtn')?.addEventListener('click', () => {
      $('#pptSlidePopover')?.classList.remove('show');
      insertPptSlide(false);
    });
    $('#pptInsertNestedSlideBtn')?.addEventListener('click', () => {
      $('#pptSlidePopover')?.classList.remove('show');
      insertPptSlide(true);
    });

    // 3. Insert Panel (Date, Symbol, Checklist, Note, Paint)
    $('#ribbonInsertDateBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const now = new Date();
      const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      window.DocFlow.Editor?.insertHtmlAtCursor(dateStr + ' ');
      showToast('Inserted current date', 'info');
    });

    $('#ribbonInsertSymbolBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#symbolModal');
    });

    // OneNote Checklist & Sticky Note (Bug 8)
    $('#insertChecklistBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const checklistHtml = `<div class="onenote-checklist-item"><input type="checkbox" class="onenote-checklist-checkbox"><span class="onenote-checklist-text" contenteditable="true">To-do item...</span></div><p><br></p>`;
      window.DocFlow.Editor?.insertHtmlAtCursor(checklistHtml);
      showToast('Inserted Interactive Checklist', 'info');
    });

    $('#insertStickyNoteBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const noteHtml = `<div class="onenote-sticky-note" contenteditable="true"><strong><i class="fas fa-note-sticky"></i> Note:</strong> Write your note here...</div><p><br></p>`;
      window.DocFlow.Editor?.insertHtmlAtCursor(noteHtml);
      showToast('Inserted Sticky Note', 'info');
    });

    const insertPageBreakAction = () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      window.DocFlow.Editor?.insertHtmlAtCursor(
        '<div class="doc-page-break" contenteditable="false"><div class="doc-page-break-line"><span>Page Break</span></div></div><p><br></p>'
      );
      window.DocFlow.Editor?.notifyChange();
      showToast('Page break inserted', 'info');
    };
    $('#layoutPageBreakBtn')?.addEventListener('click', insertPageBreakAction);
    $('#ribbonInsertPageBreakBtn')?.addEventListener('click', insertPageBreakAction);

    // 4. Layout Panel (Margins, Paper Size, Multi-Columns, Watermark)
    // Margins Popover
    const marginBtn = $('#marginDropdownBtn');
    const marginPopover = $('#marginPopover');
    if (marginBtn && marginPopover) {
      marginBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = marginPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(marginBtn, marginPopover);
          } else {
            marginPopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-margin]').forEach(item => {
        item.addEventListener('click', () => {
          const type = item.dataset.margin;
          if (type === 'custom') {
            marginPopover.classList.remove('show');
            openModal('#customMarginModal');
            return;
          }
          applyMarginPreset(type);
          $$('.margin-opt-item[data-margin]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          marginPopover.classList.remove('show');
        });
      });
    }

    // Custom Margins Dialog (Bug 5)
    $('#marginCustomItem')?.addEventListener('click', () => {
      marginPopover?.classList.remove('show');
      openModal('#customMarginModal');
    });

    $('#customMarginCancel')?.addEventListener('click', () => closeModal('#customMarginModal'));
    $('#customMarginApply')?.addEventListener('click', () => {
      const top = parseInt($('#customMarginTop')?.value, 10) || 72;
      const bottom = parseInt($('#customMarginBottom')?.value, 10) || 72;
      const left = parseInt($('#customMarginLeft')?.value, 10) || 72;
      const right = parseInt($('#customMarginRight')?.value, 10) || 72;
      const page = $('.editor-page');
      if (page) {
        page.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
        showToast(`Custom margins applied: ${top}px, ${right}px, ${bottom}px, ${left}px`, 'success');
      }
      closeModal('#customMarginModal');
    });

    function applyMarginPreset(type) {
      const page = $('.editor-page');
      if (!page) return;
      switch (type) {
        case 'normal':
          page.style.padding = '72px 72px';
          showToast('Margins: Normal (1 inch)', 'info');
          break;
        case 'narrow':
          page.style.padding = '36px 36px';
          showToast('Margins: Narrow (0.5 inch)', 'info');
          break;
        case 'moderate':
          page.style.padding = '72px 54px';
          showToast('Margins: Moderate (1" Top/Bottom, 0.75" Left/Right)', 'info');
          break;
        case 'wide':
          page.style.padding = '72px 108px';
          showToast('Margins: Wide (1.5 inch)', 'info');
          break;
        case 'mirrored':
          page.style.padding = '72px 90px 72px 72px';
          showToast('Margins: Mirrored', 'info');
          break;
        case 'office2003':
          page.style.padding = '72px 90px';
          showToast('Margins: Office 2003 Default', 'info');
          break;
        case 'zero':
          page.style.padding = '16px 20px';
          showToast('Margins: Zero / Full Width', 'info');
          break;
      }
    }

    // Page Size Popover
    const pageSizeBtn = $('#pageSizeDropdownBtn');
    const pageSizePopover = $('#pageSizePopover');
    if (pageSizeBtn && pageSizePopover) {
      pageSizeBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = pageSizePopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(pageSizeBtn, pageSizePopover);
          } else {
            pageSizePopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-size]').forEach(item => {
        item.addEventListener('click', () => {
          const size = item.dataset.size;
          applyPageSize(size);
          $$('.margin-opt-item[data-size]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          pageSizePopover.classList.remove('show');
        });
      });
    }

    function applyPageSize(size) {
      const page = $('.editor-page');
      if (!page) return;
      const wrap = $('#editorWrap');

      if (size === 'full') {
        if (wrap) wrap.classList.add('full-size-active');
        page.style.maxWidth = '100%';
        page.style.width = '100%';
        page.style.minHeight = '100%';
        page.style.height = '100%';
        showToast('Paper Size: Full Page (Full width & height edge-to-edge)', 'info');
        return;
      }

      if (wrap) wrap.classList.remove('full-size-active');
      page.style.width = '';
      page.style.height = '';

      switch (size) {
        case 'letter':
          page.style.maxWidth = '816px';
          page.style.minHeight = '1056px';
          showToast('Paper Size: Letter (8.5" × 11")', 'info');
          break;
        case 'a4':
          page.style.maxWidth = '794px';
          page.style.minHeight = '1123px';
          showToast('Paper Size: A4 (210 × 297 mm)', 'info');
          break;
        case 'legal':
          page.style.maxWidth = '816px';
          page.style.minHeight = '1344px';
          showToast('Paper Size: Legal (8.5" × 14")', 'info');
          break;
        case 'custom':
          openModal('#customPageSizeModal');
          break;
        case 'executive':
          page.style.maxWidth = '696px';
          page.style.minHeight = '1008px';
          showToast('Paper Size: Executive (7.25" × 10.5")', 'info');
          break;
        case 'a3':
          page.style.maxWidth = '1123px';
          page.style.minHeight = '1587px';
          showToast('Paper Size: A3 (297 × 420 mm)', 'info');
          break;
        case 'a5':
          page.style.maxWidth = '560px';
          page.style.minHeight = '794px';
          showToast('Paper Size: A5 (148 × 210 mm)', 'info');
          break;
        case 'b4':
          page.style.maxWidth = '945px';
          page.style.minHeight = '1334px';
          showToast('Paper Size: B4 (250 × 353 mm)', 'info');
          break;
        case 'b5':
          page.style.maxWidth = '688px';
          page.style.minHeight = '971px';
          showToast('Paper Size: B5 (182 × 257 mm)', 'info');
          break;
        case 'tabloid':
          page.style.maxWidth = '1056px';
          page.style.minHeight = '1632px';
          showToast('Paper Size: Tabloid (11" × 17")', 'info');
          break;
        case 'statement':
          page.style.maxWidth = '528px';
          page.style.minHeight = '816px';
          showToast('Paper Size: Statement (5.5" × 8.5")', 'info');
          break;
        case 'envelope':
          page.style.maxWidth = '416px';
          page.style.minHeight = '832px';
          showToast('Paper Size: Envelope DL', 'info');
          break;
      }
    }

    // Custom Page Size Dialog
    $('#pageSizeCustomItem')?.addEventListener('click', () => {
      pageSizePopover?.classList.remove('show');
      openModal('#customPageSizeModal');
    });

    $('#customPageSizeCancel')?.addEventListener('click', () => closeModal('#customPageSizeModal'));
    $('#customPageSizeApply')?.addEventListener('click', () => {
      const w = parseInt($('#customPageWidth')?.value, 10) || 816;
      const h = parseInt($('#customPageHeight')?.value, 10) || 1056;
      const page = $('.editor-page');
      if (page) {
        page.style.maxWidth = `${w}px`;
        page.style.width = `${w}px`;
        page.style.minHeight = `${h}px`;
        showToast(`Custom Page Size applied: ${w}px × ${h}px`, 'success');
      }
      closeModal('#customPageSizeModal');
    });

    // Columns Popover
    const columnsBtn = $('#columnsDropdownBtn');
    const columnsPopover = $('#columnsPopover');
    if (columnsBtn && columnsPopover) {
      columnsBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = columnsPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(columnsBtn, columnsPopover);
          } else {
            columnsPopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-columns]').forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.columns;
          if (val === 'discrete-2') {
            const discreteHtml = `
              <div class="doc-column-grid" contenteditable="false">
                <div class="doc-col-pane" contenteditable="true"><p>Column 1 content...</p></div>
                <div class="doc-col-divider"></div>
                <div class="doc-col-pane" contenteditable="true"><p>Column 2 content...</p></div>
              </div><p><br></p>`;
            window.DocFlow.Editor?.insertHtmlAtCursor(discreteHtml);
            window.DocFlow.Editor?.notifyChange();
            showToast('Inserted 2-column panes (click each column to write independently)', 'success');
          } else {
            const cols = parseInt(val, 10) || 1;
            applyColumns(cols);
          }
          $$('.margin-opt-item[data-columns]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          columnsPopover.classList.remove('show');
        });
      });

      // Insert Column Break nested inside Columns popover (Issue 5)
      $('#popoverColumnBreakItem')?.addEventListener('click', () => {
        columnsPopover.classList.remove('show');
        window.DocFlow.Editor?.insertColumnBreak();
      });
    }

    function applyColumns(cols) {
      const page = $('.editor-page');
      if (!page) return;
      page.dataset.columns = cols;
      page.style.columnCount = cols;
      page.style.columnGap = cols > 1 ? '36px' : 'normal';
      page.style.columnRule = cols > 1 ? '1px solid var(--border)' : 'none'; // Dividing line between columns
      page.style.columnFill = 'auto';
      showToast(`Layout: ${cols} Column${cols > 1 ? 's' : ''}`, 'info');
    }

    // Page Orientation, Borders, and Print Area (Issue 5)
    $('#layoutOrientationBtn')?.addEventListener('click', togglePageOrientation);
    $('#layoutPageBordersBtn')?.addEventListener('click', togglePageBorders);
    $('#layoutPrintAreaBtn')?.addEventListener('click', setPrintArea);

    // Watermark Popover
    const watermarkBtn = $('#watermarkDropdownBtn');
    const watermarkPopover = $('#watermarkPopover');
    if (watermarkBtn && watermarkPopover) {
      watermarkBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = watermarkPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(watermarkBtn, watermarkPopover);
          } else {
            watermarkPopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-watermark]').forEach(item => {
        item.addEventListener('click', () => {
          const wm = item.dataset.watermark;
          if (wm === 'custom') {
            watermarkPopover.classList.remove('show');
            openModal('#customWatermarkModal');
            return;
          }
          applyWatermark(wm);
          $$('.margin-opt-item[data-watermark]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          watermarkPopover.classList.remove('show');
        });
      });
    }

    // Custom Watermark Options (Angle, Opacity, Position, Count)
    $('#watermarkCustomOption')?.addEventListener('click', () => {
      watermarkPopover?.classList.remove('show');
      openModal('#customWatermarkModal');
    });

    $('#customWatermarkAngle')?.addEventListener('input', e => {
      const l = $('#watermarkAngleVal');
      if (l) l.textContent = `${e.target.value}°`;
    });
    $('#customWatermarkOpacity')?.addEventListener('input', e => {
      const l = $('#watermarkOpacityVal');
      if (l) l.textContent = `${e.target.value}%`;
    });

    $('#customWatermarkCancel')?.addEventListener('click', () => closeModal('#customWatermarkModal'));
    $('#customWatermarkApply')?.addEventListener('click', () => {
      const text = $('#customWatermarkText')?.value.trim() || 'CONFIDENTIAL';
      const angle = parseInt($('#customWatermarkAngle')?.value, 10) || -35;
      const opacityVal = (parseInt($('#customWatermarkOpacity')?.value, 10) || 18) / 100;
      const pos = $('#customWatermarkPosition')?.value || 'center';
      const count = $('#customWatermarkCount')?.value || '1';
      const colorTone = $('#customWatermarkColor')?.value || '148, 163, 184';
      const rgbaColor = `rgba(${colorTone}, ${opacityVal})`;

      applyWatermark(text, angle, rgbaColor, pos, count);
      closeModal('#customWatermarkModal');
    });

    function applyWatermark(text, angle = -35, color = 'rgba(148, 163, 184, 0.18)', pos = 'center', count = '1') {
      const page = $('.editor-page');
      if (!page) return;
      let existingWm = page.querySelector('.doc-watermark-overlay');
      if (!existingWm) {
        existingWm = document.createElement('div');
        existingWm.className = 'doc-watermark-overlay';
        page.style.position = 'relative';
        page.prepend(existingWm);
      }

      if (!text || text === 'none') {
        existingWm.remove();
        window.DocFlow.activeWatermark = null;
        showToast('Watermark removed', 'info');
        return;
      }

      window.DocFlow.activeWatermark = { text, angle, color, pos, count };

      let alignStyle = 'align-items: center; justify-content: center;';
      if (pos === 'top') alignStyle = 'align-items: flex-start; justify-content: center; padding-top: 80px;';
      if (pos === 'bottom') alignStyle = 'align-items: flex-end; justify-content: center; padding-bottom: 80px;';

      existingWm.style.cssText = `position: absolute; inset: 0; display: flex; ${alignStyle} pointer-events: none; z-index: 0; user-select: none; overflow: hidden;`;
      existingWm.innerHTML = buildWatermarkHtml(window.DocFlow.activeWatermark);
      showToast(`Watermark applied (${text})`, 'info');
    }

    // Layout Office Setup Buttons (Sheet Layout & Slide 16:9)
    $('#layoutExcelFitBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (!page) return;
      const isWide = page.classList.toggle('wide-sheet-mode');
      $('#layoutExcelFitBtn')?.classList.toggle('active', isWide);
      showToast(isWide ? 'Excel Sheet Layout: 1200px Wide Mode ON' : 'Excel Sheet Layout: OFF (Normal Width)', 'info');
    });
    $('#layoutPptAspectBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (!page) return;
      const isAspect = page.classList.toggle('slide-aspect-mode');
      $('#layoutPptAspectBtn')?.classList.toggle('active', isAspect);
      showToast(isAspect ? 'PowerPoint 16:9 Aspect Ratio ON' : 'PowerPoint 16:9 Aspect Ratio OFF', 'info');
    });

    // Dismiss Layout, View, PPT, Excel & Bullet Popovers on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#marginDropdownWrap') &&
          !e.target.closest('#pageSizeDropdownWrap') &&
          !e.target.closest('#columnsDropdownWrap') &&
          !e.target.closest('#watermarkDropdownWrap') &&
          !e.target.closest('#hyphenDropdownWrap') &&
          !e.target.closest('#pageBorderDropdownWrap') &&
          !e.target.closest('#pptNewSlideDropdownWrap') &&
          !e.target.closest('#pptLayoutDropdownWrap') &&
          !e.target.closest('#pptBgImageDropdownWrap') &&
          !e.target.closest('#pptTransitionDropdownWrap') &&
          !e.target.closest('#excelFormulaDropdownWrap') &&
          !e.target.closest('#excelBorderDropdownWrap') &&
          !e.target.closest('#pptSlideDropdownWrap') &&
          !e.target.closest('#paraSpacingDropdownWrap') &&
          !e.target.closest('#pagePaddingDropdownWrap') &&
          !e.target.closest('#zoomPresetsDropdownWrap') &&
          !e.target.closest('.pptx-sidebar-add-wrap') &&
          !e.target.closest('.bullet-dropdown-wrap')) {
        $('#marginPopover')?.classList.remove('show');
        $('#pageSizePopover')?.classList.remove('show');
        $('#columnsPopover')?.classList.remove('show');
        $('#watermarkPopover')?.classList.remove('show');
        $('#hyphenPopover')?.classList.remove('show');
        $('#pageBorderPopover')?.classList.remove('show');
        $('#paraSpacingPopover')?.classList.remove('show');
        $('#pagePaddingPopover')?.classList.remove('show');
        $('#zoomPresetsPopover')?.classList.remove('show');
        $('#pptNewSlidePopover')?.classList.remove('show');
        $('#pptLayoutPopover')?.classList.remove('show');
        $('#pptBgImagePopover')?.classList.remove('show');
        $('#pptTransitionPopover')?.classList.remove('show');
        $('#excelFormulaPopover')?.classList.remove('show');
        $('#excelBorderPopover')?.classList.remove('show');
        $('#pptSlidePopover')?.classList.remove('show');
        $('#pptxSidebarAddPopover')?.classList.remove('show');
      }
    });

    // 5. Layout Ribbon Panel Controls (Issue 3: Page Color, Spacing, Padding, Border, Hyphenation)
    $('#layoutPageBgInput')?.addEventListener('input', e => {
      const color = e.target.value;
      const page = $('.editor-page');
      if (page) {
        page.style.backgroundColor = color;
        window.DocFlow.Editor?.notifyChange();
        showToast(`Page background color set to ${color}`, 'info');
      }
    });

    $('#layoutParaSpacingBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#paraSpacingPopover');
      const btn = $('#layoutParaSpacingBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#paraSpacingPopover .margin-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        const spacing = item.dataset.spacing;
        const editor = $('#editor');
        if (editor) {
          editor.classList.remove('para-spacing-tight', 'para-spacing-relaxed', 'para-spacing-double');
          if (spacing !== 'normal') editor.classList.add(`para-spacing-${spacing}`);
          $$('#paraSpacingPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showToast(`Paragraph spacing: ${spacing}`, 'info');
          window.DocFlow.Editor?.notifyChange();
        }
        $('#paraSpacingPopover')?.classList.remove('show');
      });
    });

    $('#layoutPagePaddingBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pagePaddingPopover');
      const btn = $('#layoutPagePaddingBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#pagePaddingPopover .margin-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        const pad = item.dataset.padding;
        const page = $('.editor-page');
        if (page) {
          const padMap = { compact: '36px 36px', normal: '72px 72px', spacious: '96px 96px', edge: '12px 16px' };
          page.style.padding = padMap[pad] || '72px 72px';
          $$('#pagePaddingPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showToast(`Page padding: ${pad}`, 'info');
          window.DocFlow.Editor?.notifyChange();
        }
        $('#pagePaddingPopover')?.classList.remove('show');
      });
    });

    $('#layoutHyphenBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#hyphenPopover');
      const btn = $('#layoutHyphenBtn');
      if (pop?.classList.contains('show')) {
        pop.classList.remove('show');
      } else if (pop && btn) {
        window.DocFlow.UI.positionPopover(btn, pop);
      }
    });
    $$('#hyphenPopover .margin-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        const hyp = item.dataset.hyphen;
        const page = $('.editor-page');
        if (page) {
          const isAuto = hyp === 'auto';
          page.classList.toggle('doc-hyphen-auto', isAuto);
          $$('#hyphenPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showToast(`Hyphenation: ${isAuto ? 'Automatic' : 'None'}`, 'info');
        }
        $('#hyphenPopover')?.classList.remove('show');
      });
    });

    // Layout Ribbon Controls (Page Color, Custom Border, Text Direction)
    $('#layoutPageBgBtn')?.addEventListener('click', () => {
      $('#layoutPageBgInput')?.click();
    });
    $('#layoutPageBgInput')?.addEventListener('input', e => {
      const color = e.target.value;
      const page = $('.editor-page');
      if (page) {
        page.style.setProperty('background-color', color, 'important');
        page.style.backgroundColor = color;
        window.DocFlow.Editor?.notifyChange();
      }
    });
    $('#layoutPageBgInput')?.addEventListener('change', e => {
      window.DocFlow.Editor?.saveSnapshot?.();
      showToast(`Page background color set to ${e.target.value}`, 'info');
    });

    $('#layoutPageBorderBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pageBorderPopover');
      const btn = $('#layoutPageBorderBtn');
      if (pop?.classList.contains('show')) {
        pop.classList.remove('show');
      } else if (pop && btn) {
        window.DocFlow.UI.positionPopover(btn, pop);
      }
    });

    $('#customPageBorderOpt')?.addEventListener('click', () => {
      $('#pageBorderPopover')?.classList.remove('show');
      openModal('#customPageBorderModal');
    });

    $$('#pageBorderPopover .margin-opt-item:not(#customPageBorderOpt)').forEach(item => {
      item.addEventListener('click', () => {
        const borderStyle = item.dataset.border;
        const page = $('.editor-page');
        if (page) {
          window.DocFlow.Editor?.saveSnapshot?.();
          page.style.border = '';
          page.style.borderRadius = '';
          page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
          if (borderStyle === 'box') page.classList.add('page-border-box');
          else if (borderStyle === 'shadow') page.classList.add('page-border-shadow');
          else if (borderStyle === 'double') page.classList.add('page-border-double');
          $$('#pageBorderPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          window.DocFlow.Editor?.notifyChange();
          showToast(`Page Border: ${borderStyle}`, 'info');
        }
        $('#pageBorderPopover')?.classList.remove('show');
      });
    });

    $('#layoutTextDirBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (page) {
        const isRtl = page.classList.toggle('dir-rtl');
        $('#layoutTextDirBtn')?.classList.toggle('active', isRtl);
        showToast(isRtl ? 'Text Direction: Right-to-Left (RTL)' : 'Text Direction: Left-to-Right (LTR)', 'info');
      }
    });

    // 6. View Ribbon Panel Controls (Issue 2: Split Window, Status Bar toggle)
    $('#viewToggleStatusbarBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode === 'empty') {
        showToast('Status bar is permanently displayed on Home screen', 'info');
      }
      const isHidden = document.body.classList.toggle('editor-statusbar-hidden');
      $('#viewToggleStatusbarBtn')?.classList.toggle('active', isHidden);
      showToast(isHidden ? 'Status bar hidden (in editors only)' : 'Status bar visible', 'info');
    });

    const splitDividerEl = $('#splitDividerBar');
    const editorWrapPane = $('#editorWrap');
    const splitMirrorPaneEl = $('#splitMirrorPane');
    const mainContentArea = $('#mainContent');

    $('#viewSplitWindowBtn')?.addEventListener('click', () => {
      const isSplit = document.body.classList.toggle('has-split-window');
      $('#viewSplitWindowBtn')?.classList.toggle('active', isSplit);
      const editor = $('#editor');
      const mirror = $('#editorSplitMirror');
      if (isSplit && editor && mirror) {
        mirror.innerHTML = editor.innerHTML;
        mirror.contentEditable = 'true';
      } else {
        if (editorWrapPane) {
          editorWrapPane.style.flex = '';
          editorWrapPane.style.height = '';
        }
        if (splitMirrorPaneEl) {
          splitMirrorPaneEl.style.flex = '';
          splitMirrorPaneEl.style.height = '';
        }
      }
      showToast(isSplit ? 'Dual-pane Split Window: ON' : 'Split Window: OFF', 'info');
    });

    // Resizable Split Divider Drag Handler
    if (splitDividerEl && editorWrapPane && splitMirrorPaneEl && mainContentArea) {
      let isDraggingSplit = false;

      const onSplitDrag = e => {
        if (!isDraggingSplit) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = mainContentArea.getBoundingClientRect();
        const offset = clientY - rect.top;
        const totalHeight = rect.height;
        if (totalHeight > 0) {
          const percent = Math.min(85, Math.max(15, (offset / totalHeight) * 100));
          editorWrapPane.style.flex = `0 0 ${percent}%`;
          editorWrapPane.style.height = `${percent}%`;
          splitMirrorPaneEl.style.flex = `0 0 ${100 - percent}%`;
          splitMirrorPaneEl.style.height = `${100 - percent}%`;
        }
      };

      const onSplitDragEnd = () => {
        if (isDraggingSplit) {
          isDraggingSplit = false;
          splitDividerEl.classList.remove('dragging');
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
        }
      };

      splitDividerEl.addEventListener('mousedown', e => {
        e.preventDefault();
        isDraggingSplit = true;
        splitDividerEl.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';
      });

      splitDividerEl.addEventListener('touchstart', () => {
        isDraggingSplit = true;
        splitDividerEl.classList.add('dragging');
      }, { passive: true });

      window.addEventListener('mousemove', onSplitDrag);
      window.addEventListener('touchmove', onSplitDrag, { passive: true });
      window.addEventListener('mouseup', onSplitDragEnd);
      window.addEventListener('touchend', onSplitDragEnd);
      window.addEventListener('touchcancel', onSplitDragEnd);
    }

    const editorMainEl = $('#editor');
    const editorSplitEl = $('#editorSplitMirror');
    if (editorMainEl && editorSplitEl) {
      editorMainEl.addEventListener('input', () => {
        if (document.body.classList.contains('has-split-window') && document.activeElement === editorMainEl) {
          editorSplitEl.innerHTML = editorMainEl.innerHTML;
        }
      });
      editorSplitEl.addEventListener('input', () => {
        if (document.body.classList.contains('has-split-window') && document.activeElement === editorSplitEl) {
          editorMainEl.innerHTML = editorSplitEl.innerHTML;
          window.DocFlow.Editor?.notifyChange();
        }
      });
    }

    $('#viewHighContrastBtn')?.addEventListener('click', () => {
      const wrap = $('#editorWrap');
      if (wrap) {
        const isContrast = wrap.classList.toggle('high-contrast-mode');
        $('#viewHighContrastBtn')?.classList.toggle('active', isContrast);
        showToast(isContrast ? 'High Contrast Mode: ON' : 'High Contrast: OFF', 'info');
      }
    });

    // 7. Dedicated PPT Ribbon Panel Controls (Issue 4)
    $('#pptNewSlideMenuBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptNewSlidePopover');
      const btn = $('#pptNewSlideMenuBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#pptNewSlidePopover .spacing-opt-item[data-ppt-layout]').forEach(item => {
      item.addEventListener('click', () => {
        const layout = item.dataset.pptLayout || 'blank';
        insertPptSlide(false, layout);
        $('#pptNewSlidePopover')?.classList.remove('show');
      });
    });

    $('#pptDeleteSlideBtn')?.addEventListener('click', () => {
      deletePptSlide(currentActiveSlideIndex);
    });

    $('#pptDuplicateSlideBtn')?.addEventListener('click', () => {
      duplicatePptSlide();
    });

    // Presentation Themes & Palettes (Replacing duplicate layout button)
    $('#pptSlideThemeBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptSlideThemePopover');
      const btn = $('#pptSlideThemeBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    const PPT_THEMES_DICT = {
      ocean: { bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', text: '#f8fafc', border: '1px solid #3b82f6' },
      emerald: { bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', text: '#f0fdf4', border: '1px solid #10b981' },
      sunset: { bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)', text: '#fff7ed', border: '1px solid #f97316' },
      royal: { bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)', text: '#faf5ff', border: '1px solid #a855f7' },
      obsidian: { bg: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', text: '#f4f4f5', border: '1px solid #3f3f46' },
      monochrome: { bg: '#ffffff', text: '#0f172a', border: '2px solid #0f172a' }
    };

    $$('#pptSlideThemePopover .spacing-opt-item[data-ppt-theme]').forEach(item => {
      item.addEventListener('click', () => {
        const theme = PPT_THEMES_DICT[item.dataset.pptTheme];
        if (theme) {
          window.DocFlow.Editor?.saveSnapshot?.();
          const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
          const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
          const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
          if (card) {
            card.style.background = theme.bg;
            card.style.color = theme.text;
            card.style.border = theme.border;
            card.querySelectorAll('h1, h2, h3, h4, .slide-title-box, .slide-content-box').forEach(el => el.style.color = theme.text);
            window.DocFlow.Editor?.notifyChange();
            showToast(`Theme applied: ${item.textContent.trim()}`, 'success');
          }
        }
        $('#pptSlideThemePopover')?.classList.remove('show');
      });
    });

    $('#pptBgColorBtn')?.addEventListener('click', () => {
      $('#pptBgColorInput')?.click();
    });
    $('#pptBgColorInput')?.addEventListener('input', e => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
      if (card) {
        card.style.backgroundColor = e.target.value;
        window.DocFlow.Editor?.notifyChange();
      }
    });

    $('#pptBgImageBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptBgImagePopover');
      const btn = $('#pptBgImageBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $('#pptBgUploadDeviceBtn')?.addEventListener('click', () => {
      $('#pptBgFileInput')?.click();
      $('#pptBgImagePopover')?.classList.remove('show');
    });

    $('#pptBgFileInput')?.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
        if (card) {
          card.style.backgroundImage = `url(${ev.target.result})`;
          card.style.backgroundSize = 'cover';
          card.style.backgroundPosition = 'center';
          card.style.backgroundRepeat = 'no-repeat';
          window.DocFlow.Editor?.notifyChange();
          showToast('Slide background image applied from device', 'success');
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    $('#pptBgOnlineUrlBtn')?.addEventListener('click', () => {
      const url = prompt('Enter image URL for slide background:');
      if (url && url.trim()) {
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
        if (card) {
          card.style.backgroundImage = `url(${url.trim()})`;
          card.style.backgroundSize = 'cover';
          card.style.backgroundPosition = 'center';
          card.style.backgroundRepeat = 'no-repeat';
          window.DocFlow.Editor?.notifyChange();
          showToast('Online slide background image applied', 'success');
        }
      }
      $('#pptBgImagePopover')?.classList.remove('show');
    });

    $('#pptBgRemoveBtn')?.addEventListener('click', () => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
      if (card) {
        card.style.backgroundImage = 'none';
        window.DocFlow.Editor?.notifyChange();
        showToast('Slide background image removed', 'info');
      }
      $('#pptBgImagePopover')?.classList.remove('show');
    });

    // Speaker Notes Toggle
    $('#pptNotesBtn')?.addEventListener('click', () => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      if (!curSlide) return;
      let notes = curSlide.querySelector('.slide-speaker-notes');
      if (notes) {
        notes.remove();
        $('#pptNotesBtn')?.classList.remove('active');
        showToast('Speaker notes closed', 'info');
      } else {
        curSlide.insertAdjacentHTML('beforeend', `
          <div class="slide-speaker-notes">
            <div class="slide-speaker-notes-title"><i class="fas fa-comment-dots"></i> Speaker Notes</div>
            <div class="slide-speaker-notes-content" contenteditable="true">Click here to add presentation notes...</div>
          </div>
        `);
        $('#pptNotesBtn')?.classList.add('active');
        showToast('Speaker notes opened', 'success');
      }
      window.DocFlow.Editor?.notifyChange();
    });

    // Slide Transitions (Issue 3: Expanded transitions & animations)
    $('#pptTransitionBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptTransitionPopover');
      const btn = $('#pptTransitionBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#pptTransitionPopover .spacing-opt-item[data-transition]').forEach(item => {
      item.addEventListener('click', () => {
        const trans = item.dataset.transition;
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        if (curSlide) {
          curSlide.dataset.transition = trans;
          const card = curSlide.querySelector('.pptx-slide-card') || curSlide;
          card.classList.remove(
            'anim-ppt-fade', 'anim-ppt-slide', 'anim-ppt-push', 'anim-ppt-zoom', 'anim-ppt-flip',
            'anim-ppt-slide-up', 'anim-ppt-bounce', 'anim-ppt-rotate', 'anim-ppt-wipe', 'anim-ppt-blur', 'anim-ppt-cube'
          );
          if (trans && trans !== 'none') {
            void card.offsetWidth;
            card.classList.add(`anim-ppt-${trans}`);
          }
        }
        $$('#pptTransitionPopover .spacing-opt-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        showToast(`Slide transition applied: ${trans}`, 'success');
        $('#pptTransitionPopover')?.classList.remove('show');
      });
    });

    // Move Slides & Presentation Slide Show
    $('#pptMoveUpBtn')?.addEventListener('click', () => movePptSlide(-1));
    $('#pptMoveDownBtn')?.addEventListener('click', () => movePptSlide(1));
    $('#pptStartSlideShowBtn')?.addEventListener('click', startSlideShow);

    // 8. Dedicated Excel Ribbon Panel Controls (Issue 5)
    $('#excelMergeCellsBtn')?.addEventListener('click', () => {
      handleExcelTableAction('merge');
    });
    $('#excelUnmergeCellsBtn')?.addEventListener('click', () => {
      handleExcelTableAction('unmerge');
    });
    $('#excelAddRowAboveBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-row-above');
    });
    $('#excelAddRowBelowBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-row-below');
    });
    $('#excelDelRowBtn')?.addEventListener('click', () => {
      handleExcelTableAction('delete-row');
    });
    $('#excelAddColLeftBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-col-left');
    });
    $('#excelAddColRightBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-col-right');
    });
    $('#excelDelColBtn')?.addEventListener('click', () => {
      handleExcelTableAction('delete-col');
    });

    $('#excelFormulaBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#excelFormulaPopover');
      const btn = $('#excelFormulaBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#excelFormulaPopover .spacing-opt-item[data-formula]').forEach(item => {
      item.addEventListener('click', () => {
        applyExcelFormula(item.dataset.formula);
        $('#excelFormulaPopover')?.classList.remove('show');
      });
    });

    $('#excelFmtCurrencyBtn')?.addEventListener('click', () => {
      const cell = getActiveTableCell();
      if (cell) {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]/g, '')) || 0;
        cell.textContent = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        window.DocFlow.Editor?.notifyChange();
        showToast('Formatted as Currency ($)', 'info');
      } else showToast('Click inside a table cell first', 'info');
      restoreCellFocus(cell);
    });

    $('#excelFmtPercentBtn')?.addEventListener('click', () => {
      const cell = getActiveTableCell();
      if (cell) {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]/g, '')) || 0;
        cell.textContent = `${(num * (num < 1 ? 100 : 1)).toFixed(1)}%`;
        window.DocFlow.Editor?.notifyChange();
        showToast('Formatted as Percentage (%)', 'info');
      } else showToast('Click inside a table cell first', 'info');
      restoreCellFocus(cell);
    });

    $('#excelFmtDecimalIncBtn')?.addEventListener('click', () => {
      const cell = getActiveTableCell();
      if (cell) {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]/g, '')) || 0;
        cell.textContent = num.toFixed(2);
        window.DocFlow.Editor?.notifyChange();
      }
      restoreCellFocus(cell);
    });

    $('#excelFmtDecimalDecBtn')?.addEventListener('click', () => {
      const cell = getActiveTableCell();
      if (cell) {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]/g, '')) || 0;
        cell.textContent = num.toFixed(1);
        window.DocFlow.Editor?.notifyChange();
      }
      restoreCellFocus(cell);
    });

    $('#excelBorderBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#excelBorderPopover');
      const btn = $('#excelBorderBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#excelBorderPopover .spacing-opt-item[data-border]').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.border;
        if (type === 'custom') {
          $('#excelBorderPopover')?.classList.remove('show');
          openModal('#excelCustomBorderModal');
          return;
        }

        const cell = getActiveTableCell();
        const table = cell ? cell.closest('table') : document.querySelector('#editor table');
        if (table) {
          window.DocFlow.Editor?.saveSnapshot?.();
          const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
          const targets = selected.length > 0 ? selected : (cell ? [cell] : Array.from(table.querySelectorAll('td')));
          targets.forEach(c => {
            if (type === 'all') {
              c.style.border = '1px solid var(--border, #cbd5e1)';
            } else if (type === 'outside') {
              c.style.border = '2px solid var(--accent, #16a34a)';
            } else if (type === 'thick-bottom') {
              c.style.borderBottom = '3px solid #0f172a';
            } else if (type === 'top-bottom') {
              c.style.borderTop = '1px solid var(--border, #cbd5e1)';
              c.style.borderBottom = '2px double #0f172a';
            } else if (type === 'left') {
              c.style.borderLeft = '2px solid var(--accent, #16a34a)';
            } else if (type === 'right') {
              c.style.borderRight = '2px solid var(--accent, #16a34a)';
            } else if (type === 'top') {
              c.style.borderTop = '2px solid var(--accent, #16a34a)';
            } else if (type === 'bottom') {
              c.style.borderBottom = '2px solid var(--accent, #16a34a)';
            } else if (type === 'none') {
              c.style.border = '1px solid transparent';
            }
          });
          window.DocFlow.Editor?.notifyChange();
          showToast(`Border style applied: ${type}`, 'info');
        }
        $('#excelBorderPopover')?.classList.remove('show');
        restoreCellFocus(cell);
      });
    });

    // Excel Custom Border Dialog Wiring (Issue 4)
    $('#excelCustomBorderBtn')?.addEventListener('click', () => {
      $('#excelBorderPopover')?.classList.remove('show');
      openModal('#excelCustomBorderModal');
    });

    $('#excelBorderColorInput')?.addEventListener('input', e => {
      const hex = $('#excelBorderColorHex');
      if (hex) hex.textContent = e.target.value;
    });

    $('#excelCustomBorderCloseBtn')?.addEventListener('click', () => {
      closeModal('#excelCustomBorderModal');
    });
    $('#excelCustomBorderCancelBtn')?.addEventListener('click', () => {
      closeModal('#excelCustomBorderModal');
    });

    $('#excelCustomBorderApplyBtn')?.addEventListener('click', () => {
      const width = $('#excelBorderWidthInput')?.value || '1px';
      const style = $('#excelBorderStyleInput')?.value || 'solid';
      const color = $('#excelBorderColorInput')?.value || '#16a34a';
      const sides = $('#excelBorderSidesInput')?.value || 'all';

      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (!table) {
        showToast('Please click inside an Excel spreadsheet first', 'warning');
        closeModal('#excelCustomBorderModal');
        return;
      }

      window.DocFlow.Editor?.saveSnapshot?.();
      const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
      const targets = selected.length > 0 ? selected : (cell ? [cell] : Array.from(table.querySelectorAll('td')));
      const borderRule = `${width} ${style} ${color}`;

      if (sides === 'outline') {
        const minR = Math.min(...targets.map(c => c.closest('tr').rowIndex));
        const maxR = Math.max(...targets.map(c => c.closest('tr').rowIndex));
        const minC = Math.min(...targets.map(c => c.cellIndex));
        const maxC = Math.max(...targets.map(c => c.cellIndex));

        targets.forEach(c => {
          const rIdx = c.closest('tr').rowIndex;
          const cIdx = c.cellIndex;
          if (rIdx === minR) c.style.borderTop = borderRule;
          if (rIdx === maxR) c.style.borderBottom = borderRule;
          if (cIdx === minC) c.style.borderLeft = borderRule;
          if (cIdx === maxC) c.style.borderRight = borderRule;
        });
      } else {
        targets.forEach(c => {
          if (sides === 'all') {
            c.style.border = borderRule;
          } else if (sides === 'top') {
            c.style.borderTop = borderRule;
          } else if (sides === 'bottom') {
            c.style.borderBottom = borderRule;
          } else if (sides === 'left') {
            c.style.borderLeft = borderRule;
          } else if (sides === 'right') {
            c.style.borderRight = borderRule;
          } else if (sides === 'top-bottom') {
            c.style.borderTop = borderRule;
            c.style.borderBottom = borderRule;
          }
        });
      }

      window.DocFlow.Editor?.notifyChange();
      showToast(`Custom border applied: ${width} ${style} ${sides}`, 'success');
      closeModal('#excelCustomBorderModal');
      restoreCellFocus(cell);
    });

    $('#excelCellFillInput')?.addEventListener('input', e => {
      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (table) {
        const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
        const targets = selected.length > 0 ? selected : (cell ? [cell] : []);
        targets.forEach(c => c.style.backgroundColor = e.target.value);
        window.DocFlow.Editor?.notifyChange();
      }
      restoreCellFocus(cell);
    });

    $('#excelSortAscBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.sortSelectedTextOrTable('asc');
      restoreCellFocus(getActiveTableCell());
    });
    $('#excelSortDescBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.sortSelectedTextOrTable('desc');
      restoreCellFocus(getActiveTableCell());
    });

    $('#excelExportCsvBtn')?.addEventListener('click', () => {
      const table = document.querySelector('#editor table');
      if (!table) {
        showToast('No table found to export as CSV', 'warning');
        return;
      }
      let csv = '';
      Array.from(table.rows).forEach(r => {
        const rowData = Array.from(r.cells).map(c => `"${c.textContent.replace(/"/g, '""').trim()}"`);
        csv += rowData.join(',') + '\r\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spreadsheet_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Spreadsheet exported as CSV', 'success');
      restoreCellFocus(getActiveTableCell());
    });

    // 9. Dedicated PDF Ribbon Panel Controls
    $('#pdfRibbonPrevBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.prevPage?.();
    });
    $('#pdfRibbonNextBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.nextPage?.();
    });
    $('#pdfRibbonFirstPageBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.jumpToPage?.(1);
    });
    $('#pdfRibbonLastPageBtn')?.addEventListener('click', () => {
      const total = window.DocFlow.PDF?.getTotalPages?.() || 1;
      window.DocFlow.PDF?.jumpToPage?.(total);
    });
    $('#pdfRibbonPageJumpBtn')?.addEventListener('click', () => {
      const total = window.DocFlow.PDF?.getTotalPages?.() || 1;
      const current = window.DocFlow.PDF?.getCurrentPage?.() || 1;
      const target = prompt(`Enter page number (1 to ${total}):`, current);
      if (target) {
        const pNum = parseInt(target, 10);
        if (!isNaN(pNum)) window.DocFlow.PDF?.jumpToPage?.(pNum);
      }
    });

    $('#pdfCreateFromImagesBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.openCreatePdfFromImagesModal?.();
    });
    $('#pdfRibbonExtractAllBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.extractTextFromPdf?.(true);
    });
    $('#pdfRibbonMergeModalBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.openMergeModal?.();
    });

    // 9. View Panel & Outline Actions
    $('#ribbonOutlineBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.toggleOutline();
    });
    $('#ribbonFindBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(false);
    });
    $('#ribbonHomeFindBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(false);
    });
    $('#ribbonReplaceBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(true);
    });
    $('#ribbonHomeReplaceBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(true);
    });

    // Presentation Slide Show Preview
    $('#viewPresentationPreviewBtn')?.addEventListener('click', startSlideShow);
    $('#slideshowPrevBtn')?.addEventListener('click', () => showSlideShowIndex(currentSlideShowIdx - 1));
    $('#slideshowNextBtn')?.addEventListener('click', () => showSlideShowIndex(currentSlideShowIdx + 1));
    $('#slideshowExitBtn')?.addEventListener('click', exitSlideShow);

    // Reading Mode (with mobile exit button)
    const exitReadingMode = () => {
      document.body.classList.remove('reading-mode');
      $('#readingModeBtn')?.classList.remove('active');
      showToast('Reading Mode exited', 'info');
    };

    $('#readingModeBtn')?.addEventListener('click', () => {
      const isReading = document.body.classList.toggle('reading-mode');
      $('#readingModeBtn')?.classList.toggle('active', isReading);
      showToast(isReading ? 'Reading Mode: ON (Click Exit button or press Esc)' : 'Reading Mode: OFF', 'info');
    });

    $('#exitReadingModeBtn')?.addEventListener('click', exitReadingMode);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('reading-mode')) {
        exitReadingMode();
      }
    });

    $('#ribbonFullscreenBtn')?.addEventListener('click', () => window.DocFlow.UI?.toggleFullscreen());
    $('#ribbonThemeBtn')?.addEventListener('click', () => $('#themeBtn')?.click());

    $('#editorZoomInBtn')?.addEventListener('click', () => setEditorZoom(currentZoom + 10));
    $('#editorZoomOutBtn')?.addEventListener('click', () => setEditorZoom(currentZoom - 10));
    $('#editorZoomResetBtn')?.addEventListener('click', () => setEditorZoom(100));

    // Clear All Recent Documents Button
    $('#clearRecentBtn')?.addEventListener('click', () => {
      Recent.clearAll();
    });
  }

  // ==========================================================================
  // Master Initialization
  // ==========================================================================

  function initApp() {
    // 1. Initialize UI foundation
    window.DocFlow.UI.initTheme();
    window.DocFlow.UI.initModals();
    window.DocFlow.UI.initFullscreen();

    // 2. Initialize New Document Modal & Formats
    initNewDocModal();

    // 3. Initialize Modules
    window.DocFlow.Editor.initEditor();
    window.DocFlow.ImageManager.initImageManager();
    window.DocFlow.PDF.initPdfViewer();
    window.DocFlow.Find.initFindOutline();
    window.DocFlow.FileIO.initFileIO();

    // 4. Initialize Ribbon, Auto-Save UI & Symbols
    initRibbon();
    initSymbolsModal();
    initCustomBorderModal();
    initPaintModal();
    initGifModal();
    setupSlideInteractions();
    updateAutoSaveUI();

    // 5. Wire Global Action Buttons
    $('#newBtn')?.addEventListener('click', () => openModal('#newDocModal'));
    $('#tabAdd')?.addEventListener('click', () => openModal('#newDocModal'));
    $('#emptyNewBtn')?.addEventListener('click', () => openModal('#newDocModal'));

    initKeyboardShortcuts();

    // 6. Initial State & Render Recent Documents on Empty Screen
    switchMode('empty');
    Recent.render();
    updateBtnStates();

    // 7. Restore persisted tabs from localStorage
    if (window.DocFlow.UI.Tabs.load() && window.DocFlow.UI.Tabs.list.length > 0) {
      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId) || window.DocFlow.UI.Tabs.list[0];
      if (activeTab) {
        window.DocFlow.UI.Tabs.activeId = activeTab.id;
        window.DocFlow.UI.Tabs.activateTab(activeTab);
      }
      window.DocFlow.UI.Tabs.render();
      setupExcelInteractions();
    }

    // 8. Save before window unloads
    window.addEventListener('beforeunload', () => {
      window.DocFlow.UI.Tabs.saveCurrent();
      window.DocFlow.UI.Tabs.save();
    });
  }

  // Expose methods on DocFlow namespace
  window.DocFlow.PdfStore = PdfStore;
  window.DocFlow.Recent = Recent;
  window.DocFlow.triggerAutoSaveTimer = triggerAutoSaveTimer;
  window.DocFlow.setFileTabDot = setFileTabDot;
  window.DocFlow.updateAutoSaveUI = updateAutoSaveUI;
  window.DocFlow.switchMode = switchMode;
  window.DocFlow.updateTopbar = updateTopbar;
  window.DocFlow.setModified = setModified;
  window.DocFlow.handleTabSave = handleTabSave;
  window.DocFlow.setupExcelInteractions = setupExcelInteractions;
  window.DocFlow.jumpToExcelCoord = jumpToExcelCoord;
  window.DocFlow.startSlideShow = startSlideShow;
  window.DocFlow.insertPptSlide = insertPptSlide;
  window.DocFlow.insertChartIntoDocument = insertChartIntoDocument;
  window.DocFlow.togglePageOrientation = togglePageOrientation;
  window.DocFlow.togglePageBorders = togglePageBorders;
  window.DocFlow.setPrintArea = setPrintArea;
  window.DocFlow.getCurrentActiveSlideIndex = () => currentActiveSlideIndex;
  window.DocFlow.updatePptSidebar = updatePptSidebar;
  window.DocFlow.selectPptSlide = selectPptSlide;
  window.DocFlow.deletePptSlide = deletePptSlide;
  window.DocFlow.duplicatePptSlide = duplicatePptSlide;
  window.DocFlow.insertExcelSheetTable = insertExcelSheetTable;
  window.DocFlow.handleExcelTableAction = handleExcelTableAction;
  window.DocFlow.applyExcelFormula = applyExcelFormula;
  window.DocFlow.switchRibbonTab = switchRibbonTab;
  window.DocFlow.initApp = initApp;

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(window);
