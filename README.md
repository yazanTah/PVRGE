# 🛡️ FlowPurger — C2PA & SynthID AI Video Purger

> Strip **C2PA provenance manifests**, purge **Google Veo metadata**, and neutralize **DeepMind SynthID watermarks** from AI videos and images — **100% locally**, with **$0 API fees**, and **zero subscription costs**.

---

## 🚨 The Problem with AI Video Platforms

When you generate videos using **Google Flow**, **Veo**, or other modern generative AI tools, the output contains two layers of tracking that platforms use to restrict, suppress, or label your content:

1. **C2PA Manifests (Container Level):**
   - Stored in MP4 container boxes (`uuid`, `JUMBF`, `jumb`, and `c2pa.manifest` atoms) and XMP metadata packets.
   - Social networks like **TikTok, Instagram, YouTube Shorts, and Facebook** read these binary bytes upon upload and automatically attach forced **"AI-generated"** badges, reducing organic algorithmic reach.
2. **Google DeepMind SynthID (Pixel Level):**
   - An invisible mathematical watermark embedded directly into pixel color frequencies across frames.
   - Survives basic re-encoding if the frequency lattice is left undisturbed.

---

## ⚡ How FlowPurger Solves Both

FlowPurger provides two specialized cleaning modes tailored for every use case:

| Feature | ⚡ Quick Clean (Lossless) | 🛡️ Deep Clean (Anti-SynthID) |
| :--- | :--- | :--- |
| **Primary Target** | C2PA, JUMBF, XMP, Google container tags | C2PA + SynthID pixel watermark |
| **Speed** | **Instant (~0.08s)** | **Fast (~2–5s)** |
| **Video Quality Loss** | **0.00% (Bitexact stream copy)** | **Imperceptible (High-bitrate CRF 18)** |
| **Stream Re-encoding** | No (Copy video & audio streams) | Yes (Micro-temporal dither + x264) |
| **Platform C2PA Flags** | **100% Cleared** | **100% Cleared** |
| **SynthID Disruption** | Metadata only | **Lattice Scrambled / Neutralized** |
| **Recommended For** | General posting, high-volume exports | Maximum stealth, sensitive publishing |

---

## 🚀 Key Features

- **Drag & Drop Workflow:** Clean a single video or drop dozens of files for simultaneous batch processing.
- **Forensic Metadata Audit:** Inspect files before and after cleaning to verify that C2PA manifests, JUMBF boxes, and AI signatures are completely purged.
- **Side-by-Side Preview Player:** Compare the cleaned video directly against the original inside the browser.
- **Batch ZIP Export:** 1-click download of all scrubbed files bundled in a single ZIP archive.
- **Format Support:** Supports MP4, MOV, WebM, MKV, PNG, JPG, and WebP.
- **100% Local & Private:** No third-party clouds, no API keys, and no data leaving your machine. Powered by local FFmpeg.

---

## 🛠️ Quick Start

### 1. Launch with 1-Click (Windows)
Double-click **`start.bat`**. It will automatically verify dependencies, open the web app in your default browser, and start the local engine.

### 2. Manual Installation

```bash
# 1. Clone repository
git clone https://github.com/yazanTah/flow-image-translator.git
cd flow-image-translator

# 2. Install dependencies
pip install -r requirements.txt

# 3. Ensure FFmpeg is available in your PATH
ffmpeg -version

# 4. Start the server
python main.py
```

Open your browser at:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🌐 Deploy Free on Render (Cloud Web App)

You can host FlowPurger online 24/7 on **Render.com** (Free tier supported):

### Method 1: Connect GitHub Repo (Recommended)
1. Go to [render.com](https://render.com) and log in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `yazanTah/flow-image-translator`.
4. Render will automatically detect the **`Dockerfile`**.
5. Select the **Free** instance type and click **Deploy Web Service**.
6. Render builds the container with FFmpeg and provides an instant live URL: `https://your-app.onrender.com`.

### Method 2: Render Blueprint (1-Click)
1. In Render, click **New +** → **Blueprint**.
2. Select your repository. It will automatically load [`render.yaml`](render.yaml) and configure everything.
3. Click **Apply**.

---

## 💻 CLI Usage (Command Line)

You can also use the cleaner engine directly from the command line without opening the web interface:

```bash
# Quick Lossless C2PA strip
python -c "from cleaner import clean_file; print(clean_file('input.mp4', mode='quick'))"

# Deep Anti-SynthID clean
python -c "from cleaner import clean_file; print(clean_file('input.mp4', mode='deep'))"

# Inspect metadata & detect C2PA
python -c "from cleaner import inspect_file; print(inspect_file('input.mp4'))"
```

---

## 🏗️ Architecture

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) with asynchronous file streaming and Pydantic validation.
- **Engine:** [FFmpeg](https://ffmpeg.org/) (bitexact container demuxer & micro-temporal dither lattice perturbation filter).
- **Image Processing:** [Pillow](https://python-pillow.org/) for atomic metadata chunk stripping.
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (zero heavy node_modules build steps, instant load times).

---

## 📄 License
MIT License. Free for personal and commercial use.
