const state = {
  mode: 'design',
  sourceMode: false,
  savedRange: null,
  subjectSavedRange: null,
  selectedBlock: null,
  drag: null,
  statusTimer: null,
  inputTimers: {},
  mergeTagTarget: 'editor',
  activeMergeChip: null,
  mergeTagFallbackCloseTimer: null,
};

const els = {};

const MERGE_TAGS = [
  { label: 'First Name', token: '[receiver_first_name]' },
  { label: 'Last Name', token: '[receiver_last_name]' },
  { label: 'Phone Number', token: '[receiver_phone_number]' },
  { label: 'E-Mail Address', token: '[receiver_email_address]' },
  { label: 'Website', token: '[receiver_website]' },
];

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('selectionchange', handleSelectionChange);

document.addEventListener('pointermove', onPointerMove);

document.addEventListener('pointerup', stopDrag);

function init() {
  bindElements();
  initFontPickerPreview();
  bindToolbar();
  bindTabs();
  bindEditor();
  bindInspector();
  bindTopActions();
  window.addEventListener('resize', positionMergeTagFallbackMenu);
  window.addEventListener('scroll', positionMergeTagFallbackMenu, true);
  loadSample();
  hydrateMergeTags(els.subjectInput);
  refreshOutputs();
  syncToolbarState();
  exposeApi();
  setStatus('Ready');
}

