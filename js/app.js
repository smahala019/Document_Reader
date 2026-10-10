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
      const entry = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: doc.name,
        type: doc.type || ext.toUpperCase() || 'DOC',
        mode: doc.mode || (ext === 'pdf' ? 'view' : 'edit'),
        content: doc.content || '<p><br></p>',
        timestamp: Date.now()
      };

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
      // If document is already open in a tab, switch to it immediately
      const existing = window.DocFlow.UI.Tabs.findByFile(item.name);
      if (existing) {
        window.DocFlow.UI.Tabs.switchTo(existing.id);
        showToast(`Switched to "${item.name}"`, 'info');
        return;
      }

      if (item.mode === 'view' || item.type === 'PDF') {
        showToast(`To view PDF "${item.name}", please browse or drop the file`, 'info');
        $('#openBtn')?.click();
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
          ? (window.DocFlow.FileIO?.createBlankExcelGrid(8, 25) || `<p>Spreadsheet Document</p>`)
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

      closeModal('#newDocModal');

      const fullName = `${docTitle}.${ext}`;
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
      view: '#ribbonPanelView'
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
      content = window.DocFlow.FileIO?.createBlankExcelGrid(10, 30) || '<p>Spreadsheet Document</p>';
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

    Recent.add({
      name: fullName,
      type: ext.toUpperCase(),
      mode: 'edit',
      content: content
    });

    showToast(`Created new document "${fullName}"`, 'success');
  }

  // Office Integration Helpers (Excel table styling, PPT slide card, Excel grid)
  function applyExcelTableStyle() {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    const sel = window.getSelection();
    let table = null;
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      table = node.closest('table');
    }

    if (table) {
      table.classList.add('excel-styled-table');
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';
      table.style.margin = '16px 0';
      table.querySelectorAll('th').forEach(th => {
        th.style.backgroundColor = '#16a34a';
        th.style.color = '#ffffff';
        th.style.fontWeight = '700';
        th.style.padding = '8px 12px';
        th.style.border = '1px solid #15803d';
      });
      table.querySelectorAll('td').forEach(td => {
        td.style.padding = '8px 12px';
        td.style.border = '1px solid #cbd5e1';
      });
      table.querySelectorAll('tbody tr:nth-child(even)').forEach(tr => {
        tr.style.backgroundColor = '#f8fafc';
      });
      window.DocFlow.Editor?.notifyChange();
      showToast('Applied Excel table styling', 'success');
    } else {
      const tableHtml = `
        <table class="excel-styled-table" style="border-collapse:collapse;width:100%;margin:16px 0;font-size:13px;border:1px solid #15803d;">
          <thead>
            <tr style="background-color:#16a34a;color:#ffffff;">
              <th style="padding:8px 12px;border:1px solid #15803d;text-align:left;">Item</th>
              <th style="padding:8px 12px;border:1px solid #15803d;text-align:left;">Category</th>
              <th style="padding:8px 12px;border:1px solid #15803d;text-align:right;">Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color:#ffffff;">
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">Quarterly Revenue</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">Finance</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:right;">125,000</td>
            </tr>
            <tr style="background-color:#f8fafc;">
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">Operating Expenses</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">Operations</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:right;">45,000</td>
            </tr>
            <tr style="background-color:#ffffff;font-weight:700;">
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">Net Margin</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">Summary</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:right;color:#16a34a;">80,000</td>
            </tr>
          </tbody>
        </table><p><br></p>`;
      window.DocFlow.Editor?.insertHtmlAtCursor(tableHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Inserted Excel-formatted table', 'success');
    }
  }

  function insertPptSlideCard() {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    const slideHtml = `
      <div class="pptx-slide-card" contenteditable="false" style="margin:16px 0;border:1px solid #cbd5e1;border-radius:8px;padding:24px;background:#ffffff;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);aspect-ratio:16/9;max-width:800px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">
          <span style="font-size:11px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-file-powerpoint" style="margin-right:4px;"></i>PowerPoint Presentation Slide</span>
        </div>
        <h2 contenteditable="true" style="margin:0 0 10px;font-size:20px;font-weight:700;color:#1e293b;">Executive Summary & Key Takeaways</h2>
        <div contenteditable="true" style="color:#475569;font-size:14px;line-height:1.6;">
          <ul>
            <li>Strategic milestone deliveries achieved ahead of quarterly target</li>
            <li>Collaborative multi-device editing workflow active across teams</li>
            <li>Next review meeting scheduled with stakeholders</li>
          </ul>
        </div>
      </div><p><br></p>`;
    window.DocFlow.Editor?.insertHtmlAtCursor(slideHtml);
    window.DocFlow.Editor?.notifyChange();
    showToast('PowerPoint slide card inserted', 'success');
  }

  function insertExcelSpreadsheetGrid() {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    const cols = ['A', 'B', 'C', 'D', 'E'];
    let theadHtml = '<th style="background:#e2e8f0;padding:6px 10px;border:1px solid #cbd5e1;width:40px;text-align:center;font-size:11px;font-weight:700;color:#64748b;">#</th>';
    cols.forEach(c => {
      theadHtml += `<th style="background:#f1f5f9;padding:6px 10px;border:1px solid #cbd5e1;min-width:90px;text-align:center;font-size:11px;font-weight:700;color:#334155;">${c}</th>`;
    });
    let rowsHtml = '';
    for (let r = 1; r <= 5; r++) {
      rowsHtml += `<tr><td style="background:#f8fafc;padding:6px 10px;border:1px solid #cbd5e1;text-align:center;font-size:11px;font-weight:700;color:#64748b;">${r}</td>`;
      for (let c = 0; c < 5; c++) {
        rowsHtml += `<td contenteditable="true" style="padding:6px 10px;border:1px solid #cbd5e1;background:#ffffff;outline:none;font-size:12px;min-width:90px;"><br></td>`;
      }
      rowsHtml += '</tr>';
    }
    const gridHtml = `
      <div class="excel-embedded-grid" contenteditable="false" style="margin:16px 0;overflow-x:auto;border:1px solid #16a34a;border-radius:6px;background:#ffffff;">
        <div style="background:#16a34a;color:#ffffff;padding:6px 12px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-file-excel"></i> Excel Spreadsheet Grid (Editable Cells)
        </div>
        <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
          <thead><tr>${theadHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div><p><br></p>`;
    window.DocFlow.Editor?.insertHtmlAtCursor(gridHtml);
    window.DocFlow.Editor?.notifyChange();
    showToast('Excel spreadsheet grid inserted', 'success');
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

    // Home Panel Office Integration Buttons
    $('#homeExcelFormatBtn')?.addEventListener('click', applyExcelTableStyle);
    $('#homePptLayoutBtn')?.addEventListener('click', insertPptSlideCard);

    // 3. Insert Panel (Date, Symbol, Checklist, Note, Paint, Office Embeds)
    $('#ribbonInsertExcelGridBtn')?.addEventListener('click', insertExcelSpreadsheetGrid);
    $('#ribbonInsertPptSlideBtn')?.addEventListener('click', insertPptSlideCard);

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
        case 'full':
          page.style.maxWidth = '100%';
          page.style.width = '100%';
          page.style.minHeight = '100%';
          showToast('Paper Size: Full Page (100% Bleed)', 'info');
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

    // Dismiss Layout & Bullet Popovers on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#marginDropdownWrap') &&
          !e.target.closest('#pageSizeDropdownWrap') &&
          !e.target.closest('#columnsDropdownWrap') &&
          !e.target.closest('#watermarkDropdownWrap') &&
          !e.target.closest('.bullet-dropdown-wrap')) {
        $('#marginPopover')?.classList.remove('show');
        $('#pageSizePopover')?.classList.remove('show');
        $('#columnsPopover')?.classList.remove('show');
        $('#watermarkPopover')?.classList.remove('show');
      }
    });

    // 5. View Panel & Home Panel Editing Actions
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

    // View Office View Mode Buttons (Slide Deck & Excel Gridlines)
    $('#viewSlideDeckBtn')?.addEventListener('click', () => {
      const isDeck = document.body.classList.toggle('slide-deck-mode');
      $('#viewSlideDeckBtn')?.classList.toggle('active', isDeck);
      showToast(isDeck ? 'Presentation Slide Deck View: ON' : 'Presentation Slide Deck View: OFF', 'info');
    });
    $('#viewExcelGridlinesBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (!page) return;
      const isGrid = page.classList.toggle('excel-gridlines-mode');
      $('#viewExcelGridlinesBtn')?.classList.toggle('active', isGrid);
      showToast(isGrid ? 'Excel Gridlines: ON' : 'Excel Gridlines: OFF', 'info');
    });

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
    initPaintModal();
    initGifModal();
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
    }

    // 8. Save before window unloads
    window.addEventListener('beforeunload', () => {
      window.DocFlow.UI.Tabs.saveCurrent();
      window.DocFlow.UI.Tabs.save();
    });
  }

  // Expose methods on DocFlow namespace
  window.DocFlow.Recent = Recent;
  window.DocFlow.triggerAutoSaveTimer = triggerAutoSaveTimer;
  window.DocFlow.setFileTabDot = setFileTabDot;
  window.DocFlow.updateAutoSaveUI = updateAutoSaveUI;
  window.DocFlow.switchMode = switchMode;
  window.DocFlow.updateTopbar = updateTopbar;
  window.DocFlow.setModified = setModified;
  window.DocFlow.handleTabSave = handleTabSave;
  window.DocFlow.initApp = initApp;

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(window);
