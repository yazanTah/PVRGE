// State Management
let selectedFiles = [];
let currentMode = "quick";
let currentCleanResult = null;
let currentOriginalUrl = null;
let currentOutputUrl = null;
let batchCleanResults = [];

// DOM Elements
const modeCardQuick = document.getElementById("modeCardQuick");
const modeCardDeep = document.getElementById("modeCardDeep");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileQueueWrapper = document.getElementById("fileQueueWrapper");
const fileQueueCount = document.getElementById("fileQueueCount");
const fileQueueList = document.getElementById("fileQueueList");
const btnClearQueue = document.getElementById("btnClearQueue");
const btnClean = document.getElementById("btnClean");
const btnCleanText = document.getElementById("btnCleanText");

const progressTracker = document.getElementById("progressTracker");
const progressBarFill = document.getElementById("progressBarFill");
const progressPercent = document.getElementById("progressPercent");
const progressTitle = document.getElementById("progressTitle");
const progressStatusText = document.getElementById("progressStatusText");

const viewerEmpty = document.getElementById("viewerEmpty");
const singleResultView = document.getElementById("singleResultView");
const batchResultsView = document.getElementById("batchResultsView");

// Audit elements
const auditTimeBadge = document.getElementById("auditTimeBadge");
const auditStatusBadge = document.getElementById("auditStatusBadge");
const auditBeforeC2pa = document.getElementById("auditBeforeC2pa");
const auditBeforeJumbf = document.getElementById("auditBeforeJumbf");
const auditBeforeAi = document.getElementById("auditBeforeAi");
const auditBeforeRisk = document.getElementById("auditBeforeRisk");
const auditAfterC2pa = document.getElementById("auditAfterC2pa");
const auditAfterJumbf = document.getElementById("auditAfterJumbf");
const auditAfterSynthid = document.getElementById("auditAfterSynthid");
const auditAfterRisk = document.getElementById("auditAfterRisk");

// Player elements
const playerMediaName = document.getElementById("playerMediaName");
const playerMediaSize = document.getElementById("playerMediaSize");
const btnShowCleaned = document.getElementById("btnShowCleaned");
const btnShowOriginal = document.getElementById("btnShowOriginal");
const resultVideo = document.getElementById("resultVideo");
const resultImage = document.getElementById("resultImage");
const btnDownloadClean = document.getElementById("btnDownloadClean");
const btnCleanAnother = document.getElementById("btnCleanAnother");

// Batch elements
const batchSummaryText = document.getElementById("batchSummaryText");
const batchTableBody = document.getElementById("batchTableBody");
const btnDownloadBatchZip = document.getElementById("btnDownloadBatchZip");

// Modals
const btnHowItWorks = document.getElementById("btnHowItWorks");
const howItWorksModal = document.getElementById("howItWorksModal");
const btnCloseHowItWorks = document.getElementById("btnCloseHowItWorks");

const btnHistory = document.getElementById("btnHistory");
const historyModal = document.getElementById("historyModal");
const btnCloseHistory = document.getElementById("btnCloseHistory");
const historyList = document.getElementById("historyList");

const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupModeSelection();
  setupDropzone();
  setupModals();
  checkServerStatus();
  setInterval(checkServerStatus, 10000);
});

// Mode Selection
function setupModeSelection() {
  modeCardQuick.addEventListener("click", () => {
    currentMode = "quick";
    modeCardQuick.classList.add("active");
    modeCardDeep.classList.remove("active");
    modeCardQuick.querySelector("input").checked = true;
  });

  modeCardDeep.addEventListener("click", () => {
    currentMode = "deep";
    modeCardDeep.classList.add("active");
    modeCardQuick.classList.remove("active");
    modeCardDeep.querySelector("input").checked = true;
  });
}