function bindElements() {
  Object.assign(els, {
    editorCanvas: document.getElementById('editorCanvas'),
    sourceEditor: document.getElementById('sourceEditor'),
    previewFrame: document.getElementById('previewFrame'),
    htmlOutput: document.getElementById('htmlOutput'),
    statusBadge: document.getElementById('statusBadge'),
    subjectInput: document.getElementById('subjectInput'),
    loadSampleBtn: document.getElementById('loadSampleBtn'),
    copyHtmlBtn: document.getElementById('copyHtmlBtn'),
    downloadHtmlBtn: document.getElementById('downloadHtmlBtn'),
    blockFormat: document.getElementById('blockFormat'),
    fontName: document.getElementById('fontName'),
    fontSize: document.getElementById('fontSize'),
    textColor: document.getElementById('textColor'),
    highlightColor: document.getElementById('highlightColor'),
    linkBtn: document.getElementById('linkBtn'),
    unlinkBtn: document.getElementById('unlinkBtn'),
    tableBtn: document.getElementById('tableBtn'),
    toolbarMoreBtn: document.getElementById('toolbarMoreBtn'),
    toolbarOverflowMenu: document.getElementById('toolbarOverflowMenu'),
    mergeTagBtn: document.getElementById('mergeTagBtn'),
    mergeTagMenu: document.getElementById('mergeTagMenu'),
    mergeTagSearch: document.getElementById('mergeTagSearch'),
    mergeTagList: document.getElementById('mergeTagList'),
    mergeTagFallbackMenu: document.getElementById('mergeTagFallbackMenu'),
    mergeTagFallbackLabel: document.getElementById('mergeTagFallbackLabel'),
    mergeTagFallbackInput: document.getElementById('mergeTagFallbackInput'),
    mergeTagFallbackSaveBtn: document.getElementById('mergeTagFallbackSaveBtn'),
    mergeTagFallbackClearBtn: document.getElementById('mergeTagFallbackClearBtn'),
    mergeTagFallbackBackBtn: document.getElementById('mergeTagFallbackBackBtn'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    uploadVideoBtn: document.getElementById('uploadVideoBtn'),
    imageFileInput: document.getElementById('imageFileInput'),
    videoFileInput: document.getElementById('videoFileInput'),
    videoPosterFileInput: document.getElementById('videoPosterFileInput'),
    tabs: Array.from(document.querySelectorAll('.tab')),
    panels: Array.from(document.querySelectorAll('.mode-panel')),
    sourceToggle: document.querySelector('[data-source-toggle="true"]'),
    mediaInspector: document.getElementById('mediaInspector'),
    selectedTypeBadge: document.getElementById('selectedTypeBadge'),
    mediaAltInput: document.getElementById('mediaAltInput'),
    mediaLinkInput: document.getElementById('mediaLinkInput'),
    mediaWidthInput: document.getElementById('mediaWidthInput'),
    mediaHeightInput: document.getElementById('mediaHeightInput'),
    lockAspectInput: document.getElementById('lockAspectInput'),
    alignLeftBtn: document.getElementById('alignLeftBtn'),
    alignCenterBtn: document.getElementById('alignCenterBtn'),
    alignRightBtn: document.getElementById('alignRightBtn'),
    changeVideoPosterBtn: document.getElementById('changeVideoPosterBtn'),
    removeMediaBtn: document.getElementById('removeMediaBtn'),
    selectedMediaPreview: document.getElementById('selectedMediaPreview'),
    selectedMediaMeta: document.getElementById('selectedMediaMeta'),
  });
}

function bindToolbar() {
  document.querySelectorAll('[data-cmd]').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.sourceMode) return;
      focusEditor();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(button.dataset.cmd, false, null);
      refreshOutputs();
      syncToolbarState();
    });
  });

  els.blockFormat.addEventListener('change', () => {
    if (state.sourceMode) return;
    focusEditor();
    document.execCommand('formatBlock', false, els.blockFormat.value);
    refreshOutputs();
    syncToolbarState();
  });

  ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
    els.fontName.addEventListener(eventName, preserveEditorSelectionForFontControls);
    els.fontSize.addEventListener(eventName, preserveEditorSelectionForFontControls);
  });

  els.fontName.addEventListener('change', () => {
    if (state.sourceMode) return;
    if (!restoreSelectionForFontControls()) return;
    applyInlineTextStyle({ fontFamily: els.fontName.value });
    updateFontPickerPreview();
    refreshOutputs();
    syncToolbarState();
  });

  els.fontSize.addEventListener('change', () => {
    if (state.sourceMode) return;
    if (!restoreSelectionForFontControls()) return;
    applyInlineTextStyle({ fontSize: els.fontSize.value });
    refreshOutputs();
    syncToolbarState();
  });

  els.textColor.addEventListener('input', () => {
    if (state.sourceMode) return;
    focusEditor();
    document.execCommand('foreColor', false, els.textColor.value);
    refreshOutputs();
    syncToolbarState();
  });

  els.highlightColor.addEventListener('input', () => {
    if (state.sourceMode) return;
    focusEditor();
    document.execCommand('hiliteColor', false, els.highlightColor.value);
    refreshOutputs();
    syncToolbarState();
  });

  els.linkBtn.addEventListener('click', () => {
    if (state.sourceMode) return;
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    focusEditor();
    document.execCommand('createLink', false, url);
    syncEditorAnchors(els.editorCanvas);
    refreshOutputs();
    syncToolbarState();
  });

  els.unlinkBtn.addEventListener('click', () => {
    if (state.sourceMode) return;
    focusEditor();
    document.execCommand('unlink', false, null);
    syncEditorAnchors(els.editorCanvas);
    refreshOutputs();
    syncToolbarState();
  });

  els.tableBtn.addEventListener('click', () => {
    if (state.sourceMode) return;
    insertTable(2, 2);
    els.toolbarOverflowMenu.classList.add('hidden');
    refreshOutputs();
    syncToolbarState();
  });

  ['pointerdown', 'mousedown'].forEach((eventName) => {
    els.toolbarMoreBtn.addEventListener(eventName, preserveSubjectSelectionBeforeToolbarAction);
    els.mergeTagBtn.addEventListener(eventName, preserveSubjectSelectionBeforeToolbarAction);
    els.mergeTagList.addEventListener(eventName, preserveSubjectSelectionBeforeToolbarAction);
  });

  els.toolbarMoreBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = els.toolbarOverflowMenu.classList.contains('hidden');
    els.toolbarOverflowMenu.classList.toggle('hidden', !willOpen);
    if (willOpen) els.mergeTagMenu.classList.add('hidden');
  });

  els.mergeTagBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state.sourceMode) return;
    const selection = window.getSelection();
    const selectionInSubject = !!(selection && selection.rangeCount > 0 && els.subjectInput.contains(selection.getRangeAt(0).commonAncestorContainer));
    state.mergeTagTarget = selectionInSubject || document.activeElement === els.subjectInput || state.mergeTagTarget === 'subject' ? 'subject' : 'editor';
    if (state.mergeTagTarget === 'editor') saveSelection();
    else saveSubjectSelection();
    const willOpen = els.mergeTagMenu.classList.contains('hidden');
    els.mergeTagMenu.classList.toggle('hidden', !willOpen);
    if (willOpen) {
      renderMergeTagOptions('');
      els.mergeTagSearch.value = '';
      els.mergeTagSearch.focus();
    }
  });

  els.mergeTagSearch.addEventListener('input', () => {
    renderMergeTagOptions(els.mergeTagSearch.value);
  });

  els.mergeTagFallbackSaveBtn.addEventListener('click', saveActiveMergeTagFallback);
  els.mergeTagFallbackClearBtn.addEventListener('click', () => {
    if (!state.activeMergeChip) return;
    els.mergeTagFallbackInput.value = '';
    saveActiveMergeTagFallback();
  });
  els.mergeTagFallbackBackBtn.addEventListener('click', closeMergeTagFallbackMenu);
  els.mergeTagFallbackInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveActiveMergeTagFallback();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMergeTagFallbackMenu();
    }
  });
  els.mergeTagFallbackMenu.addEventListener('mouseenter', cancelMergeTagFallbackClose);
  els.mergeTagFallbackMenu.addEventListener('mouseleave', scheduleMergeTagFallbackClose);

  els.subjectInput.addEventListener('focus', () => {
    state.mergeTagTarget = 'subject';
    saveSubjectSelection();
  });
  els.subjectInput.addEventListener('click', () => {
    state.mergeTagTarget = 'subject';
    saveSubjectSelection();
  });
  els.subjectInput.addEventListener('mouseup', () => {
    state.mergeTagTarget = 'subject';
    saveSubjectSelection();
  });
  els.subjectInput.addEventListener('keyup', () => {
    state.mergeTagTarget = 'subject';
    saveSubjectSelection();
  });
  els.subjectInput.addEventListener('input', () => {
    state.mergeTagTarget = 'subject';
    hydrateMergeTags(els.subjectInput);
    saveSubjectSelection();
    refreshOutputs();
  });
  els.subjectInput.addEventListener('mouseover', (event) => {
    const chip = event.target.closest('.merge-tag-chip');
    if (!chip || !els.subjectInput.contains(chip)) return;
    cancelMergeTagFallbackClose();
    openMergeTagFallbackMenu(chip, { focusInput: false });
  });
  els.subjectInput.addEventListener('mouseout', (event) => {
    const chip = event.target.closest('.merge-tag-chip');
    if (!chip || !els.subjectInput.contains(chip)) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget && (chip.contains(nextTarget) || nextTarget.closest?.('#mergeTagFallbackMenu'))) return;
    scheduleMergeTagFallbackClose();
  });

  els.sourceToggle.addEventListener('click', toggleSourceMode);

  els.uploadImageBtn.addEventListener('click', () => els.imageFileInput.click());
  els.uploadVideoBtn.addEventListener('click', () => els.videoFileInput.click());

  els.imageFileInput.addEventListener('change', async () => {
    const file = els.imageFileInput.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const ratio = await getImageRatio(dataUrl);
    const width = Math.min(420, Math.round(520 * ratio));
    const height = Math.round(width / ratio);
    insertImageBlock({ src: dataUrl, alt: file.name, width, height, ratio });
    els.imageFileInput.value = '';
  });

  els.videoFileInput.addEventListener('change', async () => {
    const file = els.videoFileInput.files[0];
    if (!file) return;
    const posterInfo = await generateVideoPoster(file);
    const decoratedPoster = await decorateVideoPoster(posterInfo.poster);
    const safeRatio = posterInfo.ratio || (16 / 9);
    insertVideoBlock({
      poster: decoratedPoster,
      rawPoster: posterInfo.poster,
      fileName: file.name,
      alt: file.name,
      width: 420,
      height: Math.round(420 / safeRatio),
      ratio: safeRatio,
    });
    els.videoFileInput.value = '';
  });

  els.videoPosterFileInput.addEventListener('change', async () => {
    const file = els.videoPosterFileInput.files[0];
    if (!file || !state.selectedBlock || isImageBlock(state.selectedBlock)) return;
    const dataUrl = await readFileAsDataUrl(file);
    const ratio = await getImageRatio(dataUrl);
    const decoratedPoster = await decorateVideoPoster(dataUrl);
    state.selectedBlock.dataset.rawPoster = dataUrl;
    state.selectedBlock.dataset.poster = decoratedPoster;
    state.selectedBlock.dataset.ratio = String(ratio);
    state.selectedBlock.dataset.posterName = file.name || 'Custom thumbnail';
    const currentWidth = Number(state.selectedBlock.dataset.width) || 420;
    const nextHeight = Math.round(currentWidth / ratio);
    applyBlockSize(state.selectedBlock, currentWidth, nextHeight);
    const img = state.selectedBlock.querySelector('img');
    if (img) img.src = dataUrl;
    refreshOutputs();
    updateInspector();
    els.videoPosterFileInput.value = '';
    setStatus('Video thumbnail updated');
  });
}

function bindTabs() {
  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });
}

