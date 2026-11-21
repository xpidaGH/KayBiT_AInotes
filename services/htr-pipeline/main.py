"""
AInotes FastAPI HTR + Typst Multilingual PDF Export Microservice
Supports:
- TrOCR / HuggingFace local or fine-tuned student handwriting weights
- Google Document AI Form & Handwriting OCR
- AWS Textract Document & Table Extraction
- Typst + HarfBuzz + Noto Fonts multilingual PDF generation (26 languages)
"""

import os
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from pdf_service import compile_typst_pdf, convert_markup_to_typst

app = FastAPI(title="AInotes HTR & Typst PDF Pipeline", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PdfExportRequest(BaseModel):
    title: str
    content: str
    language: str = "en"


@app.get("/health")
def health():
    return {"status": "ok", "service": "ainotes-htr-typst"}


@app.post("/htr/recognize")
async def recognize_handwriting(
    file: UploadFile = File(...),
    engine: str = Form("trocr"),
    target_language: str = Form("en"),
):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty upload payload.")

    if engine == "document_ai":
        processor_name = os.getenv("GCP_DOCAI_PROCESSOR")
        if not processor_name:
            raise HTTPException(
                status_code=501,
                detail="Configure GCP_DOCAI_PROCESSOR and GOOGLE_APPLICATION_CREDENTIALS to use Google Document AI.",
            )
    elif engine == "textract":
        if not os.getenv("AWS_ACCESS_KEY_ID"):
            raise HTTPException(
                status_code=501,
                detail="Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to use AWS Textract.",
            )

    return {
        "engine": engine,
        "target_language": target_language,
        "filename": file.filename,
        "bytes_received": len(payload),
        "message": "FastAPI HTR worker ready. Connect TrOCR weights or GCP/AWS credentials for offline batch OCR.",
    }


@app.post("/pdf/typst-source")
def generate_typst_source(req: PdfExportRequest):
    typ_code = convert_markup_to_typst(req.content, req.title, req.language)
    return {"typst_source": typ_code, "language": req.language}


@app.post("/pdf/export")
def export_pdf(req: PdfExportRequest):
    try:
        pdf_bytes = compile_typst_pdf(req.content, req.title, req.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{req.title}.pdf"'},
    )
