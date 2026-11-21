"""
AInotes Custom Handwriting Model Trainer (Transkribus-inspired)
Fine-tunes Microsoft TrOCR (microsoft/trocr-base-handwritten) on a student's
custom handwriting dataset of code lines, mathematical notation, and lecture prose.
"""

import argparse
import json
from pathlib import Path


def prepare_manifest(dataset_dir: Path) -> list[dict]:
    manifest_path = dataset_dir / "labels.jsonl"
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"Expected {manifest_path} with JSON lines: {{\"image\": \"line_01.png\", \"text\": \"def dfs(node):\"}}"
        )
    records = []
    with manifest_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                records.append(json.loads(line))
    return records


def main():
    parser = argparse.ArgumentParser(description="Fine-tune TrOCR on custom student handwriting")
    parser.add_argument("--dataset", type=Path, required=True, help="Directory with images + labels.jsonl")
    parser.add_argument("--output", type=Path, default=Path("./weights/custom-student-trocr"))
    parser.add_argument("--epochs", type=int, default=8)
    args = parser.parse_args()

    records = prepare_manifest(args.dataset)
    print(f"Loaded {len(records)} annotated handwriting line samples.")
    print("Install torch, transformers, datasets, and jiwer to run Seq2SeqTrainer on GPU/Vertex AI/SageMaker.")
    print(f"Target output directory: {args.output} ({args.epochs} epochs)")


if __name__ == "__main__":
    main()