function bindEditor() {
  els.editorCanvas.addEventListener('input', () => {
    state.mergeTagTarget = 'editor';
    hydrateMergeTags(els.editorCanvas);
    refreshOutputs();
    syncToolbarState();
  });
  els.editorCanvas.addEventListener('mouseup', () => {
    state.mergeTagTarget = 'editor';
    saveSelection();
    syncToolbarState();
  });
  els.editorCanvas.addEventListener('keyup', () => {
    state.mergeTagTarget = 'editor';
    saveSelection();
    syncToolbarState();
  });

  els.editorCanvas.addEventListener('mouseover', (event) => {
    const chip = event.target.closest('.merge-tag-chip');
    if (!chip || !els.editorCanvas.contains(chip)) return;
    cancelMergeTagFallbackClose();
    openMergeTagFallbackMenu(chip, { focusInput: false });
  });

  els.editorCanvas.addEventListener('mouseout', (event) => {
    const chip = event.target.closest('.merge-tag-chip');
    if (!chip || !els.editorCanvas.contains(chip)) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget && (chip.contains(nextTarget) || nextTarget.closest?.('#mergeTagFallbackMenu'))) return;
    scheduleMergeTagFallbackClose();
  });

  els.editorCanvas.addEventListener('click', (event) => {
    const chip = event.target.closest('.merge-tag-chip');
    if (chip && els.editorCanvas.contains(chip)) {
      event.preventDefault();
      event.stopPropagation();
      cancelMergeTagFallbackClose();
      openMergeTagFallbackMenu(chip, { focusInput: true });
      selectBlock(null);
      return;
    }
    const block = event.target.closest('.media-block');
    if (block) {
      selectBlock(block);
      return;
    }
    closeMergeTagFallbackMenu();
    selectBlock(null);
  });

  els.sourceEditor.addEventListener('input', () => {
    if (!state.sourceMode) return;
    els.editorCanvas.innerHTML = els.sourceEditor.value;
    hydrateEditorBlocks();
    hydrateMergeTags(els.editorCanvas);
    syncEditorAnchors(els.editorCanvas);
    refreshOutputs();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.media-block, .media-inspector, .toolbar-strip, .tab-row, .editor-card')) {
      selectBlock(null);
    }
    if (!event.target.closest('#mergeTagBtn, #mergeTagMenu')) {
      els.mergeTagMenu.classList.add('hidden');
    }
    if (!event.target.closest('.merge-tag-chip, #mergeTagFallbackMenu')) {
      closeMergeTagFallbackMenu();
    }
    if (!event.target.closest('#toolbarMoreBtn, #toolbarOverflowMenu')) {
      els.toolbarOverflowMenu.classList.add('hidden');
    }
  });
}

function bindInspector() {
  els.mediaAltInput.addEventListener('input', () => {
    if (!state.selectedBlock) return;
    state.selectedBlock.dataset.alt = els.mediaAltInput.value;
    if (isImageBlock(state.selectedBlock)) {
      state.selectedBlock.querySelector('img').alt = els.mediaAltInput.value;
    } else {
      state.selectedBlock.querySelector('.video-caption').textContent = els.mediaAltInput.value || state.selectedBlock.dataset.fileName || 'Video';
    }
    refreshOutputs();
  });

  els.mediaLinkInput.addEventListener('input', () => {
    if (!state.selectedBlock) return;
    state.selectedBlock.dataset.link = els.mediaLinkInput.value.trim();
    updateMediaLinkPresentation(state.selectedBlock);
    refreshOutputs();
  });

  bindSizeInput(els.mediaWidthInput, () => {
    resizeSelectedFromInputs({ width: Number(els.mediaWidthInput.value) || 40 });
  });

  bindSizeInput(els.mediaHeightInput, () => {
    resizeSelectedFromInputs({ height: Number(els.mediaHeightInput.value) || 40, userChangedHeight: true });
  });

  els.lockAspectInput.addEventListener('change', () => {
    if (!state.selectedBlock) return;
    state.selectedBlock.dataset.lockAspect = String(els.lockAspectInput.checked);
  });

  els.alignLeftBtn.addEventListener('click', () => applyAlignment('left'));
  els.alignCenterBtn.addEventListener('click', () => applyAlignment('center'));
  els.alignRightBtn.addEventListener('click', () => applyAlignment('right'));
  els.changeVideoPosterBtn.addEventListener('click', () => {
    if (!state.selectedBlock || isImageBlock(state.selectedBlock)) return;
    els.videoPosterFileInput.click();
  });

  els.removeMediaBtn.addEventListener('click', () => {
    if (!state.selectedBlock) return;
    const target = state.selectedBlock;
    selectBlock(null);
    target.remove();
    refreshOutputs();
  });
}

function bindTopActions() {
  els.loadSampleBtn.addEventListener('click', loadSample);
  els.copyHtmlBtn.addEventListener('click', async () => {
    refreshOutputs();
    await navigator.clipboard.writeText(els.htmlOutput.value);
    setStatus('HTML copied');
  });
  els.downloadHtmlBtn.addEventListener('click', () => {
    refreshOutputs();
    const blob = new Blob([els.htmlOutput.value], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-template.html';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Download started');
  });
}

function loadSample() {
  const image = buildImagePlaceholderSvg('Uploaded image', 1200, 675, '#2ea3f2');
  const videoThumb = buildCustomVideoThumbnailSvg('Custom video thumbnail', 1200, 675);
  els.editorCanvas.innerHTML = `
    <p>Hi [receiver_first_name],</p>
    <p>I came across your request for life insurance information and wanted to reach out personally.</p>
    <p>If you are still considering coverage, I would be happy to help. As an independent brokerage, we work with a range of leading insurance providers to help you find the right coverage at the lowest available rate.</p>
    <p>If life insurance is still on your to-do list, reply to this email with the best number to reach you, and I will give you a quick call to discuss your options.</p>
    <p><a href="https://example.com/coverage" title="https://example.com/coverage">independent</a> is linked in this sample so hovering shows the URL.</p>
  `;
  insertImageBlock({ src: image, alt: 'Uploaded image', width: 360, height: 203, ratio: 1200 / 675, link: 'https://example.com/image-destination', skipSpacer: true });
  insertVideoBlock({ poster: videoThumb, fileName: 'Coverage overview', alt: 'Coverage overview', width: 360, height: 203, ratio: 16 / 9, link: 'https://example.com/video-destination', skipSpacer: true });
  els.editorCanvas.insertAdjacentHTML('beforeend', '<p>Best regards,<br />Karen Mening</p>');
  hydrateMergeTags(els.editorCanvas);
  syncEditorAnchors(els.editorCanvas);
  selectBlock(null);
  refreshOutputs();
  syncToolbarState();
  setStatus('Sample loaded');
}

function switchMode(mode) {
  state.mode = mode;
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === mode));
  refreshOutputs();
}

function toggleSourceMode() {
  state.sourceMode = !state.sourceMode;
  closeMergeTagFallbackMenu();
  els.sourceToggle.classList.toggle('active', state.sourceMode);
  els.sourceEditor.classList.toggle('hidden', !state.sourceMode);
  els.editorCanvas.classList.toggle('hidden', state.sourceMode);
  if (state.sourceMode) {
    refreshOutputs();
    els.sourceEditor.value = getEditorHtmlForSource();
  } else {
    els.editorCanvas.innerHTML = els.sourceEditor.value;
    hydrateEditorBlocks();
    hydrateMergeTags(els.editorCanvas);
    syncEditorAnchors(els.editorCanvas);
    refreshOutputs();
    syncToolbarState();
  }
}

function focusEditor() {
  restoreSelection();
  els.editorCanvas.focus();
}

function initFontPickerPreview() {
  Array.from(els.fontName.options).forEach((option) => {
    option.style.fontFamily = option.value;
  });
  updateFontPickerPreview();
}

function updateFontPickerPreview() {
  els.fontName.style.fontFamily = els.fontName.value || 'Arial, Helvetica, sans-serif';
}

function preserveEditorSelectionForFontControls() {
  if (state.sourceMode) return;
  saveSelection();
}

function restoreSelectionForFontControls() {
  els.editorCanvas.focus({ preventScroll: true });
  restoreSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return !range.collapsed && els.editorCanvas.contains(range.commonAncestorContainer);
}

function saveSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (els.editorCanvas.contains(range.commonAncestorContainer)) {
    state.savedRange = range.cloneRange();
    state.mergeTagTarget = 'editor';
  }
}

