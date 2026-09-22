import os
import sys
import shutil
import zipfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from pydantic import BaseModel
from cleaner import inspect_file, clean_file

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
STATIC_DIR = BASE_DIR / "static"

UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)

class ExportZipRequest(BaseModel):
    filenames: List[str]

app = FastAPI(
    title="C2PA & SynthID Video Purger",
    description="Remove C2PA manifests, Google provenance tags, and neutralize SynthID watermarks from AI videos",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")

@app.get("/api/health")
@app.get("/api/status")
async def health_check():
    return {"status": "ready", "service": "C2PA & SynthID Purger", "engine": "FFmpeg"}

@app.post("/api/inspect")
async def inspect_media(file: UploadFile = File(...)):
    """Upload and inspect a file to detect C2PA, JUMBF, XMP, and AI tags without modifying it."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    temp_path = UPLOADS_DIR / f"inspect_{os.urandom(4).hex()}_{file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        report = inspect_file(str(temp_path))
        return JSONResponse(content={"success": True, "report": report})
    finally:
        if temp_path.exists():
            temp_path.unlink()

@app.post("/api/clean")
async def clean_media(
    file: UploadFile = File(...),
    mode: str = Form("quick")
):
    """
    Cleans an uploaded video or image file.
    Modes:
      - 'quick': Lossless C2PA & container metadata wipe (~0.04s, 0% quality loss).
      - 'deep': C2PA wipe + SynthID frequency disruptor (~1s, cloud-safe, destroys watermark).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file.")

    ext = Path(file.filename).suffix or ".mp4"
    safe_input_name = f"in_{os.urandom(4).hex()}_{Path(file.filename).stem[:25]}{ext}"
    input_path = UPLOADS_DIR / safe_input_name

    with open(input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = clean_file(
            input_path=str(input_path),
            output_dir=str(OUTPUTS_DIR),
            mode=mode
        )

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Cleaning failed"))

        result["input_url"] = f"/uploads/{safe_input_name}"
        result["output_url"] = f"/outputs/{result['output_filename']}"
        return JSONResponse(content=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/api/clean-batch")
async def clean_batch(
    files: List[UploadFile] = File(...),
    mode: str = Form("quick")
):
    """Batch clean multiple videos/images in one request with clean VID_xxxx / IMG_xxxx naming."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    results = []
    for f in files:
        if not f.filename:
            continue
        ext = Path(f.filename).suffix or ".mp4"
        safe_name = f"batch_{os.urandom(4).hex()}_{Path(f.filename).stem[:25]}{ext}"
        in_path = UPLOADS_DIR / safe_name

        with open(in_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)

        res = clean_file(str(in_path), output_dir=str(OUTPUTS_DIR), mode=mode)
        if res.get("success"):
            res["original_name"] = f.filename
            res["output_url"] = f"/outputs/{res['output_filename']}"
            results.append(res)

    return JSONResponse(content={"success": True, "count": len(results), "items": results})

@app.post("/api/export-zip")
async def export_zip(req: ExportZipRequest):
    """Bundles specified cleaned files into a downloadable ZIP archive."""
    if not req.filenames:
        raise HTTPException(status_code=400, detail="No files specified.")

    zip_filename = f"stealth_media_{os.urandom(4).hex()}.zip"
    zip_path = OUTPUTS_DIR / zip_filename

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for fname in req.filenames:
            file_p = OUTPUTS_DIR / Path(fname).name
            if file_p.exists():
                zipf.write(file_p, arcname=file_p.name)

    return JSONResponse(content={"success": True, "zip_url": f"/outputs/{zip_filename}"})

@app.get("/api/history")
async def get_history():
    """Lists recent cleaned files."""
    files = [f for f in OUTPUTS_DIR.glob("*.*") if not f.name.endswith(".zip") and not f.name.startswith(".")]
    files.sort(key=os.path.getmtime, reverse=True)
    items = []
    for f in files[:30]:
        items.append({
            "filename": f.name,
            "url": f"/outputs/{f.name}",
            "size": f"{f.stat().st_size / (1024 * 1024):.2f} MB",
            "created_at": f.stat().st_mtime
        })
    return {"history": items}

def cleanup_old_files(max_age_seconds: int = 3600):
    """Deletes uploaded and processed files older than max_age_seconds to prevent disk bloat."""
    import time
    now = time.time()
    for folder in [UPLOADS_DIR, OUTPUTS_DIR]:
        for p in folder.glob("*"):
            if p.is_file() and (now - p.stat().st_mtime) > max_age_seconds:
                try:
                    p.unlink()
                except Exception:
                    pass

@app.on_event("startup")
async def startup_event():
    cleanup_old_files()
    async def periodic_cleanup():
        import asyncio
        while True:
            await asyncio.sleep(1800)  # Run every 30 minutes
            cleanup_old_files()
    import asyncio
    asyncio.create_task(periodic_cleanup())

app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting C2PA & SynthID Purger on port {port} ...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

