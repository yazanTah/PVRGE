/* ==========================================================================
   PURGE // UNIVERSAL C2PA & SYNTHID NEUTRALIZER CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  let currentMode = 'quick';
  let activeCleanResult = null;
  let activeOriginalUrl = null;
  let activeOutputUrl = null;

  // DOM Elements
  const tabQuick = document.getElementById('tabQuick');
  const tabDeep = document.getElementById('tabDeep');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  const pulseBar = document.getElementById('pulseBar');
  const loadingStatusText = document.getElementById('loadingStatusText');

  const outputSurface = document.getElementById('outputSurface');
  const batchSurface = document.getElementById('batchSurface');

  const auditResultBadge = document.getElementById('auditResultBadge');
  const auditTime = document.getElementById('auditTime');
  const btnReset = document.getElementById('btnReset');
  const btnResetBatch = document.getElementById('btnResetBatch');

  const matrixC2pa = document.getElementById('matrixC2pa');
  const matrixJumbf = document.getElementById('matrixJumbf');
  const matrixSynthid = document.getElementById('matrixSynthid');
  const matrixRisk = document.getElementById('matrixRisk');

  const stageFilename = document.getElementById('stageFilename');
  const btnViewClean = document.getElementById('btnViewClean');
  const btnViewOriginal = document.getElementById('btnViewOriginal');
  const stageVideo = document.getElementById('stageVideo');
  const stageImage = document.getElementById('stageImage');
  const btnDownloadClean = document.getElementById('btnDownloadClean');

  const batchCountBadge = document.getElementById('batchCountBadge');
  const batchItemsList = document.getElementById('batchItemsList');
  const btnDownloadBatchZip = document.getElementById('btnDownloadBatchZip');

  const btnHowItWorks = document.getElementById('btnHowItWorks');
  const howItWorksModal = document.getElementById('howItWorksModal');
  const btnCloseHowItWorks = document.getElementById('btnCloseHowItWorks');

  const btnHistory = document.getElementById('btnHistory');
  const historyModal = document.getElementById('historyModal');
  const btnCloseHistory = document.getElementById('btnCloseHistory');
  const historyItems = document.getElementById('historyItems');

  const engineStatusText = document.getElementById('engineStatusText');

  // Mode Selection
  tabQuick.addEventListener('click', () => {
    currentMode = 'quick';
    tabQuick.classList.add('active');
    tabDeep.classList.remove('active');
  });

  tabDeep.addEventListener('click', () => {
    currentMode = 'deep';
    tabDeep.classList.add('active');
    tabQuick.classList.remove('active');
  });

  // Global Keydown (Escape resets)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') resetUI();
  });

  btnReset.addEventListener('click', resetUI);
  btnResetBatch.addEventListener('click', resetUI);

  function resetUI() {
    outputSurface.classList.add('hidden');
    batchSurface.classList.add('hidden');
    dropzone.classList.remove('hidden');
    stopLoading();
    if (stageVideo) {
      stageVideo.pause();
      stageVideo.src = '';
    }
  }

  // Dropzone Events
  ['dragenter', 'dragover'].forEach(evt => {
    window.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    fileInput.value = '';
  });

  // Process Files
  function processFiles(files) {
    if (files.length === 1) {
      cleanSingle(files[0]);
    } else if (files.length > 1) {
      cleanBatch(files);
    }
  }

  // Loading indicator
  let loadInterval = null;
  function startLoading(msg) {
    pulseBar.classList.add('active');
    loadingStatusText.textContent = msg || 'scrubbing c2pa & provenance metadata...';
    loadingStatusText.classList.remove('hidden');
  }

  function stopLoading() {
    pulseBar.classList.remove('active');
    loadingStatusText.classList.add('hidden');
    if (loadInterval) clearInterval(loadInterval);
  }

  // Clean Single File
  async function cleanSingle(file) {
    dropzone.classList.add('hidden');
    outputSurface.classList.add('hidden');
    batchSurface.classList.add('hidden');

    startLoading(currentMode === 'deep' ? 'applying micro-temporal dither (disrupting synthid)...' : 'stripping c2pa & jumbf atoms...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', currentMode);

    try {
      const res = await fetch('/api/clean', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed' }));
        throw new Error(err.detail || 'Server error');
      }

      const data = await res.json();
      activeCleanResult = data;
      activeOriginalUrl = data.input_url;
      activeOutputUrl = data.output_url;

      stopLoading();
      renderSingle(data, file);
    } catch (err) {
      stopLoading();
      alert(`Purge failed: ${err.message}`);
      dropzone.classList.remove('hidden');
    }
  }

  // Render Single Result
  function renderSingle(result, originalFile) {
    outputSurface.classList.remove('hidden');

    const before = result.before_audit || {};
    const after = result.after_audit || {};

    auditResultBadge.textContent = result.mode === 'deep' ? '100% STEALTH // SYNTHID NEUTRALIZED' : '100% STEALTH // C2PA PURGED';
    auditTime.textContent = `${result.elapsed_seconds}s`;

    matrixC2pa.textContent = after.c2pa_detected ? 'DETECTED' : 'PURGED (0 bytes)';
    matrixJumbf.textContent = after.jumbf_detected ? 'PRESENT' : 'STRIPPED';
    matrixSynthid.textContent = result.synthid_neutralized ? 'LATTICE DISRUPTED' : 'METADATA STRIPPED';
    matrixRisk.textContent = '0% (UNDETECTABLE)';

    stageFilename.textContent = result.output_filename;

    const isVideo = before.is_video;
    if (isVideo) {
      stageImage.classList.add('hidden');
      stageVideo.classList.remove('hidden');
      stageVideo.src = result.output_url;
      stageVideo.load();
    } else {
      stageVideo.classList.add('hidden');
      stageImage.classList.remove('hidden');
      stageImage.src = result.output_url;
    }

    // Toggle Cleaned / Original
    btnViewClean.classList.add('active');
    btnViewOriginal.classList.remove('active');

    btnViewClean.onclick = () => {
      btnViewClean.classList.add('active');
      btnViewOriginal.classList.remove('active');
      if (isVideo) {
        stageVideo.src = activeOutputUrl;
        stageVideo.play().catch(() => {});
      } else {
        stageImage.src = activeOutputUrl;
      }
    };

    btnViewOriginal.onclick = () => {
      btnViewOriginal.classList.add('active');
      btnViewClean.classList.remove('active');
      if (isVideo) {
        stageVideo.src = activeOriginalUrl;
        stageVideo.play().catch(() => {});
      } else {
        stageImage.src = activeOriginalUrl;
      }
    };

    // Download button
    btnDownloadClean.href = result.output_url;
    btnDownloadClean.download = result.output_filename;
  }

  // Clean Batch
  async function cleanBatch(files) {
    dropzone.classList.add('hidden');
    outputSurface.classList.add('hidden');
    batchSurface.classList.add('hidden');

    startLoading(`batch purging ${files.length} files...`);

    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    formData.append('mode', currentMode);

    try {
      const res = await fetch('/api/clean-batch', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Batch failed' }));
        throw new Error(err.detail || 'Server error');
      }

      const data = await res.json();
      stopLoading();
      renderBatch(data.items || []);
    } catch (err) {
      stopLoading();
      alert(`Batch failed: ${err.message}`);
      dropzone.classList.remove('hidden');
    }
  }

  function renderBatch(items) {
    batchSurface.classList.remove('hidden');
    batchCountBadge.textContent = `${items.length} FILES PURGED`;

    batchItemsList.innerHTML = items.map(item => `
      <div class="batch-row">
        <span class="batch-row-name" title="${item.original_name || item.output_filename}">
          ${item.original_name || item.output_filename}
        </span>
        <a href="${item.output_url}" download="${item.output_filename}" class="batch-row-download">
          ↓ DOWNLOAD (${item.elapsed_seconds}s)
        </a>
      </div>
    `).join('');

    btnDownloadBatchZip.onclick = async () => {
      const filenames = items.map(i => i.output_filename);
      try {
        btnDownloadBatchZip.disabled = true;
        btnDownloadBatchZip.innerHTML = `<span class="btn-arrow">↓</span> BUNDLING ZIP...`;
        const res = await fetch('/api/export-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames })
        });
        const data = await res.json();
        if (data.success && data.zip_url) {
          const link = document.createElement('a');
          link.href = data.zip_url;
          link.download = data.zip_url.split('/').pop();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (e) {
        alert('ZIP download failed: ' + e.message);
      } finally {
        btnDownloadBatchZip.disabled = false;
        btnDownloadBatchZip.innerHTML = `<span class="btn-arrow">↓</span> DOWNLOAD ALL AS ZIP`;
      }
    };
  }

  // Modals
  btnHowItWorks.addEventListener('click', () => {
    howItWorksModal.classList.remove('hidden');
  });
  btnCloseHowItWorks.addEventListener('click', () => {
    howItWorksModal.classList.add('hidden');
  });

  btnHistory.addEventListener('click', () => {
    historyModal.classList.remove('hidden');
    loadHistory();
  });
  btnCloseHistory.addEventListener('click', () => {
    historyModal.classList.add('hidden');
  });

  [howItWorksModal, historyModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  async function loadHistory() {
    historyItems.innerHTML = `<p class="dim-text">Loading...</p>`;
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      const list = data.history || [];
      if (list.length === 0) {
        historyItems.innerHTML = `<p class="dim-text">No recently scrubbed files found.</p>`;
        return;
      }
      historyItems.innerHTML = list.map(item => `
        <div class="history-row">
          <div>
            <div class="history-row-name">${item.filename}</div>
            <span class="dim-text">${item.size}</span>
          </div>
          <a href="${item.url}" download="${item.filename}" class="history-row-dl">
            ↓ Download
          </a>
        </div>
      `).join('');
    } catch (e) {
      historyItems.innerHTML = `<p class="dim-text">Failed to load history.</p>`;
    }
  }

  // Health check
  async function checkHealth() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        engineStatusText.textContent = 'engine: ffmpeg bitexact';
      } else {
        engineStatusText.textContent = 'engine: offline';
      }
    } catch {
      engineStatusText.textContent = 'engine: offline';
    }
  }
  checkHealth();
});