function handleSelectionChange() {
  if (state.sourceMode) return;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && els.subjectInput.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    state.mergeTagTarget = 'subject';
    saveSubjectSelection();
    return;
  }
  saveSelection();
  syncToolbarState();
}

function restoreSelection() {
  if (!state.savedRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(state.savedRange);
}

function insertTable(rows, cols) {
  const table = document.createElement('table');
  for (let r = 0; r < rows; r += 1) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c += 1) {
      const cell = document.createElement(r === 0 ? 'th' : 'td');
      cell.textContent = r === 0 ? `Heading ${c + 1}` : `Value ${r}.${c + 1}`;
      tr.appendChild(cell);
    }
    table.appendChild(tr);
  }
  insertNodeAtCaret(table, true);
}

function insertImageBlock({ src, alt, width, height, ratio, link = '', skipSpacer = false }) {
  const block = document.createElement('div');
  block.className = 'media-block image-block align-center';
  block.contentEditable = 'false';
  block.dataset.kind = 'image';
  block.dataset.src = src;
  block.dataset.alt = alt || '';
  block.dataset.link = link;
  block.dataset.width = String(width);
  block.dataset.height = String(height);
  block.dataset.ratio = String(ratio || width / height || 1);
  block.dataset.lockAspect = 'true';
  block.dataset.align = 'center';
  block.style.width = `${width}px`;
  block.style.height = `${height}px`;

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.width = width;
  img.height = height;
  img.style.height = `${height}px`;

  block.appendChild(img);
  updateMediaLinkPresentation(block);
  block.appendChild(createResizeHandle());
  insertNodeAtCaret(block, !skipSpacer);
  selectBlock(block);
  refreshOutputs();
}

function insertVideoBlock({ poster, rawPoster = '', fileName, alt, width, height, ratio, link = '', skipSpacer = false }) {
  const block = document.createElement('div');
  const displayPoster = rawPoster || poster;
  block.className = 'media-block video-block align-center';
  block.contentEditable = 'false';
  block.dataset.kind = 'video';
  block.dataset.poster = poster;
  block.dataset.rawPoster = displayPoster;
  block.dataset.fileName = fileName || 'Video';
  block.dataset.alt = alt || fileName || 'Video';
  block.dataset.link = link;
  block.dataset.width = String(width);
  block.dataset.height = String(height);
  block.dataset.ratio = String(ratio || 16 / 9);
  block.dataset.lockAspect = 'true';
  block.dataset.align = 'center';
  block.style.width = `${width}px`;
  block.style.height = `${height + 44}px`;

  block.innerHTML = `
    <div class="video-thumb">
      <img src="${escapeAttribute(displayPoster)}" alt="${escapeAttribute(alt || fileName || 'Video')}" style="height:${height}px; object-fit:cover;" />
      <span class="video-play-overlay" aria-hidden="true"><span class="video-play-icon"></span></span>
      <span class="video-thumb-badge">VIDEO</span>
    </div>
    <div class="video-caption">${escapeHtml(alt || fileName || 'Video')}</div>
  `;
  updateMediaLinkPresentation(block);
  block.appendChild(createResizeHandle());
  insertNodeAtCaret(block, !skipSpacer);
  selectBlock(block);
  refreshOutputs();
}

function createResizeHandle() {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.addEventListener('pointerdown', startResizeDrag);
  return handle;
}

function startResizeDrag(event) {
  event.preventDefault();
  event.stopPropagation();
  const block = event.target.closest('.media-block');
  if (!block) return;
  selectBlock(block);
  state.drag = {
    block,
    startX: event.clientX,
    startY: event.clientY,
    width: Number(block.dataset.width),
    height: Number(block.dataset.height),
    ratio: Number(block.dataset.ratio) || 1,
    lockAspect: block.dataset.lockAspect !== 'false',
  };
}

function onPointerMove(event) {
  if (!state.drag) return;
  const dx = event.clientX - state.drag.startX;
  const dy = event.clientY - state.drag.startY;
  let width = clamp(Math.round(state.drag.width + dx), 40, 640);
  let height = clamp(Math.round(state.drag.height + dy), 40, 640);
  if (state.drag.lockAspect) {
    height = Math.round(width / state.drag.ratio);
  }
  applyBlockSize(state.drag.block, width, height);
  updateInspector();
  refreshOutputs();
}

function stopDrag() {
  if (!state.drag) return;
  state.drag = null;
}

function resizeSelectedFromInputs({ width, height, userChangedHeight = false }) {
  const block = state.selectedBlock;
  const ratio = Number(block.dataset.ratio) || 1;
  const lock = block.dataset.lockAspect !== 'false';
  let nextWidth = clamp(width || Number(block.dataset.width), 40, 640);
  let nextHeight = clamp(height || Number(block.dataset.height), 40, 640);

  if (lock && userChangedHeight) nextWidth = Math.round(nextHeight * ratio);
  if (lock && !userChangedHeight) nextHeight = Math.round(nextWidth / ratio);

  applyBlockSize(block, nextWidth, nextHeight);
  updateInspector();
  refreshOutputs();
}

function applyBlockSize(block, width, height) {
  block.dataset.width = String(width);
  block.dataset.height = String(height);
  block.style.width = `${width}px`;
  if (isImageBlock(block)) {
    block.style.height = `${height}px`;
    const img = block.querySelector('img');
    img.width = width;
    img.height = height;
    img.style.height = `${height}px`;
  } else {
    block.style.height = `${height + 44}px`;
    const img = block.querySelector('img');
    img.style.height = `${height}px`;
  }
  updateMediaLinkPresentation(block);
}

function updateMediaLinkPresentation(block) {
  if (!block) return;
  const link = (block.dataset.link || '').trim();
  const title = link || '';
  const img = block.querySelector('img');
  const caption = block.querySelector('.video-caption');
  if (title) {
    block.setAttribute('title', title);
    block.style.cursor = 'pointer';
    if (img) img.setAttribute('title', title);
    if (caption) caption.setAttribute('title', title);
  } else {
    block.removeAttribute('title');
    block.style.cursor = '';
    if (img) img.removeAttribute('title');
    if (caption) caption.removeAttribute('title');
  }
}

function applyAlignment(align) {
  if (!state.selectedBlock) return;
  state.selectedBlock.classList.remove('align-left', 'align-center', 'align-right');
  state.selectedBlock.classList.add(`align-${align}`);
  state.selectedBlock.dataset.align = align;
  refreshOutputs();
}

function selectBlock(block) {
  if (state.selectedBlock) state.selectedBlock.classList.remove('selected');
  state.selectedBlock = block;
  if (block) block.classList.add('selected');
  updateInspector();
}

