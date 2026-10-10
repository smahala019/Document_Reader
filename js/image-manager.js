/**
 * DocFlow — Image Management, Insertion, Drag-and-Drop & Inline Editing
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  let pendingImages = [];
  let selectedImage = null;
  let activeImageToolbar = null;
  let imgMode = 'url';

  const SUPPORTED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico'];

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = (file.name || '').split('.').pop().toLowerCase();
    return SUPPORTED_IMAGE_EXTS.includes(ext);
  }

  // Optimize & Compress Image (prevents localStorage quota blowouts)
  function optimizeImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.88) {
    return new Promise((resolve, reject) => {
      // SVG can be read directly as DataURL without lossy rasterization
      if (file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'))) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Only scale down if larger than max boundaries
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              maxHeight = height;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Use original type if png/webp, otherwise jpeg
          const mimeType = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg';
          resolve(canvas.toDataURL(mimeType, quality));
        };
        img.onerror = () => {
          // Fallback to raw dataURL if image decode fails
          resolve(e.target.result);
        };
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Reset Image Modal State
  function resetImageModal() {
    pendingImages = [];
    const list = $('#imgPreviewList');
    if (list) list.innerHTML = '';
    const insertDevBtn = $('#imgDevInsert');
    if (insertDevBtn) insertDevBtn.disabled = true;

    const urlInput = $('#imageUrl');
    if (urlInput) urlInput.value = '';
    const altInput = $('#imageAlt');
    if (altInput) altInput.value = '';

    const urlPreview = $('#imgUrlPreview');
    if (urlPreview) {
      urlPreview.style.display = 'none';
      urlPreview.innerHTML = '';
    }
  }

  // Render Preview Thumbnails in Modal
  function renderImagePreviews() {
    const list = $('#imgPreviewList');
    if (!list) return;

    list.innerHTML = '';
    pendingImages.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'img-preview-item';
      item.innerHTML = `
        <img src="${img.dataUrl}" alt="${escHtml(img.name)}">
        <button class="remove-img" data-idx="${idx}" title="Remove image" aria-label="Remove">&times;</button>
      `;

      item.querySelector('.remove-img').addEventListener('click', e => {
        e.stopPropagation();
        pendingImages.splice(idx, 1);
        renderImagePreviews();
      });

      list.appendChild(item);
    });

    const insertBtn = $('#imgDevInsert');
    if (insertBtn) insertBtn.disabled = pendingImages.length === 0;
  }

  // Queue and Process Selected Image Files
  async function processImageFiles(files) {
    if (!files || !files.length) return;
    let addedCount = 0;

    for (const file of Array.from(files)) {
      if (!isImageFile(file)) {
        showToast(`"${file.name}" is not a supported image file`, 'warning');
        continue;
      }

      try {
        const dataUrl = await optimizeImage(file);
        pendingImages.push({ name: file.name, dataUrl });
        addedCount++;
      } catch (err) {
        console.error('Image processing error:', err);
        showToast(`Could not load "${file.name}"`, 'error');
      }
    }

    if (addedCount > 0) {
      renderImagePreviews();
      showToast(`Added ${addedCount} image${addedCount > 1 ? 's' : ''} to queue`, 'info');
    }
  }

  // Insert Image Element with Full Attributes & Listeners
  function insertImageIntoDocument(src, alt = '', widthPercent = null) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || 'Document image';
    img.loading = 'lazy';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'inline-block';
    img.style.margin = '8px 0';
    img.setAttribute('draggable', 'true');
    img.dataset.wrap = 'inline';
    if (widthPercent) img.style.width = widthPercent;

    img.addEventListener('error', () => {
      showToast('Image failed to load — please verify URL or file', 'error');
    }, { once: true });

    // Insert into document using safe cursor insertion
    window.DocFlow.Editor.insertNodeAtCursor(img);
    attachImageListeners(img);
    selectImage(img);
    return img;
  }

  // Setup Image Modal Tabs & Actions
  function setupImageModal() {
    const insertImageBtn = $('#insertImageBtn') || $('#ribbonInsertImageBtn');
    const tabUrl = $('#imgTabUrl');
    const tabDevice = $('#imgTabDevice');
    const urlSection = $('#imgUrlSection');
    const devSection = $('#imgDeviceSection');
    const urlInput = $('#imageUrl');
    const altInput = $('#imageAlt');
    const urlInsertBtn = $('#imgUrlInsert');
    const urlCancelBtn = $('#imgUrlCancel');
    const devInsertBtn = $('#imgDevInsert');
    const devCancelBtn = $('#imgDevCancel');
    const dropZone = $('#deviceImageDrop');
    const fileInput = $('#imageFileInput');

    // Trigger modal from toolbar
    if (insertImageBtn) {
      insertImageBtn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        window.DocFlow.Editor.saveSelection();
        resetImageModal();
        imgMode = 'url';
        if (tabUrl && tabDevice) {
          tabUrl.classList.add('active');
          tabDevice.classList.remove('active');
        }
        if (urlSection) urlSection.style.display = '';
        if (devSection) devSection.style.display = 'none';

        openModal('#imageModal');
        setTimeout(() => urlInput?.focus(), 80);
      });
    }

    // Modal Tabs
    if (tabUrl && tabDevice) {
      tabUrl.addEventListener('click', () => {
        imgMode = 'url';
        tabUrl.classList.add('active');
        tabDevice.classList.remove('active');
        if (urlSection) urlSection.style.display = '';
        if (devSection) devSection.style.display = 'none';
        urlInput?.focus();
      });

      tabDevice.addEventListener('click', () => {
        imgMode = 'device';
        tabDevice.classList.add('active');
        tabUrl.classList.remove('active');
        if (urlSection) urlSection.style.display = 'none';
        if (devSection) devSection.style.display = '';
      });
    }

    // URL Live Preview
    if (urlInput) {
      let previewTimer = null;
      urlInput.addEventListener('input', () => {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(() => {
          let val = urlInput.value.trim();
          let preview = $('#imgUrlPreview');
          if (!preview && urlSection) {
            preview = document.createElement('div');
            preview.id = 'imgUrlPreview';
            preview.className = 'img-url-preview';
            urlSection.insertBefore(preview, urlSection.querySelector('.modal-actions'));
          }
          if (val && (val.startsWith('http') || val.startsWith('data:'))) {
            preview.style.display = 'flex';
            preview.innerHTML = `<img src="${escHtml(val)}" alt="Preview" onerror="this.parentElement.style.display='none'">`;
          } else if (preview) {
            preview.style.display = 'none';
          }
        }, 300);
      });

      urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          urlInsertBtn?.click();
        }
      });
    }

    // Insert from URL Action
    if (urlInsertBtn) {
      urlInsertBtn.addEventListener('click', () => {
        let url = urlInput.value.trim();
        const alt = altInput.value.trim();
        if (!url) {
          showToast('Please enter an image URL', 'warning');
          return;
        }

        if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('data:')) {
          url = 'https://' + url;
        }

        closeModal('#imageModal');
        insertImageIntoDocument(url, alt);
        resetImageModal();
        showToast('Image inserted successfully', 'success');
      });
    }

    // Insert from Device Action
    if (devInsertBtn) {
      devInsertBtn.addEventListener('click', () => {
        if (!pendingImages.length) return;
        const count = pendingImages.length;
        closeModal('#imageModal');

        pendingImages.forEach(img => {
          insertImageIntoDocument(img.dataUrl, img.name);
        });

        resetImageModal();
        showToast(`Inserted ${count} image${count > 1 ? 's' : ''}`, 'success');
      });
    }

    // Device File Input & Dropzone
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
          processImageFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', e => {
        if (e.target.files) {
          processImageFiles(e.target.files);
          fileInput.value = '';
        }
      });
    }

    urlCancelBtn?.addEventListener('click', () => {
      closeModal('#imageModal');
      resetImageModal();
    });

    devCancelBtn?.addEventListener('click', () => {
      closeModal('#imageModal');
      resetImageModal();
    });
  }

  // ==========================================================================
  // Direct Drag-and-Drop Image onto Editor Page
  // ==========================================================================
  function setupEditorDropZone() {
    const editorWrap = $('#editorWrap');
    const editor = $('#editor');
    if (!editorWrap || !editor) return;

    let overlay = document.querySelector('.editor-drop-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'editor-drop-overlay';
      overlay.innerHTML = '<i class="fas fa-image" style="font-size:24px;"></i><span>Drop image here to insert into document</span>';
      editor.parentElement.appendChild(overlay);
    }

    let dragCount = 0;

    editorWrap.addEventListener('dragenter', e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes('Files')) return;

      dragCount++;
      overlay.classList.add('active');
    });

    editorWrap.addEventListener('dragleave', e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      dragCount--;
      if (dragCount <= 0) {
        dragCount = 0;
        overlay.classList.remove('active');
      }
    });

    editorWrap.addEventListener('dragover', e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      e.preventDefault();
    });

    editorWrap.addEventListener('drop', async e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      dragCount = 0;
      overlay.classList.remove('active');

      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      const files = Array.from(e.dataTransfer.files);

      // Check if dropped files are images
      const imageFiles = files.filter(isImageFile);

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        showToast(`Inserting ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}...`, 'info');

        for (const f of imageFiles) {
          try {
            const dataUrl = await optimizeImage(f);
            insertImageIntoDocument(dataUrl, f.name);
          } catch (err) {
            showToast(`Could not insert "${f.name}"`, 'error');
          }
        }
      }
    });
  }

  // ==========================================================================
  // Paste Images from Clipboard (Ctrl+V)
  // ==========================================================================
  function setupClipboardPaste() {
    const editor = $('#editor');
    if (!editor) return;

    editor.addEventListener('paste', async e => {
      const clipboard = e.clipboardData;
      if (!clipboard) return;

      const items = Array.from(clipboard.items || []);
      const imageItem = items.find(it => it.type && it.type.startsWith('image/'));

      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          try {
            showToast('Pasting image...', 'info');
            const dataUrl = await optimizeImage(file);
            insertImageIntoDocument(dataUrl, 'Pasted image');
            showToast('Image inserted from clipboard', 'success');
          } catch (err) {
            showToast('Failed to paste image', 'error');
          }
        }
        return;
      }

      // If pasting text with external styles, sanitize
      const html = clipboard.getData('text/html');
      if (html && (html.includes('<meta') || html.includes('style="') || html.includes('class='))) {
        e.preventDefault();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        temp.querySelectorAll('*').forEach(el => {
          [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            if (name === 'style' || name === 'class' || name === 'id' || name.startsWith('on')) {
              el.removeAttribute(attr.name);
            }
          });
        });
        temp.querySelectorAll('script,style,meta,link,iframe,object,embed').forEach(el => el.remove());
        window.DocFlow.Editor.insertHtmlAtCursor(temp.innerHTML);
      }
    });
  }

  // ==========================================================================
  // Inline Image Manipulation Toolbar & Resizing
  // ==========================================================================
  let activeResizeHandle = null;

  function setImageWrapMode(targetImg, mode) {
    if (!targetImg) return;
    targetImg.dataset.wrap = mode;
    targetImg.dataset.align = mode;
    window.DocFlow.Editor?.notifyChange();
  }

  function selectImage(img) {
    deselectImage();
    selectedImage = img;
    img.classList.add('df-selected-img');
    createResizeHandle(img);
    showImageToolbar(img);
  }

  function deselectImage() {
    if (selectedImage) {
      selectedImage.classList.remove('df-selected-img');
      selectedImage = null;
    }
    if (activeResizeHandle) {
      activeResizeHandle.remove();
      activeResizeHandle = null;
    }
    if (activeImageToolbar) {
      activeImageToolbar.remove();
      activeImageToolbar = null;
    }
  }

  function createResizeHandle(img) {
    if (activeResizeHandle) activeResizeHandle.remove();
    const handle = document.createElement('div');
    handle.className = 'df-resize-handle br';
    document.body.appendChild(handle);
    activeResizeHandle = handle;
    positionResizeHandle(img, handle);

    let startX = 0, startWidth = 0;
    const onMouseMove = e => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      if (!clientX) return;
      const dx = clientX - startX;
      const newWidth = Math.max(40, startWidth + dx);
      img.style.width = newWidth + 'px';
      positionResizeHandle(img, handle);
      if (activeImageToolbar) positionImageToolbar(img, activeImageToolbar);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
      window.DocFlow.Editor.notifyChange();
    };

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startWidth = img.offsetWidth;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    handle.addEventListener('touchstart', e => {
      e.stopPropagation();
      startX = e.touches[0].clientX;
      startWidth = img.offsetWidth;
      document.addEventListener('touchmove', onMouseMove, { passive: true });
      document.addEventListener('touchend', onMouseUp);
    });
  }

  function positionResizeHandle(img, handle) {
    if (!img || !handle) return;
    const rect = img.getBoundingClientRect();
    handle.style.left = (rect.right - 5) + 'px';
    handle.style.top = (rect.bottom - 5) + 'px';
  }

  function showImageToolbar(img) {
    if (activeImageToolbar) activeImageToolbar.remove();

    const currentWrap = img.dataset.wrap || img.dataset.align || 'inline';
    const currentWidth = img.style.width || '';

    const toolbar = document.createElement('div');
    toolbar.className = 'df-img-toolbar';
    toolbar.innerHTML = `
      <select class="df-img-select" id="dfImgSizeSelect" title="Image Size">
        <option value="25%" ${currentWidth === '25%' ? 'selected' : ''}>25% Size</option>
        <option value="50%" ${currentWidth === '50%' ? 'selected' : ''}>50% Size</option>
        <option value="75%" ${currentWidth === '75%' ? 'selected' : ''}>75% Size</option>
        <option value="100%" ${currentWidth === '100%' ? 'selected' : ''}>100% Full</option>
        <option value="auto" ${(!currentWidth || currentWidth === 'auto') ? 'selected' : ''}>Original Size</option>
      </select>
      <div class="df-img-sep"></div>
      <button class="df-img-btn ${currentWrap === 'left' ? 'active' : ''}" data-action="align-left" title="Align Left"><i class="fas fa-align-left"></i></button>
      <button class="df-img-btn ${currentWrap === 'center' ? 'active' : ''}" data-action="align-center" title="Align Center"><i class="fas fa-align-center"></i></button>
      <button class="df-img-btn ${currentWrap === 'right' ? 'active' : ''}" data-action="align-right" title="Align Right"><i class="fas fa-align-right"></i></button>
      <div class="df-img-sep"></div>
      <select class="df-img-select" id="dfImgWrapSelect" title="Text Wrapping">
        <option value="inline" ${currentWrap === 'inline' ? 'selected' : ''}>In Line</option>
        <option value="left" ${currentWrap === 'left' ? 'selected' : ''}>Wrap Left</option>
        <option value="right" ${currentWrap === 'right' ? 'selected' : ''}>Wrap Right</option>
        <option value="center" ${currentWrap === 'center' ? 'selected' : ''}>Center</option>
        <option value="behind" ${currentWrap === 'behind' ? 'selected' : ''}>Behind Text</option>
        <option value="front" ${currentWrap === 'front' ? 'selected' : ''}>In Front</option>
      </select>
      <div class="df-img-sep"></div>
      <button class="df-img-btn" data-action="crop" title="Crop image"><i class="fas fa-crop"></i> Crop</button>
      <button class="df-img-btn" data-action="alt" title="Edit description / caption"><i class="fas fa-closed-captioning"></i></button>
      <button class="df-img-btn danger" data-action="delete" title="Delete image"><i class="fas fa-trash-can"></i></button>
    `;

    document.body.appendChild(toolbar);
    activeImageToolbar = toolbar;
    positionImageToolbar(img, toolbar);

    // Size Select
    const sizeSelect = toolbar.querySelector('#dfImgSizeSelect');
    sizeSelect?.addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'auto') {
        img.style.width = 'auto';
      } else {
        img.style.width = val;
      }
      window.DocFlow.Editor.notifyChange();
      positionImageToolbar(img, toolbar);
      if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
    });

    // Wrap Select
    const wrapSelect = toolbar.querySelector('#dfImgWrapSelect');
    wrapSelect?.addEventListener('change', e => {
      const mode = e.target.value;
      setImageWrapMode(img, mode);
      positionImageToolbar(img, toolbar);
      if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
      showToast(`Text wrap: ${wrapSelect.options[wrapSelect.selectedIndex].text}`, 'info');
    });

    // Action buttons
    toolbar.addEventListener('click', e => {
      const btn = e.target.closest('.df-img-btn');
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      if (action === 'align-left') {
        setImageWrapMode(img, 'left');
        showImageToolbar(img);
        if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
        showToast('Image aligned left', 'info');
      } else if (action === 'align-center') {
        setImageWrapMode(img, 'center');
        showImageToolbar(img);
        if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
        showToast('Image centered', 'info');
      } else if (action === 'align-right') {
        setImageWrapMode(img, 'right');
        showImageToolbar(img);
        if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
        showToast('Image aligned right', 'info');
      } else if (action === 'crop') {
        openImageCropper(img);
      } else if (action === 'alt') {
        const currentAlt = img.alt || '';
        const newAlt = prompt('Enter description (alt text) for this image:', currentAlt);
        if (newAlt !== null) {
          img.alt = newAlt.trim();
          window.DocFlow.Editor.notifyChange();
          showToast('Image description updated', 'info');
        }
      } else if (action === 'delete') {
        img.remove();
        deselectImage();
        window.DocFlow.Editor.notifyChange();
        showToast('Image removed', 'info');
      }
    });
  }

  function positionImageToolbar(img, toolbar) {
    if (!img || !toolbar) return;
    const rect = img.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();

    let top = rect.top - toolbarRect.height - 8;
    let left = rect.left + (rect.width / 2) - (toolbarRect.width / 2);

    if (top < 52) top = rect.bottom + 8;
    if (left < 10) left = 10;
    if (left + toolbarRect.width > window.innerWidth - 10) {
      left = window.innerWidth - toolbarRect.width - 10;
    }

    toolbar.style.top = top + 'px';
    toolbar.style.left = left + 'px';
  }

  // Interactive Image Cropper (HTML5 Canvas)
  function openImageCropper(img) {
    let cropModal = document.getElementById('dfCropModal');
    if (!cropModal) {
      cropModal = document.createElement('div');
      cropModal.id = 'dfCropModal';
      cropModal.className = 'modal-overlay';
      cropModal.innerHTML = `
        <div class="modal" style="width:540px;max-width:92vw;" role="dialog" aria-modal="true" aria-label="Crop Image">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;"><i class="fas fa-crop" style="color:var(--accent);margin-right:6px;"></i>Crop Image</h3>
            <div style="display:flex;gap:4px;">
              <button type="button" class="modal-btn crop-ratio-btn active" data-ratio="free">Free</button>
              <button type="button" class="modal-btn crop-ratio-btn" data-ratio="1:1">1:1</button>
              <button type="button" class="modal-btn crop-ratio-btn" data-ratio="4:3">4:3</button>
              <button type="button" class="modal-btn crop-ratio-btn" data-ratio="16:9">16:9</button>
            </div>
          </div>
          <div style="border:1px solid var(--border);border-radius:8px;background:#000000;overflow:hidden;max-height:340px;display:flex;align-items:center;justify-content:center;">
            <canvas id="dfCropCanvas" style="max-width:100%;max-height:340px;cursor:crosshair;display:block;"></canvas>
          </div>
          <p style="font-size:11px;color:var(--text-muted);margin:8px 0 0;">Drag with your mouse or touch on the preview above to select the crop box</p>
          <div class="modal-actions" style="margin-top:12px;">
            <button type="button" class="modal-btn" id="dfCropCancel">Cancel</button>
            <button type="button" class="modal-btn primary" id="dfCropApply"><i class="fas fa-check"></i> Apply Crop</button>
          </div>
        </div>
      `;
      document.body.appendChild(cropModal);
    }

    const canvas = cropModal.querySelector('#dfCropCanvas');
    const ctx = canvas.getContext('2d');
    const rawImg = new Image();
    rawImg.crossOrigin = 'anonymous';

    let cropRect = { x: 0, y: 0, w: 0, h: 0 };
    let isDragging = false, startX = 0, startY = 0;
    let selectedRatio = 'free';

    rawImg.onload = () => {
      canvas.width = rawImg.naturalWidth;
      canvas.height = rawImg.naturalHeight;
      cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      drawCropView();
      cropModal.classList.add('show');
    };
    rawImg.src = img.src;

    function drawCropView() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(rawImg, 0, 0);

      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear crop area
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.clip();
      ctx.drawImage(rawImg, 0, 0);
      ctx.restore();

      // Border and grid
      ctx.strokeStyle = '#e85d04';
      ctx.lineWidth = 3;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }

    const getCanvasPos = e => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY))
      };
    };

    const onStartDrag = e => {
      isDragging = true;
      const pos = getCanvasPos(e);
      startX = pos.x;
      startY = pos.y;
      cropRect = { x: startX, y: startY, w: 0, h: 0 };
    };

    const onMoveDrag = e => {
      if (!isDragging) return;
      const pos = getCanvasPos(e);
      let w = pos.x - startX;
      let h = pos.y - startY;

      if (selectedRatio === '1:1') {
        const side = Math.min(Math.abs(w), Math.abs(h));
        w = (w >= 0 ? 1 : -1) * side;
        h = (h >= 0 ? 1 : -1) * side;
      } else if (selectedRatio === '4:3') {
        h = (w * 3) / 4;
      } else if (selectedRatio === '16:9') {
        h = (w * 9) / 16;
      }

      cropRect.x = w >= 0 ? startX : startX + w;
      cropRect.y = h >= 0 ? startY : startY + h;
      cropRect.w = Math.abs(w);
      cropRect.h = Math.abs(h);
      drawCropView();
    };

    const onEndDrag = () => {
      isDragging = false;
      if (cropRect.w < 20 || cropRect.h < 20) {
        cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        drawCropView();
      }
    };

    canvas.onmousedown = onStartDrag;
    canvas.ontouchstart = e => { e.preventDefault(); onStartDrag(e); };

    window.addEventListener('mousemove', onMoveDrag);
    window.addEventListener('touchmove', onMoveDrag, { passive: false });

    window.addEventListener('mouseup', onEndDrag);
    window.addEventListener('touchend', onEndDrag);

    // Ratio presets
    cropModal.querySelectorAll('.crop-ratio-btn').forEach(btn => {
      btn.onclick = () => {
        cropModal.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRatio = btn.dataset.ratio;
        if (selectedRatio === '1:1') {
          const side = Math.min(canvas.width, canvas.height);
          cropRect = { x: (canvas.width - side) / 2, y: (canvas.height - side) / 2, w: side, h: side };
        } else if (selectedRatio === '4:3') {
          const w = canvas.width;
          const h = (w * 3) / 4;
          cropRect = { x: 0, y: Math.max(0, (canvas.height - h) / 2), w, h: Math.min(canvas.height, h) };
        } else if (selectedRatio === '16:9') {
          const w = canvas.width;
          const h = (w * 9) / 16;
          cropRect = { x: 0, y: Math.max(0, (canvas.height - h) / 2), w, h: Math.min(canvas.height, h) };
        } else {
          cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        }
        drawCropView();
      };
    });

    cropModal.querySelector('#dfCropCancel').onclick = () => {
      cropModal.classList.remove('show');
    };

    cropModal.querySelector('#dfCropApply').onclick = () => {
      cropModal.classList.remove('show');
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = Math.max(1, cropRect.w);
      croppedCanvas.height = Math.max(1, cropRect.h);
      const cctx = croppedCanvas.getContext('2d');
      cctx.drawImage(rawImg, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);

      img.src = croppedCanvas.toDataURL('image/png', 0.92);
      window.DocFlow.Editor.notifyChange();
      positionImageToolbar(img, activeImageToolbar);
      if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
      showToast('Image cropped successfully', 'success');
    };
  }

  function attachImageListeners(img) {
    img.setAttribute('draggable', 'true');
    img.addEventListener('click', e => {
      e.stopPropagation();
      selectImage(img);
    });

    img.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', 'image-move');
      window._movingImg = img;
    });

    img.addEventListener('dragend', () => {
      window._movingImg = null;
    });
  }

  function setupDocumentImageListeners() {
    const editor = $('#editor');
    if (!editor) return;

    editor.querySelectorAll('img').forEach(attachImageListeners);

    // Reposition moving image on drop
    editor.addEventListener('dragover', e => {
      if (window._movingImg) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    editor.addEventListener('drop', e => {
      if (window._movingImg) {
        e.preventDefault();
        e.stopPropagation();
        const img = window._movingImg;
        window._movingImg = null;

        let range = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (e.rangeParent) {
          range = document.createRange();
          range.setStart(e.rangeParent, e.rangeOffset);
        }
        if (range && editor.contains(range.commonAncestorContainer)) {
          range.insertNode(img);
        } else {
          editor.appendChild(img);
        }
        selectImage(img);
        window.DocFlow.Editor.notifyChange();
        showToast('Image moved to new position', 'info');
      }
    });

    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IMG') attachImageListeners(node);
            else node.querySelectorAll?.('img').forEach(attachImageListeners);
          }
        });
      });
    });
    observer.observe(editor, { childList: true, subtree: true });

    document.addEventListener('click', e => {
      if (selectedImage && !e.target.closest('.df-img-toolbar') && !e.target.closest('.df-resize-handle') && e.target !== selectedImage) {
        deselectImage();
      }
    });

    document.addEventListener('keydown', e => {
      if (selectedImage && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        selectedImage.remove();
        deselectImage();
        window.DocFlow.Editor.notifyChange();
        showToast('Image deleted', 'info');
      }
    });

    window.addEventListener('resize', () => {
      if (selectedImage && activeImageToolbar) {
        positionImageToolbar(selectedImage, activeImageToolbar);
      }
      if (selectedImage && activeResizeHandle) {
        positionResizeHandle(selectedImage, activeResizeHandle);
      }
    });

    $('#editorWrap')?.addEventListener('scroll', () => {
      if (selectedImage && activeImageToolbar) {
        positionImageToolbar(selectedImage, activeImageToolbar);
      }
      if (selectedImage && activeResizeHandle) {
        positionResizeHandle(selectedImage, activeResizeHandle);
      }
    });
  }

  function initImageManager() {
    setupImageModal();
    setupEditorDropZone();
    setupClipboardPaste();
    setupDocumentImageListeners();
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.ImageManager = {
    initImageManager,
    insertImageIntoDocument,
    setImageWrapMode,
    optimizeImage,
    isImageFile
  };

})(window);
