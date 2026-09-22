/* ==========================================================================
   SPECTRE // SYSTEM CONTROLLER & OSCILLATOR ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  let currentMode = 'quick';
  let currentNamingStyle = 'random';
  let activeCleanResult = null;
  let activeOriginalUrl = null;
  let activeOutputUrl = null;

  // DOM Elements
  const tabQuick = document.getElementById('tabQuick');
  const tabDeep = document.getElementById('tabDeep');
  const personaChips = document.getElementById('personaChips');
  const disguisePreview = document.getElementById('disguisePreview');
  const btnRerollName = document.getElementById('btnRerollName');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const progressBox = document.getElementById('progressBox');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercentText = document.getElementById('progressPercentText');

  const stageIdle = document.getElementById('stageIdle');
  const singleResultStage = document.getElementById('singleResultStage');
  const batchResultStage = document.getElementById('batchResultStage');

  const termC2pa = document.getElementById('termC2pa');
  const termJumbf = document.getElementById('termJumbf');
  const termSynthid = document.getElementById('termSynthid');
  const termSpoofName = document.getElementById('termSpoofName');
  const termTime = document.getElementById('termTime');

  const viewfinderName = document.getElementById('viewfinderName');
  const stageVideo = document.getElementById('stageVideo');
  const stageImage = document.getElementById('stageImage');
  const btnShowCleaned = document.getElementById('btnShowCleaned');
  const btnShowOriginal = document.getElementById('btnShowOriginal');
  const btnDownloadClean = document.getElementById('btnDownloadClean');
  const btnDownloadLabel = document.getElementById('btnDownloadLabel');
  const btnResetView = document.getElementById('btnResetView');

  const batchCountTag = document.getElementById('batchCountTag');
  const batchCardList = document.getElementById('batchCardList');
  const btnDownloadBatchZip = document.getElementById('btnDownloadBatchZip');

  const btnHowItWorks = document.getElementById('btnHowItWorks');
  const howItWorksModal = document.getElementById('howItWorksModal');
  const btnCloseHowItWorks = document.getElementById('btnCloseHowItWorks');

  const btnHistory = document.getElementById('btnHistory');
  const historyModal = document.getElementById('historyModal');
  const btnCloseHistory = document.getElementById('btnCloseHistory');
  const historyVaultList = document.getElementById('historyVaultList');

  // Live Oscilloscope Simulation
  const oscCanvas = document.getElementById('oscCanvas');
  if (oscCanvas) {
    const ctx = oscCanvas.getContext('2d');
    let phase = 0;
    function renderOsc() {
      ctx.fillStyle = '#040507';
      ctx.fillRect(0, 0, oscCanvas.width, oscCanvas.height);
      ctx.beginPath();
      ctx.strokeStyle = currentMode === 'deep' ? '#00ffaa' : '#00f0ff';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < oscCanvas.width; x++) {
        const freq = currentMode === 'deep' ? 0.08 : 0.04;
        const noise = Math.sin(x * freq + phase) * 7 + (Math.random() - 0.5) * 2;
        const y = oscCanvas.height / 2 + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      phase += currentMode === 'deep' ? 0.15 : 0.06;
      requestAnimationFrame(renderOsc);
    }
    renderOsc();
  }

  // Client-Side Disguise Preview Generator
  function generatePreviewName(style) {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = d.toTimeString().slice(0, 8).replace(/:/g, '');
    const rand4 = Math.floor(1000 + Math.random() * 9000);

    const pool = {
      iphone: `IMG_${rand4}.mp4`,
      android: `VID_${dateStr}_${timeStr}.mp4`,
      pixel: `PXL_${dateStr}_${timeStr}${Math.floor(100 + Math.random() * 900)}.mp4`,
      screen: `RPReplay_Final${Math.floor(Date.now() / 1000)}.mp4`,
      editor: `CapCut_${Math.floor(10000000 + Math.random() * 90000000)}.mp4`,
      weird: ['rec_raw_take2.mp4', 'final_edit_v1.mp4', 'clip_084.mp4', 'export_9x16_01.mp4', 'draft_cut_3.mp4'][Math.floor(Math.random() * 5)]
    };

    if (style === 'random' || !pool[style]) {
      const keys = Object.keys(pool);
      const chosen = keys[Math.floor(Math.random() * keys.length)];
      return pool[chosen];
    }
    return pool[style];
  }

  function updateDisguiseDisplay() {
    disguisePreview.textContent = generatePreviewName(currentNamingStyle);
  }
  updateDisguiseDisplay();

  // Persona Chip Click
  personaChips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    personaChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentNamingStyle = btn.dataset.style || 'random';
    updateDisguiseDisplay();
  });

  btnRerollName.addEventListener('click', updateDisguiseDisplay);

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

  // Dropzone & Drag
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

  // Reset Stage
  function resetStage() {
    singleResultStage.classList.add('hidden');
    batchResultStage.classList.add('hidden');
    stageIdle.classList.remove('hidden');
    stopProgress();
    if (stageVideo) {
      stageVideo.pause();
      stageVideo.src = '';
    }
  }

  btnResetView.addEventListener('click', resetStage);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') resetStage();
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
  let progressTimer = null;
  function startProgress(mode) {
    progressBox.classList.remove('hidden');
    progressBarFill.style.width = '0%';
    progressPercentText.textContent = '0%';

    const steps = mode === 'deep' ? [
      { p: 20, t: 'Scanning container binary atoms...' },
      { p: 45, t: 'Perturbing pixel lattice (Disrupting SynthID)...' },
      { p: 75, t: 'High-speed x264 CRF 21 re-encode (Render safe)...' },
      { p: 95, t: 'Writing camera spoof container...' }
    ] : [
      { p: 30, t: 'Scanning C2PA / JUMBF manifests...' },
      { p: 65, t: 'Executing bitexact container remux (0% loss)...' },
      { p: 95, t: 'Applying camera roll camouflage...' }
    ];

    let i = 0;
    progressTimer = setInterval(() => {
      if (i < steps.length) {
        progressBarFill.style.width = `${steps[i].p}%`;
        progressPercentText.textContent = `${steps[i].p}%`;
        progressStatusText.textContent = steps[i].t;
        i++;
      }
    }, mode === 'deep' ? 300 : 80);
  }

  function stopProgress(success = true) {
    if (progressTimer) clearInterval(progressTimer);
    if (success) {
      progressBarFill.style.width = '100%';
      progressPercentText.textContent = '100%';
      progressStatusText.textContent = 'Sterilization complete!';
      setTimeout(() => progressBox.classList.add('hidden'), 350);
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
    formData.append('naming', currentNamingStyle);

    try {
      const res = await fetch('/api/clean', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(err.detail || 'Sterilization failed');
      }

      const data = await res.json();
      activeCleanResult = data;
      activeOriginalUrl = data.input_url;
      activeOutputUrl = data.output_url;

      stopProgress(true);
      renderSingleResult(data, file);
    } catch (err) {
      stopProgress(false);
      alert(`Purge aborted: ${err.message}`);
    }
  }

  // Render Single Result View
  function renderSingleResult(result, originalFile) {
    stageIdle.classList.add('hidden');
    batchResultStage.classList.add('hidden');
    singleResultStage.classList.remove('hidden');

    const before = result.before_audit || {};
    const after = result.after_audit || {};

    termC2pa.textContent = after.c2pa_detected ? '0x000028A0 [DETECTED]' : '0x00000000 [PURGED / 0 BYTES]';
    termJumbf.textContent = after.jumbf_detected ? 'PRESENT' : 'STRIPPED // ZEROED';
    termSynthid.textContent = result.synthid_neutralized ? 'FREQUENCY DISPERSED (0% CORRELATION)' : 'METADATA STRIPPED';
    termSpoofName.textContent = result.output_filename;
    termTime.textContent = `${result.elapsed_seconds}s`;

    viewfinderName.textContent = result.output_filename;
    btnDownloadLabel.textContent = `DOWNLOAD AS ${result.output_filename.toUpperCase()}`;
    btnDownloadClean.href = result.output_url;
    btnDownloadClean.download = result.output_filename;

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

    // Toggle Viewfinder
    btnShowCleaned.classList.add('active');
    btnShowOriginal.classList.remove('active');

    btnShowCleaned.onclick = () => {
      btnShowCleaned.classList.add('active');
      btnShowOriginal.classList.remove('active');
      if (isVideo) {
        stageVideo.src = activeOutputUrl;
        stageVideo.play().catch(() => {});
      } else {
        stageImage.src = activeOutputUrl;
      }
    };

    btnShowOriginal.onclick = () => {
      btnShowOriginal.classList.add('active');
      btnShowCleaned.classList.remove('active');
      if (isVideo) {
        stageVideo.src = activeOriginalUrl;
        stageVideo.play().catch(() => {});
      } else {
        stageImage.src = activeOriginalUrl;
      }
    };
  }

  // Clean Batch
  async function cleanBatch(files) {
    startProgress(currentMode);

    const formData = new FormData();
    for (const f of files) formData.append('files', f);
    formData.append('mode', currentMode);
    formData.append('naming', currentNamingStyle);

    try {
      const res = await fetch('/api/clean-batch', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Batch error' }));
        throw new Error(err.detail || 'Batch sterilization failed');
      }

      const data = await res.json();
      stopProgress(true);
      renderBatchResult(data.items || []);
    } catch (err) {
      stopProgress(false);
      alert(`Batch aborted: ${err.message}`);
    }
  }

  function renderBatchResult(items) {
    stageIdle.classList.add('hidden');
    singleResultStage.classList.add('hidden');
    batchResultStage.classList.remove('hidden');

    batchCountTag.textContent = `${items.length} FILES STERILIZED`;

    batchCardList.innerHTML = items.map(item => `
      <div class="batch-item-card">
        <div class="batch-name-col">
          <span class="batch-spoof-name">${item.output_filename}</span>
          <span class="batch-orig-name">FROM: ${item.original_name || 'RAW INPUT'}</span>
        </div>
        <a href="${item.output_url}" download="${item.output_filename}" class="btn-batch-dl">
          ↓ DOWNLOAD (${item.elapsed_seconds}s)
        </a>
      </div>
    `).join('');

    btnDownloadBatchZip.onclick = async () => {
      const filenames = items.map(i => i.output_filename);
      try {
        btnDownloadBatchZip.disabled = true;
        btnDownloadBatchZip.innerHTML = `<span class="tactical-arrow">↓</span> COMPRESSING ZIP...`;
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
        btnDownloadBatchZip.innerHTML = `<span class="tactical-arrow">↓</span> DOWNLOAD ENTIRE BATCH AS ZIP`;
      }
    };
  }

  // Modals
  btnHowItWorks.addEventListener('click', () => howItWorksModal.classList.remove('hidden'));
  btnCloseHowItWorks.addEventListener('click', () => howItWorksModal.classList.add('hidden'));

  btnHistory.addEventListener('click', () => {
    historyModal.classList.remove('hidden');
    loadHistory();
  });
  btnCloseHistory.addEventListener('click', () => historyModal.classList.add('hidden'));

  [howItWorksModal, historyModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  async function loadHistory() {
    historyVaultList.innerHTML = `<p class="mono-dim">Querying storage logs...</p>`;
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      const list = data.history || [];
      if (list.length === 0) {
        historyVaultList.innerHTML = `<p class="mono-dim">No sterilized media logged.</p>`;
        return;
      }
      historyVaultList.innerHTML = list.map(item => `
        <div class="history-vault-row">
          <div>
            <div class="history-name">${item.filename}</div>
            <span class="mono-dim">${item.size}</span>
          </div>
          <a href="${item.url}" download="${item.filename}" class="history-dl">
            ↓ Download
          </a>
        </div>
      `).join('');
    } catch {
      historyVaultList.innerHTML = `<p class="mono-dim">Error loading logs.</p>`;
    }
  }
});