function updateInspector() {
  if (!state.selectedBlock) {
    els.mediaInspector.classList.add('hidden');
    if (els.selectedMediaPreview) els.selectedMediaPreview.textContent = 'Select an image or video block to preview it here.';
    if (els.selectedMediaMeta) els.selectedMediaMeta.textContent = 'No media selected';
    return;
  }
  els.mediaInspector.classList.remove('hidden');
  const imageSelected = isImageBlock(state.selectedBlock);
  els.selectedTypeBadge.textContent = imageSelected ? 'Image' : 'Video';
  els.changeVideoPosterBtn.classList.toggle('hidden', imageSelected);
  updateMediaLinkPresentation(state.selectedBlock);
  if (document.activeElement !== els.mediaAltInput) els.mediaAltInput.value = state.selectedBlock.dataset.alt || '';
  if (document.activeElement !== els.mediaLinkInput) els.mediaLinkInput.value = state.selectedBlock.dataset.link || '';
  if (document.activeElement !== els.mediaWidthInput) els.mediaWidthInput.value = state.selectedBlock.dataset.width || '';
  if (document.activeElement !== els.mediaHeightInput) els.mediaHeightInput.value = state.selectedBlock.dataset.height || '';
  els.lockAspectInput.checked = state.selectedBlock.dataset.lockAspect !== 'false';
  refreshSelectedMediaPreview();
}

function refreshSelectedMediaPreview() {
  if (!els.selectedMediaPreview || !els.selectedMediaMeta || !state.selectedBlock) return;
  const block = state.selectedBlock;
  const width = Number(block.dataset.width) || 320;
  const height = Number(block.dataset.height) || 180;
  const title = (block.dataset.alt || block.dataset.fileName || (isImageBlock(block) ? 'Image' : 'Video')).trim();
  const link = (block.dataset.link || '').trim();

  if (isImageBlock(block)) {
    els.selectedMediaPreview.innerHTML = `<img src="${escapeAttribute(block.dataset.src)}" alt="${escapeAttribute(title)}" style="max-width:min(220px, 100%); max-height:140px; border-radius:10px;" />`;
    els.selectedMediaMeta.textContent = `${title || 'Image'} • ${width}×${height}${link ? ` • ${link}` : ''}`;
    return;
  }

  const previewPoster = block.dataset.rawPoster || block.dataset.poster;
  els.selectedMediaPreview.innerHTML = `
    <div class="video-thumb" style="width:min(220px, 100%); margin:0 auto; border-radius:10px; overflow:hidden;">
      <img src="${escapeAttribute(previewPoster)}" alt="${escapeAttribute(title)}" style="display:block; width:100%; max-height:140px; object-fit:cover;" />
      <span class="video-play-overlay" aria-hidden="true"><span class="video-play-icon"></span></span>
      <span class="video-thumb-badge">VIDEO</span>
    </div>
  `;
  els.selectedMediaMeta.textContent = `${title || 'Video'} • ${width}×${height}${link ? ` • ${link}` : ''}`;
}

function isImageBlock(block) {
  return block?.dataset?.kind === 'image';
}

function insertNodeAtCaret(node, addSpacer = true) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(node);
  if (addSpacer) {
    const p = document.createElement('p');
    p.innerHTML = '<br />';
    fragment.appendChild(p);
  }

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && els.editorCanvas.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    const range = selection.getRangeAt(0);
    const anchorChild = getDirectEditorChild(range.startContainer);
    if (anchorChild) anchorChild.after(fragment);
    else els.editorCanvas.appendChild(fragment);
  } else {
    els.editorCanvas.appendChild(fragment);
  }
}

function getDirectEditorChild(node) {
  let current = node?.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current.parentNode && current.parentNode !== els.editorCanvas) {
    current = current.parentNode;
  }
  return current && current.parentNode === els.editorCanvas ? current : null;
}

function hydrateEditorBlocks() {
  els.editorCanvas.querySelectorAll('.media-block').forEach((block) => {
    if (!block.querySelector('.resize-handle')) block.appendChild(createResizeHandle());
    if (!block.dataset.align) block.dataset.align = 'center';
    block.classList.add(`align-${block.dataset.align}`);
    block.contentEditable = 'false';
    if (!isImageBlock(block)) {
      const thumb = block.querySelector('.video-thumb');
      if (thumb && !thumb.querySelector('.video-play-overlay')) {
        thumb.insertAdjacentHTML('beforeend', '<span class="video-play-overlay" aria-hidden="true"><span class="video-play-icon"></span></span>');
      }
      if (thumb && !thumb.querySelector('.video-thumb-badge')) {
        thumb.insertAdjacentHTML('beforeend', '<span class="video-thumb-badge">VIDEO</span>');
      }
    }
    updateMediaLinkPresentation(block);
  });
}

function applyInlineTextStyle(styleMap) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed || !els.editorCanvas.contains(range.commonAncestorContainer)) return;

  const span = document.createElement('span');
  Object.entries(styleMap).forEach(([key, value]) => {
    span.style[key] = value;
  });

  const fragment = range.extractContents();
  span.appendChild(fragment);
  range.insertNode(span);
  normalizeStyledSpans(els.editorCanvas);

  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  state.savedRange = nextRange.cloneRange();
}

function normalizeStyledSpans(root) {
  root.querySelectorAll('span').forEach((span) => {
    if (!span.parentElement || span.classList.contains('merge-tag-chip')) return;
    if (span.childNodes.length === 1 && span.firstChild.nodeType === Node.ELEMENT_NODE && span.firstChild.tagName === 'SPAN') {
      const child = span.firstChild;
      const merged = `${child.getAttribute('style') || ''};${span.getAttribute('style') || ''}`;
      child.setAttribute('style', merged.replace(/^;+|;+$/g, ''));
      span.replaceWith(child);
    }
  });
}

function normalizeFontTags(root) {
  const sizeMap = { '1': '8px', '2': '10px', '3': '12px', '4': '14px', '5': '18px', '6': '24px', '7': '32px' };
  root.querySelectorAll('font').forEach((fontTag) => {
    const span = document.createElement('span');
    span.innerHTML = fontTag.innerHTML;
    const styles = [];
    if (fontTag.getAttribute('color')) styles.push(`color:${fontTag.getAttribute('color')}`);
    if (fontTag.getAttribute('face')) styles.push(`font-family:${fontTag.getAttribute('face')}`);
    if (fontTag.getAttribute('size')) styles.push(`font-size:${sizeMap[fontTag.getAttribute('size')] || '14px'}`);
    span.setAttribute('style', styles.join(';'));
    fontTag.replaceWith(span);
  });
}

function renderMergeTagOptions(filter = '') {
  const term = String(filter || '').trim().toLowerCase();
  const matches = MERGE_TAGS.filter((item) => item.label.toLowerCase().includes(term) || item.token.toLowerCase().includes(term));
  if (!matches.length) {
    els.mergeTagList.innerHTML = '<div class="merge-tag-empty">No merge tags found</div>';
    return;
  }
  els.mergeTagList.innerHTML = matches.map((item) => `
    <button class="merge-tag-option" type="button" data-token="${escapeAttribute(item.token)}" data-label="${escapeAttribute(item.label)}">
      <span class="merge-tag-bullet">#</span>
      <span>${escapeHtml(item.label)}</span>
    </button>
  `).join('');
  els.mergeTagList.querySelectorAll('.merge-tag-option').forEach((button) => {
    button.addEventListener('click', () => {
      insertMergeTag(button.dataset.token, button.dataset.label);
      els.mergeTagMenu.classList.add('hidden');
    });
  });
}

