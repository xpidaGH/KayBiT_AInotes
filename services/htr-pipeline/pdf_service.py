"""
Typst Multilingual PDF Export Service
Supports all 26 AInotes international languages (including RTL Arabic, Urdu, Farsi,
Shahmukhi Punjabi, Indic Devanagari/Bengali/Tamil/Telugu, Ethiopic, and CJK)
plus syntax-fenced 20-programming-language code blocks.
"""

import os
import re
import shutil
import subprocess
import tempfile
from typing import Dict

RTL_LANGUAGES = {"ar", "ur", "fa", "pa-PK"}

FONT_MAP: Dict[str, str] = {
    "ar": "Noto Naskh Arabic",
    "ur": "Noto Naskh Arabic",
    "fa": "Noto Naskh Arabic",
    "pa-PK": "Noto Naskh Arabic",
    "am": "Noto Sans Ethiopic",
    "hi": "Noto Sans Devanagari",
    "mr": "Noto Sans Devanagari",
    "bn": "Noto Sans Bengali",
    "ta": "Noto Sans Tamil",
    "te": "Noto Sans Telugu",
    "zh": "Noto Sans CJK SC",
    "ja": "Noto Sans CJK JP",
    "ko": "Noto Sans CJK KR",
}


def escape_typst_text(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("#", "\\#")
        .replace("$", "\\$")
        .replace("*", "\\*")
        .replace("_", "\\_")
        .replace("<", "\\<")
        .replace(">", "\\>")
        .replace("@", "\\@")
    )


def convert_markup_to_typst(raw: str, title: str, language: str) -> str:
    is_rtl = language in RTL_LANGUAGES
    primary_font = FONT_MAP.get(language, "Noto Sans")
    text_dir = "rtl" if is_rtl else "ltr"

    lines = raw.replace("\r\n", "\n").split("\n")
    typst_blocks = [
        f'#set page(paper: "a4", margin: (x: 20mm, y: 22mm), numbering: "1")',
        f'#set text(font: ("{primary_font}", "Noto Sans"), size: 10.5pt, dir: {text_dir}, lang: "{language.split("-")[0]}")',
        '#show raw.where(block: true): it => block(fill: rgb("#0F172A"), text(fill: rgb("#F8FAFC"), font: "JetBrains Mono", size: 8.8pt, it), inset: 10pt, radius: 5pt, width: 100%)',
        f'= {escape_typst_text(title)}',
        f'#text(size: 8.5pt, fill: rgb("#64748B"))[AInotes Multilingual Export · Language: {language}]',
        '#line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))',
        "",
    ]

    i = 0
    while i < len(lines):
        curr = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ""

        if curr.strip() and re.match(r"^\*{3,}$", nxt.strip()):
            typst_blocks.append(f"\n= {escape_typst_text(curr.strip())}\n")
            i += 2
            continue
        if curr.strip() and re.match(r"^={3,}$", nxt.strip()):
            typst_blocks.append(f"\n== {escape_typst_text(curr.strip())}\n")
            i += 2
            continue
        if curr.strip() and re.match(r"^-{3,}$", nxt.strip()):
            typst_blocks.append(f"\n=== {escape_typst_text(curr.strip())}\n")
            i += 2
            continue

        if curr.startswith("```"):
            lang_tag = curr[3:].strip() or "text"
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            typst_blocks.append(f"```{lang_tag}\n" + "\n".join(code_lines) + "\n```")
            continue

        if re.match(r"^ {3}\S", curr):
            code_lines = []
            while i < len(lines) and (lines[i].startswith("   ") or lines[i].strip() == ""):
                code_lines.append(lines[i][3:] if lines[i].startswith("   ") else "")
                i += 1
            typst_blocks.append("```\n" + "\n".join(code_lines).rstrip() + "\n```")
            continue

        if curr.startswith("# "):
            typst_blocks.append(f"\n= {escape_typst_text(curr[2:].strip())}")
        elif curr.startswith("## "):
            typst_blocks.append(f"\n== {escape_typst_text(curr[3:].strip())}")
        elif curr.startswith("### "):
            typst_blocks.append(f"\n=== {escape_typst_text(curr[4:].strip())}")
        elif curr.strip().startswith("- ") or curr.strip().startswith("* "):
            typst_blocks.append(f"- {escape_typst_text(curr.strip()[2:])}")
        else:
            typst_blocks.append(escape_typst_text(curr))
        i += 1

    return "\n".join(typst_blocks)


def compile_typst_pdf(raw_content: str, title: str, language: str = "en") -> bytes:
    typst_bin = shutil.which("typst")
    if not typst_bin:
        raise RuntimeError("Typst binary not found in PATH. Install Typst or run via Docker.")

    typst_source = convert_markup_to_typst(raw_content, title, language)
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, "document.typ")
        out_path = os.path.join(tmpdir, "document.pdf")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(typst_source)

        result = subprocess.run(
            [typst_bin, "compile", src_path, out_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Typst compilation failed: {result.stderr}")

        with open(out_path, "rb") as pdf_file:
            return pdf_file.read()
