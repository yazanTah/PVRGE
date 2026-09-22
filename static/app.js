/* ==========================================================================
   P V R G E // NEOCLASSICAL MEDIA CLEANSER CONTROLLER
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

  const progressBox = document.getElementById('progressBox');
  const progressBar = document.getElementById('progressBar');
  const progressMsg = document.getElementById('progressMsg');
  const progressPct = document.getElementById('progressPct');

  const outputSurface = document.getElementById('outputSurface');
  const batchSurface = document.getElementById('batchSurface');

  const verdictDot = document.getElementById('verdictDot');
  const verdictLabel = document.getElementById('verdictLabel');
  const verdictTime = document.getElementById('verdictTime');
  const btnReset = document.getElementById('btnReset');
  const btnResetBatch = document.getElementById('btnResetBatch');

  const auditC2pa = document.getElementById('auditC2pa');
  const auditAi = document.getElementById('auditAi');
  const auditSynthid = document.getElementById('auditSynthid');
  const actionsList = document.getElementById('actionsList');

  const stageName = document.getElementById('stageName');
  const btnShowClean = document.getElementById('btnShowClean');
  const btnShowOriginal = document.getElementById('btnShowOriginal');
  const resultVideo = document.getElementById('resultVideo');
  const resultImage = document.getElementById('resultImage');
  const btnDownload = document.getElementById('btnDownload');
  const btnDownloadText = document.getElementById('btnDownloadText');

  const batchCountLabel = document.getElementById('batchCountLabel');
  const batchList = document.getElementById('batchList');
  const btnBatchZip = document.getElementById('btnBatchZip');

  const btnSpec = document.getElementById('btnSpec');
  const specModal = document.getElementById('specModal');
  const btnCloseSpec = document.getElementById('btnCloseSpec');

  const btnHistory = document.getElementById('btnHistory');
  const historyModal = document.getElementById('historyModal');
  const btnCloseHistory = document.getElementById('btnCloseHistory');
  const historyList = document.getElementById('historyList');

  // Mode Tabs
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
    stopProgress();
    if (resultVideo) {
      resultVideo.pause();
      resultVideo.src = '';
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
    if (files.length > 0) processFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
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

  // Progress Bar
  let progressInterval = null;
  function startProgress(mode) {
    dropzone.classList.add('hidden');
    outputSurface.classList.add('hidden');
    batchSurface.classList.add('hidden');
    progressBox.classList.remove('hidden');

    progressBar.style.width = '0%';
    progressPct.textContent = '0%';

    const steps = mode === 'deep' ? [
      { p: 25, m: 'Inspecting C2PA manifest boxes...' },
      { p: 50, m: 'Dispersing SynthID frequency lattice...' },
      { p: 80, m: 'Re-encoding stream with CRF 21...' },
      { p: 95, m: 'Finalizing clean container...' }
    ] : [
      { p: 35, m: 'Scanning C2PA and JUMBF atoms...' },
      { p: 70, m: 'Executing bitexact stream remux...' },
      { p: 95, m: 'Writing clean container...' }
    ];

    let i = 0;
    progressInterval = setInterval(() => {
      if (i < steps.length) {
        progressBar.style.width = `${steps[i].p}%`;
        progressPct.textContent = `${steps[i].p}%`;
        progressMsg.textContent = steps[i].m;
        i++;
      }
    }, mode === 'deep' ? 250 : 70);
  }

  function stopProgress(success = true) {
    if (progressInterval) clearInterval(progressInterval);
    if (success) {
      progressBar.style.width = '100%';
      progressPct.textContent = '100%';
      progressMsg.textContent = 'Done!';
      setTimeout(() => progressBox.classList.add('hidden'), 300);
    } else {
      progressBox.classList.add('hidden');
    }
  }

  // Clean Single File
  async function cleanSingle(file) {
    startProgress(currentMode);

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
        throw new Error(err.detail || 'Processing failed');
      }

      const data = await res.json();
      activeCleanResult = data;
      activeOriginalUrl = data.input_url;
      activeOutputUrl = data.output_url;

      stopProgress(true);
      renderSingle(data, file);
    } catch (err) {
      stopProgress(false);
      alert(`Error: ${err.message}`);
      dropzone.classList.remove('hidden');
    }
  }

  // Render Single Result with Honest Before/After Verdict
  function renderSingle(result, originalFile) {
    outputSurface.classList.remove('hidden');

    const before = result.before_audit || {};
    const after = result.after_audit || {};
    const assessment = result.assessment || {};

    // 1. Before Verdict: Was it contaminated or clean?
    if (assessment.was_contaminated) {
      verdictDot.className = 'verdict-dot'; // red
      verdictLabel.className = 'verdict-label';
      verdictLabel.textContent = 'BEFORE: BAD (TRACKING DETECTED)';
    } else {
      verdictDot.className = 'verdict-dot good'; // green
      verdictLabel.className = 'verdict-label good';
      verdictLabel.textContent = 'BEFORE: GOOD (NO C2PA DETECTED)';
    }

    verdictTime.textContent = `Processed in ${result.elapsed_seconds}s`;

    // 2. Audit Table
    if (before.c2pa_detected) {
      auditC2pa.textContent = 'FLAGGED → STRIPPED (0 bytes)';
      auditC2pa.className = 'audit-status';
    } else {
      auditC2pa.textContent = 'NONE FOUND → SCRUBBED';
      auditC2pa.className = 'audit-status clean';
    }

    if (before.ai_signatures_detected || before.xmp_detected) {
      auditAi.textContent = 'FOUND → PURGED';
      auditAi.className = 'audit-status';
    } else {
      auditAi.textContent = 'NONE FOUND';
      auditAi.className = 'audit-status clean';
    }

    if (result.mode === 'deep') {
      auditSynthid.textContent = 'DISRUPTED (LATTER SCRAMBLED)';
      auditSynthid.className = 'audit-status good';
    } else {
      auditSynthid.textContent = 'CONTAINER SCRUBBED';
      auditSynthid.className = 'audit-status clean';
    }

    // 3. Actions Taken
    const actions = assessment.actions_taken || ['Container metadata stripped and bitexact remuxed'];
    actionsList.innerHTML = actions.map(act => `<li>${act}</li>`).join('');

    // 4. Media Stage & Clean Naming (VID_xxxx / IMG_xxxx)
    stageName.textContent = result.output_filename;

    const isVideo = result.is_video;
    if (isVideo) {
      resultImage.classList.add('hidden');
      resultVideo.classList.remove('hidden');
      resultVideo.src = result.output_url;
      resultVideo.load();
    } else {
      resultVideo.classList.add('hidden');
      resultImage.classList.remove('hidden');
      resultImage.src = result.output_url;
    }

    // View Toggles
    btnShowClean.classList.add('active');
    btnShowOriginal.classList.remove('active');

    btnShowClean.onclick = () => {
      btnShowClean.classList.add('active');
      btnShowOriginal.classList.remove('active');
      if (isVideo) {
        resultVideo.src = activeOutputUrl;
        resultVideo.play().catch(() => {});
      } else {
        resultImage.src = activeOutputUrl;
      }
    };

    btnShowOriginal.onclick = () => {
      btnShowOriginal.classList.add('active');
      btnShowClean.classList.remove('active');
      if (isVideo) {
        resultVideo.src = activeOriginalUrl;
        resultVideo.play().catch(() => {});
      } else {
        resultImage.src = activeOriginalUrl;
      }
    };

    // Download Button
    btnDownload.href = result.output_url;
    btnDownload.download = result.output_filename;
    btnDownloadText.textContent = `DOWNLOAD ${result.output_filename.toUpperCase()}`;
  }

  // Clean Batch
  async function cleanBatch(files) {
    startProgress(currentMode);

    const formData = new FormData();
    for (const f of files) formData.append('files', f);
    formData.append('mode', currentMode);

    try {
      const res = await fetch('/api/clean-batch', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Batch error' }));
        throw new Error(err.detail || 'Batch processing failed');
      }

      const data = await res.json();
      stopProgress(true);
      renderBatch(data.items || []);
    } catch (err) {
      stopProgress(false);
      alert(`Batch failed: ${err.message}`);
      dropzone.classList.remove('hidden');
    }
  }

  function renderBatch(items) {
    batchSurface.classList.remove('hidden');
    batchCountLabel.textContent = `${items.length} FILES CLEANED`;

    batchList.innerHTML = items.map(item => `
      <div class="batch-card">
        <span class="batch-filename">${item.output_filename}</span>
        <a href="${item.output_url}" download="${item.output_filename}" class="batch-dl">
          ↓ Download (${item.elapsed_seconds}s)
        </a>
      </div>
    `).join('');

    btnBatchZip.onclick = async () => {
      const filenames = items.map(i => i.output_filename);
      try {
        btnBatchZip.disabled = true;
        btnBatchZip.innerHTML = `<span class="btn-arrow">↓</span> BUNDLING ZIP...`;
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
        alert('ZIP failed: ' + e.message);
      } finally {
        btnBatchZip.disabled = false;
        btnBatchZip.innerHTML = `<span class="btn-arrow">↓</span> DOWNLOAD ALL AS ZIP`;
      }
    };
  }

  // Modals
  btnSpec.addEventListener('click', () => specModal.classList.remove('hidden'));
  btnCloseSpec.addEventListener('click', () => specModal.classList.add('hidden'));

  btnHistory.addEventListener('click', () => {
    historyModal.classList.remove('hidden');
    loadHistory();
  });
  btnCloseHistory.addEventListener('click', () => historyModal.classList.add('hidden'));

  [specModal, historyModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  async function loadHistory() {
    historyList.innerHTML = `<p class="dim-text">Loading history...</p>`;
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      const list = data.history || [];
      if (list.length === 0) {
        historyList.innerHTML = `<p class="dim-text">No recent cleaned files.</p>`;
        return;
      }
      historyList.innerHTML = list.map(item => `
        <div class="history-card">
          <div>
            <div class="history-card-name">${item.filename}</div>
            <span class="dim-text">${item.size}</span>
          </div>
          <a href="${item.url}" download="${item.filename}" class="batch-dl">
            ↓ Download
          </a>
        </div>
      `).join('');
    } catch {
      historyList.innerHTML = `<p class="dim-text">Failed to load history.</p>`;
    }
  }
});