function insertMergeTag(token, label) {
  if (state.sourceMode) return;
  if (state.mergeTagTarget === 'subject') {
    insertMergeTagIntoSubject(token, label);
    refreshOutputs();
    setStatus(`${label} merge tag inserted`);
    return;
  }
  focusEditor();
  const chip = createMergeTagChip({ token, label });
  insertInlineNodeAtCaret(chip);
  const spacer = document.createTextNode(' ');
  insertInlineNodeAtCaret(spacer);
  refreshOutputs();
  saveSelection();
  setStatus(`${label} merge tag inserted`);
}

function createMergeTagChip({ token, label, fallback = '' }) {
  const chip = document.createElement('span');
  chip.className = 'merge-tag-chip';
  chip.dataset.mergeTag = token;
  chip.dataset.mergeLabel = label;
  chip.dataset.mergeFallback = fallback;
  chip.contentEditable = 'false';
  chip.textContent = label;
  updateMergeTagChipPresentation(chip);
  return chip;
}

function updateMergeTagChipPresentation(chip) {
  const fallback = String(chip.dataset.mergeFallback || '').trim();
  chip.dataset.hasFallback = fallback ? 'true' : 'false';
  chip.title = fallback ? `${chip.dataset.mergeLabel || 'Merge tag'} fallback: ${fallback}` : '';
}

function buildMergeTagToken(token, fallback = '') {
  const normalizedToken = String(token || '').trim();
  const normalizedFallback = String(fallback || '').trim();
  if (!normalizedToken) return '';
  if (!normalizedFallback) return normalizedToken;
  return normalizedToken.replace(/\]$/, ` fallback=${normalizedFallback}]`);
}

function parseMergeTagToken(value) {
  const match = String(value || '').match(/^\[(receiver_[a-z0-9_]+)(?:\s+fallback=([^\]]*)|\|fallback=([^\]]*))?\]$/i);
  if (!match) return null;
  const token = `[${match[1]}]`;
  const definition = MERGE_TAGS.find((item) => item.token === token);
  if (!definition) return null;
  return {
    token,
    label: definition.label,
    fallback: match[2] || match[3] || '',
  };
}

function openMergeTagFallbackMenu(chip, options = {}) {
  const { focusInput = true } = options;
  cancelMergeTagFallbackClose();
  state.activeMergeChip = chip;
  const label = chip.dataset.mergeLabel || 'Merge tag';
  els.mergeTagFallbackLabel.textContent = `If we can't find ${label}`;
  els.mergeTagFallbackInput.value = chip.dataset.mergeFallback || '';
  els.mergeTagFallbackMenu.classList.remove('hidden');
  positionMergeTagFallbackMenu();
  if (focusInput) {
    els.mergeTagFallbackInput.focus();
    els.mergeTagFallbackInput.select();
  }
}

function positionMergeTagFallbackMenu() {
  if (!state.activeMergeChip || els.mergeTagFallbackMenu.classList.contains('hidden')) return;
  const rect = state.activeMergeChip.getBoundingClientRect();
  const menuWidth = Math.min(340, window.innerWidth - 24);
  const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, rect.left - 16));
  const top = Math.min(window.innerHeight - 150, rect.top - 98);
  els.mergeTagFallbackMenu.style.left = `${left}px`;
  els.mergeTagFallbackMenu.style.top = `${Math.max(12, top)}px`;
}

function cancelMergeTagFallbackClose() {
  clearTimeout(state.mergeTagFallbackCloseTimer);
  state.mergeTagFallbackCloseTimer = null;
}

function scheduleMergeTagFallbackClose() {
  cancelMergeTagFallbackClose();
  state.mergeTagFallbackCloseTimer = setTimeout(() => {
    if (document.activeElement && els.mergeTagFallbackMenu.contains(document.activeElement)) return;
    closeMergeTagFallbackMenu();
  }, 160);
}

function closeMergeTagFallbackMenu() {
  cancelMergeTagFallbackClose();
  els.mergeTagFallbackMenu.classList.add('hidden');
  state.activeMergeChip = null;
}

function saveActiveMergeTagFallback() {
  if (!state.activeMergeChip) return;
  state.activeMergeChip.dataset.mergeFallback = els.mergeTagFallbackInput.value.trim();
  updateMergeTagChipPresentation(state.activeMergeChip);
  refreshOutputs();
  saveSelection();
  setStatus(`${state.activeMergeChip.dataset.mergeLabel || 'Merge tag'} fallback saved`);
  closeMergeTagFallbackMenu();
}

function hydrateMergeTags(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let current;
  while ((current = walker.nextNode())) {
    if (!current.nodeValue || !current.nodeValue.includes('[receiver_')) continue;
    if (current.parentElement && current.parentElement.closest('.merge-tag-chip, .media-block')) continue;
    textNodes.push(current);
  }
  textNodes.forEach((node) => replaceMergeTokensInTextNode(node));
}

function replaceMergeTokensInTextNode(node) {
  const text = node.nodeValue;
  const pattern = /\[(receiver_[a-z0-9_]+)(?:\s+fallback=([^\]]*)|\|fallback=([^\]]*))?\]/gi;
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let matched = false;
  let match;

  while ((match = pattern.exec(text))) {
    const parsed = parseMergeTagToken(match[0]);
    if (!parsed) continue;
    matched = true;
    if (match.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    fragment.appendChild(createMergeTagChip(parsed));
    cursor = match.index + match[0].length;
  }

  if (!matched) return;
  if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
  node.parentNode.replaceChild(fragment, node);
}

function serializeMergeTags(root) {
  root.querySelectorAll('.merge-tag-chip').forEach((chip) => {
    chip.replaceWith(document.createTextNode(buildMergeTagToken(chip.dataset.mergeTag || '', chip.dataset.mergeFallback || '')));
  });
}

function inlinePreviewMergeTags(root) {
  root.querySelectorAll('.merge-tag-chip').forEach((chip) => {
    const fallback = String(chip.dataset.mergeFallback || '').trim();
    chip.setAttribute('style', 'display:inline-block;padding:1px 8px;border-radius:999px;background:#2ea3f2;color:#ffffff;font-size:0.96em;line-height:1.5;white-space:nowrap;vertical-align:baseline;');
    if (fallback) chip.setAttribute('title', `Fallback: ${fallback}`);
  });
}

function resolveMergeTagsInString(template, mergeData = {}) {
  return String(template || '').replace(/\[(receiver_[a-z0-9_]+)(?:\s+fallback=([^\]]*)|\|fallback=([^\]]*))?\]/gi, (full, key, fallbackA = '', fallbackB = '') => {
    const value = mergeData?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
    return fallbackA || fallbackB || full;
  });
}

function getEditorHtmlForSource() {
  const clone = els.editorCanvas.cloneNode(true);
  serializeMergeTags(clone);
  return clone.innerHTML;
}

function getSerializedSubjectLine() {
  const clone = els.subjectInput.cloneNode(true);
  serializeMergeTags(clone);
  return String(clone.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function saveSubjectSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (els.subjectInput.contains(range.commonAncestorContainer)) {
    state.subjectSavedRange = range.cloneRange();
  }
}

function preserveSubjectSelectionBeforeToolbarAction(event) {
  if (state.sourceMode || state.mergeTagTarget !== 'subject') return;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && els.subjectInput.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    saveSubjectSelection();
    event.preventDefault();
  }
}

function restoreSubjectSelection() {
  if (!state.subjectSavedRange) return false;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(state.subjectSavedRange);
  return true;
}