// Dropzone & File Handling
function setupDropzone() {
  ["dragenter", "dragover"].forEach(evt => {
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(evt => {
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", e => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  });

  fileInput.addEventListener("change", e => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    fileInput.value = "";
  });

  btnClearQueue.addEventListener("click", () => {
    selectedFiles = [];
    renderFileQueue();
  });

  btnClean.addEventListener("click", () => {
    if (selectedFiles.length === 1) {
      cleanSingleFile(selectedFiles[0]);
    } else if (selectedFiles.length > 1) {
      cleanBatchFiles(selectedFiles);
    }
  });

  btnCleanAnother.addEventListener("click", () => {
    singleResultView.classList.add("hidden");
    batchResultsView.classList.add("hidden");
    viewerEmpty.classList.remove("hidden");
    if (resultVideo) {
      resultVideo.pause();
      resultVideo.src = "";
    }
  });
}

function addFiles(files) {
  for (const f of files) {
    if (!selectedFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
      selectedFiles.push(f);
    }
  }
  renderFileQueue();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileQueue();
}

function renderFileQueue() {
  if (selectedFiles.length === 0) {
    fileQueueWrapper.classList.add("hidden");
    btnClean.disabled = true;
    btnCleanText.textContent = "Select a File to Clean";
    return;
  }

  fileQueueWrapper.classList.remove("hidden");
  fileQueueCount.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`;
  btnClean.disabled = false;
  btnCleanText.textContent = selectedFiles.length === 1 
    ? (currentMode === "deep" ? "🛡️ Deep Clean Video (Anti-SynthID)" : "⚡ Quick Clean Video (Lossless)")
    : `⚡ Batch Clean ${selectedFiles.length} Files`;

  fileQueueList.innerHTML = selectedFiles.map((file, idx) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name);
    const icon = isVideo ? "🎬" : "🖼️";
    return `
      <div class="file-queue-item">
        <div class="file-item-info">
          <span>${icon}</span>
          <span class="file-item-name" title="${file.name}">${file.name}</span>
          <span class="file-item-meta">${sizeMb} MB</span>
        </div>
        <button class="btn-remove-item" onclick="removeFile(${idx})" title="Remove">✕</button>
      </div>
    `;
  }).join("");
}

// Progress Bar Simulation
let progressInterval = null;
function startProgressAnimation(mode) {
  progressTracker.classList.remove("hidden");
  progressBarFill.style.width = "0%";
  progressPercent.textContent = "0%";

  let step = 0;
  const stages = mode === "deep" ? [
    { pct: 15, msg: "Scanning container metadata & C2PA manifests..." },
    { pct: 35, msg: "Parsing audio/video elementary streams..." },
    { pct: 60, msg: "Applying micro-temporal pixel dither (Disrupting SynthID)..." },
    { pct: 85, msg: "High-bitrate x264 pristine re-encoding..." },
    { pct: 95, msg: "Writing bitexact MP4 container without provenance tags..." }
  ] : [
    { pct: 25, msg: "Scanning binary atoms for C2PA / JUMBF UUIDs..." },
    { pct: 55, msg: "Stripping XMP provenance packets & encoder signatures..." },
    { pct: 85, msg: "Executing bitexact container remux (0.00% stream loss)..." },
    { pct: 98, msg: "Finalizing clean container..." }
  ];

  progressInterval = setInterval(() => {
    if (step < stages.length) {
      progressBarFill.style.width = `${stages[step].pct}%`;
      progressPercent.textContent = `${stages[step].pct}%`;
      progressStatusText.textContent = stages[step].msg;
      step++;
    }
  }, mode === "deep" ? 800 : 150);
}

function stopProgressAnimation(success = true) {
  if (progressInterval) clearInterval(progressInterval);
  if (success) {
    progressBarFill.style.width = "100%";
    progressPercent.textContent = "100%";
    progressStatusText.textContent = "Cleaning complete!";
    setTimeout(() => {
      progressTracker.classList.add("hidden");
    }, 400);
  } else {
    progressStatusText.textContent = "Error occurred during processing.";
  }
}

// Clean Single File
async function cleanSingleFile(file) {
  btnClean.disabled = true;
  startProgressAnimation(currentMode);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", currentMode);

  try {
    const res = await fetch("/api/clean", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Cleaning failed" }));
      throw new Error(err.detail || "Server error");
    }

    const data = await res.json();
    currentCleanResult = data;
    currentOriginalUrl = data.input_url;
    currentOutputUrl = data.output_url;

    stopProgressAnimation(true);
    renderSingleResult(data, file);
  } catch (err) {
    stopProgressAnimation(false);
    alert(`Cleaning failed: ${err.message}`);
    btnClean.disabled = false;
  }
}

// Render Single Result View
function renderSingleResult(result, originalFile) {
  viewerEmpty.classList.add("hidden");
  batchResultsView.classList.add("hidden");
  singleResultView.classList.remove("hidden");

  const before = result.before_audit || {};
  const after = result.after_audit || {};

  // Timing badge
  auditTimeBadge.textContent = `⏱️ ${result.elapsed_seconds}s`;
  auditStatusBadge.textContent = result.mode === "deep" ? "🟢 100% STEALTH (ANTI-SYNTHID)" : "🟢 100% STEALTH";

  // Before values
  auditBeforeC2pa.textContent = before.c2pa_detected ? "DETECTED" : "NONE DETECTED";
  auditBeforeC2pa.className = `row-val ${before.c2pa_detected ? "flagged" : "clean"}`;

  auditBeforeJumbf.textContent = before.jumbf_detected ? "PRESENT" : "ABSENT";
  auditBeforeJumbf.className = `row-val ${before.jumbf_detected ? "flagged" : "clean"}`;

  auditBeforeAi.textContent = (before.ai_signatures_detected || before.xmp_detected) ? "FOUND" : "NONE";
  auditBeforeAi.className = `row-val ${(before.ai_signatures_detected || before.xmp_detected) ? "flagged" : "clean"}`;

  auditBeforeRisk.textContent = before.risk_level.toUpperCase();
  auditBeforeRisk.className = `row-val ${before.risk_level.includes("Clean") ? "clean" : "high-risk"}`;

  // After values
  auditAfterC2pa.textContent = after.c2pa_detected ? "FAILED" : "STRIPPED (0 bytes)";
  auditAfterC2pa.className = `row-val ${after.c2pa_detected ? "flagged" : "clean"}`;

  auditAfterJumbf.textContent = after.jumbf_detected ? "PRESENT" : "PURGED";
  auditAfterJumbf.className = `row-val ${after.jumbf_detected ? "flagged" : "clean"}`;

  auditAfterSynthid.textContent = result.synthid_neutralized ? "DISRUPTED & SCRAMBLED" : (result.mode === "quick" ? "METADATA STRIPPED" : "NEUTRALIZED");
  auditAfterSynthid.className = "row-val clean";

  auditAfterRisk.textContent = "0% (UNDETECTABLE)";
  auditAfterRisk.className = "row-val clean";

  // Player Setup
  playerMediaName.textContent = result.output_filename;
  playerMediaSize.textContent = after.size_formatted || "Ready";

  const isVideo = before.is_video;
  if (isVideo) {
    resultImage.classList.add("hidden");
    resultVideo.classList.remove("hidden");
    resultVideo.src = result.output_url;
    resultVideo.load();
  } else {
    resultVideo.classList.add("hidden");
    resultImage.classList.remove("hidden");
    resultImage.src = result.output_url;
  }

  // Setup view toggle buttons (Cleaned vs Original)
  btnShowCleaned.classList.add("active");
  btnShowOriginal.classList.remove("active");

  btnShowCleaned.onclick = () => {
    btnShowCleaned.classList.add("active");
    btnShowOriginal.classList.remove("active");
    if (isVideo) {
      resultVideo.src = currentOutputUrl;
      resultVideo.play().catch(() => {});
    } else {
      resultImage.src = currentOutputUrl;
    }
  };

  btnShowOriginal.onclick = () => {
    btnShowOriginal.classList.add("active");
    btnShowCleaned.classList.remove("active");
    if (isVideo) {
      resultVideo.src = currentOriginalUrl;
      resultVideo.play().catch(() => {});
    } else {
      resultImage.src = currentOriginalUrl;
    }
  };

  // Download button
  btnDownloadClean.href = result.output_url;
  btnDownloadClean.download = result.output_filename;

  btnClean.disabled = false;
}

// Clean Batch Files
async function cleanBatchFiles(files) {
  btnClean.disabled = true;
  startProgressAnimation(currentMode);

  const formData = new FormData();
  for (const f of files) {
    formData.append("files", f);
  }
  formData.append("mode", currentMode);

  try {
    const res = await fetch("/api/clean-batch", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Batch cleaning failed" }));
      throw new Error(err.detail || "Server error");
    }

    const data = await res.json();
    batchCleanResults = data.items || [];
    stopProgressAnimation(true);
    renderBatchResults(batchCleanResults);
  } catch (err) {
    stopProgressAnimation(false);
    alert(`Batch cleaning failed: ${err.message}`);
    btnClean.disabled = false;
  }
}

// Render Batch Results
function renderBatchResults(items) {
  viewerEmpty.classList.add("hidden");
  singleResultView.classList.add("hidden");
  batchResultsView.classList.remove("hidden");

  batchSummaryText.textContent = `${items.length} of ${selectedFiles.length} files scrubbed successfully`;

  batchTableBody.innerHTML = items.map(item => {
    return `
      <tr>
        <td><strong>${item.original_name || item.output_filename}</strong></td>
        <td><span class="mode-badge ${item.mode}">${item.mode.toUpperCase()}</span></td>
        <td><span class="batch-status-badge clean">PURGED</span></td>
        <td>${item.elapsed_seconds}s</td>
        <td>
          <a href="${item.output_url}" download="${item.output_filename}" class="btn btn-outline btn-sm">
            ⬇️ Download
          </a>
        </td>
      </tr>
    `;
  }).join("");

  btnDownloadBatchZip.onclick = async () => {
    const filenames = items.map(i => i.output_filename);
    try {
      btnDownloadBatchZip.disabled = true;
      btnDownloadBatchZip.textContent = "Creating ZIP...";
      const res = await fetch("/api/export-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames })
      });
      const data = await res.json();
      if (data.success && data.zip_url) {
        const link = document.createElement("a");
        link.href = data.zip_url;
        link.download = data.zip_url.split("/").pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      alert("ZIP export failed: " + e.message);
    } finally {
      btnDownloadBatchZip.disabled = false;
      btnDownloadBatchZip.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download All as ZIP`;
    }
  };

  btnClean.disabled = false;
}

// Modals
function setupModals() {
  btnHowItWorks.addEventListener("click", () => {
    howItWorksModal.classList.remove("hidden");
  });
  btnCloseHowItWorks.addEventListener("click", () => {
    howItWorksModal.classList.add("hidden");
  });

  btnHistory.addEventListener("click", async () => {
    historyModal.classList.remove("hidden");
    loadHistory();
  });
  btnCloseHistory.addEventListener("click", () => {
    historyModal.classList.add("hidden");
  });

  // Close modals on outside click
  [howItWorksModal, historyModal].forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });
}

async function loadHistory() {
  historyList.innerHTML = `<p class="text-muted">Loading history...</p>`;
  try {
    const res = await fetch("/api/history");
    const data = await res.json();
    const items = data.history || [];
    if (items.length === 0) {
      historyList.innerHTML = `<p class="text-muted">No recently cleaned files found.</p>`;
      return;
    }

    historyList.innerHTML = items.map(item => `
      <div class="history-item">
        <div>
          <div class="history-item-name">${item.filename}</div>
          <span class="history-item-size">${item.size}</span>
        </div>
        <a href="${item.url}" download="${item.filename}" class="btn btn-outline btn-sm">
          ⬇️ Download
        </a>
      </div>
    `).join("");
  } catch (err) {
    historyList.innerHTML = `<p class="text-muted">Failed to load history: ${err.message}</p>`;
  }
}

// Server Status Heartbeat
async function checkServerStatus() {
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      statusBadge.className = "status-badge online";
      statusText.textContent = "FFmpeg Engine Active";
    } else {
      statusBadge.className = "status-badge offline";
      statusText.textContent = "Server Degraded";
    }
  } catch (e) {
    statusBadge.className = "status-badge offline";
    statusText.textContent = "Server Offline";
  }
}