function insertMergeTagIntoSubject(token, label) {
  const savedRange = state.subjectSavedRange ? state.subjectSavedRange.cloneRange() : null;
  els.subjectInput.focus();
  if (savedRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  } else {
    restoreSubjectSelection();
  }
  const chip = createMergeTagChip({ token, label });
  insertInlineNodeAtCaret(chip, els.subjectInput);
  saveSubjectSelection();
}

function syncEditorAnchors(root) {
  root.querySelectorAll('a[href]').forEach((link) => {
    const href = (link.getAttribute('href') || '').trim();
    if (!href) return;
    link.setAttribute('title', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  });
}

function insertInlineNodeAtCaret(node, container = els.editorCanvas) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    container.appendChild(node);
    return;
  }
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    container.appendChild(node);
    return;
  }
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  if (container === els.subjectInput) state.subjectSavedRange = range.cloneRange();
}

function syncToolbarState() {
  if (state.sourceMode) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!els.editorCanvas.contains(range.commonAncestorContainer)) return;
  const element = getSelectionElement(range.commonAncestorContainer);
  if (!element) return;

  const computed = window.getComputedStyle(element);
  const fontFamily = (computed.fontFamily || '').toLowerCase();
  const fontSizePx = `${Math.round(parseFloat(computed.fontSize || '14'))}px`;
  const blockTag = getClosestBlockTag(element);

  setSelectToClosestValue(els.fontName, fontFamily, 'font');
  setSelectToClosestValue(els.fontSize, fontSizePx, 'size');
  updateFontPickerPreview();
  if (blockTag) els.blockFormat.value = blockTag;

  document.querySelectorAll('[data-cmd]').forEach((button) => button.classList.remove('active'));
  toggleCommandButton('bold', document.queryCommandState('bold'));
  toggleCommandButton('italic', document.queryCommandState('italic'));
  toggleCommandButton('underline', document.queryCommandState('underline'));
  toggleCommandButton('strikeThrough', document.queryCommandState('strikeThrough'));
  toggleCommandButton('insertUnorderedList', document.queryCommandState('insertUnorderedList'));
  toggleCommandButton('insertOrderedList', document.queryCommandState('insertOrderedList'));
  toggleCommandButton('justifyLeft', document.queryCommandState('justifyLeft'));
  toggleCommandButton('justifyCenter', document.queryCommandState('justifyCenter'));
  toggleCommandButton('justifyRight', document.queryCommandState('justifyRight'));

  const textHex = rgbToHex(computed.color);
  if (textHex) els.textColor.value = textHex;
}

function toggleCommandButton(cmd, active) {
  const button = document.querySelector(`[data-cmd="${cmd}"]`);
  if (button) button.classList.toggle('active', !!active);
}

function getSelectionElement(node) {
  let current = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (current && current !== els.editorCanvas && current.parentElement && !current.matches('span, p, div, a, strong, em, u, s, h1, h2, h3, li, blockquote')) {
    current = current.parentElement;
  }
  return current || els.editorCanvas;
}

function getClosestBlockTag(element) {
  const block = element.closest('p,h1,h2,h3,blockquote');
  return block ? block.tagName : 'P';
}

function setSelectToClosestValue(select, value, mode) {
  const normalized = (value || '').toLowerCase();
  const options = Array.from(select.options);
  const found = options.find((option) => {
    const candidate = option.value.toLowerCase();
    if (mode === 'font') return normalized.includes(candidate.split(',')[0].replace(/['"]/g, '').trim());
    return candidate === normalized;
  });
  if (found) select.value = found.value;
}

function rgbToHex(value) {
  const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  const [, r, g, b] = match;
  return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

function refreshOutputs() {
  syncEditorAnchors(els.editorCanvas);
  if (state.sourceMode) els.sourceEditor.value = getEditorHtmlForSource();
  const html = generateEmailHtml();
  const previewHtml = generateEmailHtml({ forPreview: true });
  els.htmlOutput.value = html;
  els.previewFrame.onload = syncPreviewFrameHeight;
  els.previewFrame.srcdoc = previewHtml;
}

function syncPreviewFrameHeight() {
  const frameDoc = els.previewFrame.contentDocument;
  if (!frameDoc) return;
  requestAnimationFrame(() => {
    const height = Math.max(
      frameDoc.documentElement?.scrollHeight || 0,
      frameDoc.body?.scrollHeight || 0,
      320,
    );
    els.previewFrame.style.height = `${height}px`;
    els.previewFrame.contentWindow?.scrollTo(0, 0);
  });
}

function generateEmailHtml({ forPreview = false } = {}) {
  const clone = els.editorCanvas.cloneNode(true);
  clone.querySelectorAll('.selected').forEach((n) => n.classList.remove('selected'));
  clone.querySelectorAll('.resize-handle').forEach((n) => n.remove());
  clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
  normalizeFontTags(clone);
  if (forPreview) inlinePreviewMergeTags(clone);
  else serializeMergeTags(clone);
  syncEditorAnchors(clone);
  inlineEmailStyles(clone);
  transformMediaBlocks(clone);
  const body = clone.innerHTML.trim() || '<p>&nbsp;</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(getSerializedSubjectLine() || 'Email')}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px; border-collapse:collapse; background:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
          <tr>
            <td style="padding:24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#1f2937;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function inlineEmailStyles(root) {
  const map = [
    ['p', 'margin:0 0 16px; font-size:14px; line-height:1.6;'],
    ['h1', 'margin:0 0 16px; font-size:28px; line-height:1.25;'],
    ['h2', 'margin:0 0 14px; font-size:22px; line-height:1.3;'],
    ['h3', 'margin:0 0 12px; font-size:18px; line-height:1.35;'],
    ['ul', 'margin:0 0 16px 22px; padding:0;'],
    ['ol', 'margin:0 0 16px 22px; padding:0;'],
    ['li', 'margin:0 0 8px;'],
    ['blockquote', 'margin:0 0 16px; padding-left:12px; border-left:4px solid #b8dff8; color:#475569;'],
    ['table', 'width:100%; border-collapse:collapse; margin:0 0 16px;'],
    ['td', 'border:1px solid #d7deea; padding:8px;'],
    ['th', 'border:1px solid #d7deea; padding:8px; text-align:left; background:#f8fbff;'],
    ['a', 'color:#2ea3f2; text-decoration:underline;'],
  ];
  map.forEach(([selector, styles]) => {
    root.querySelectorAll(selector).forEach((el) => appendStyle(el, styles));
  });
}

function transformMediaBlocks(root) {
  root.querySelectorAll('.media-block').forEach((block) => {
    const align = block.dataset.align || 'center';
    const alignAttr = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
    const width = Number(block.dataset.width) || 320;
    const height = Number(block.dataset.height) || 180;
    const link = block.dataset.link || '';
    const alt = block.dataset.alt || '';

    const blockMargin = align === 'center' ? '0 auto 16px auto' : align === 'right' ? '0 0 16px auto' : '0 auto 16px 0';
    if (isImageBlock(block)) {
      const img = `<img src="${escapeAttribute(block.dataset.src)}" alt="${escapeAttribute(alt)}" width="${width}" height="${height}" style="display:block; width:${width}px; height:${height}px; border:0; outline:none; text-decoration:none;" />`;
      const content = link ? `<a href="${escapeAttribute(link)}" target="_blank" rel="noopener" style="text-decoration:none;">${img}</a>` : img;
      replaceNodeWithHtml(block, `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${alignAttr}" style="margin:${blockMargin}; border-collapse:collapse; width:${width}px;">
          <tr><td align="${alignAttr}" style="padding:0; border:0;">${content}</td></tr>
        </table>
      `);
    } else {
      const href = link || '#';
      replaceNodeWithHtml(block, `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${alignAttr}" style="margin:${blockMargin}; border-collapse:collapse; width:${width}px;">
          <tr>
            <td align="${alignAttr}" style="padding:0; border:0;">
              <a href="${escapeAttribute(href)}" target="_blank" rel="noopener" style="text-decoration:none; display:block;">
                <img src="${escapeAttribute(block.dataset.poster)}" alt="${escapeAttribute(alt)}" width="${width}" height="${height}" style="display:block; width:${width}px; height:${height}px; border:0; outline:none; text-decoration:none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="${alignAttr}" style="padding:10px 0 0; border:0; font-size:13px; font-family:Arial, Helvetica, sans-serif; font-weight:700; color:#1f2937;">${escapeHtml(alt || block.dataset.fileName || 'Video')}</td>
          </tr>
          <tr>
            <td align="${alignAttr}" style="padding:10px 0 0; border:0;">
              <a href="${escapeAttribute(href)}" target="_blank" rel="noopener" style="display:inline-block; padding:10px 16px; border-radius:999px; background:#111827; color:#ffffff; text-decoration:none; font-size:13px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">▶ Watch video</a>
            </td>
          </tr>
        </table>
      `);
    }
  });
}

function appendStyle(el, styles) {
  const current = el.getAttribute('style') || '';
  el.setAttribute('style', `${current}${current && !current.trim().endsWith(';') ? ';' : ''}${styles}`);
}

function replaceNodeWithHtml(node, html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  node.replaceWith(template.content);
}

function setStatus(text) {
  els.statusBadge.textContent = text;
  clearTimeout(state.statusTimer);
  state.statusTimer = setTimeout(() => {
    els.statusBadge.textContent = 'Ready';
  }, 2200);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageRatio(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => resolve(16 / 9);
    img.src = src;
  });
}

function bindSizeInput(input, applyFn) {
  const schedule = () => {
    clearTimeout(state.inputTimers[input.id]);
    if (!input.value) return;
    state.inputTimers[input.id] = setTimeout(() => {
      if (!state.selectedBlock) return;
      applyFn();
    }, 180);
  };

  input.addEventListener('input', schedule);
  input.addEventListener('change', () => {
    clearTimeout(state.inputTimers[input.id]);
    if (!input.value || !state.selectedBlock) return;
    applyFn();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(state.inputTimers[input.id]);
      if (!input.value || !state.selectedBlock) return;
      applyFn();
      input.blur();
    }
  });
}

function decorateVideoPoster(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || 1280;
        const height = img.naturalHeight || 720;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const circleRadius = Math.max(28, Math.round(Math.min(width, height) * 0.11));
        const circleX = Math.round(width / 2);
        const circleY = Math.round(height / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.48)';
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(17,24,39,0.92)';
        ctx.beginPath();
        ctx.moveTo(circleX - Math.round(circleRadius * 0.10), circleY - Math.round(circleRadius * 0.34));
        ctx.lineTo(circleX - Math.round(circleRadius * 0.10), circleY + Math.round(circleRadius * 0.34));
        ctx.lineTo(circleX + Math.round(circleRadius * 0.42), circleY);
        ctx.closePath();
        ctx.fill();

        const badgeText = 'VIDEO';
        const badgeFont = `700 ${Math.max(18, Math.round(width / 34))}px Arial`;
        ctx.font = badgeFont;
        const badgePaddingX = Math.max(14, Math.round(width / 64));
        const badgePaddingY = Math.max(8, Math.round(height / 90));
        const badgeTextWidth = ctx.measureText(badgeText).width;
        const badgeWidth = Math.round(badgeTextWidth + badgePaddingX * 2);
        const badgeHeight = Math.round(parseInt(badgeFont.match(/(\d+)px/)[1], 10) + badgePaddingY * 1.6);
        const badgeX = width - badgeWidth - Math.max(20, Math.round(width / 40));
        const badgeY = Math.max(20, Math.round(height / 34));
        const badgeRadius = Math.round(badgeHeight / 2);

        ctx.fillStyle = 'rgba(17,24,39,0.86)';
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgePaddingX, badgeY + badgeHeight / 2 + 1);

        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function generateVideoPoster(file) {
  return new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = blobUrl;

    const fallback = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({ poster: buildVideoPlaceholderSvg(file.name, 1280, 720), ratio: 16 / 9 });
    };

    video.addEventListener('error', fallback, { once: true });
    video.addEventListener('loadedmetadata', () => {
      const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
      const targetTime = Number.isFinite(video.duration) && video.duration > 0.25 ? Math.min(0.25, video.duration / 2) : 0;
      const capture = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const poster = canvas.toDataURL('image/jpeg', 0.9);
          URL.revokeObjectURL(blobUrl);
          resolve({ poster, ratio });
        } catch {
          fallback();
        }
      };

      video.addEventListener('seeked', capture, { once: true });
      video.addEventListener('loadeddata', () => {
        try {
          video.currentTime = targetTime;
        } catch {
          capture();
        }
      }, { once: true });
    }, { once: true });
  });
}

function buildImagePlaceholderSvg(label, width, height, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${Math.max(30, Math.round(width / 18))}" fill="#ffffff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildVideoPlaceholderSvg(label, width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.round(width / 12)}" fill="#ffffff" opacity="0.92"/><polygon points="${width / 2 - 18},${height / 2 - 28} ${width / 2 - 18},${height / 2 + 28} ${width / 2 + 36},${height / 2}" fill="#0f172a"/><text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${Math.max(22, Math.round(width / 34))}" fill="#ffffff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildCustomVideoThumbnailSvg(label, width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#8ec5fc"/><stop offset="100%" stop-color="#e0c3fc"/></linearGradient><linearGradient id="card" x1="0" x2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#sky)"/><rect x="70" y="58" rx="34" ry="34" width="1060" height="560" fill="url(#card)"/><circle cx="600" cy="286" r="95" fill="#ffffff" opacity="0.96"/><polygon points="570,236 570,336 660,286" fill="#1d4ed8"/><rect x="130" y="470" width="360" height="26" rx="13" fill="#ffffff" opacity="0.92"/><rect x="130" y="515" width="280" height="20" rx="10" fill="#bfdbfe" opacity="0.92"/><text x="130" y="585" font-family="Arial" font-size="48" fill="#ffffff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeAttribute(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function exposeApi() {
  window.emailEditorApi = {
    loadSample,
    switchMode,
    generateEmailHtml,
    toggleSourceMode,
    selectFirstBlock: () => {
      const block = els.editorCanvas.querySelector('.media-block');
      if (block) selectBlock(block);
      return block;
    },
    getSelectedBlock: () => state.selectedBlock,
    applyAlignment,
    resizeSelectedFromInputs,
    insertImageBlock,
    insertVideoBlock,
    refreshOutputs,
    resolveMergeTags: resolveMergeTagsInString,
  };
}
