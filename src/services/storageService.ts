import { SupportedLangCode } from '../i18n/languages';

export type NoteAnnotationColor = 'amber' | 'sky' | 'emerald';

export interface NoteAnnotation {
  id: string;
  lineNumber: number;
  anchorText: string;
  text: string;
  color: NoteAnnotationColor;
  createdAt: number;
}

export interface NoteSnapshot {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  sourceType: 'canvas' | 'scan' | 'md' | 'mdx' | 'txt';
  language: SupportedLangCode;
  updatedAt: number;
  tags: string[];
  archived?: boolean;
  pinned?: boolean;
  snapshots?: NoteSnapshot[];
  annotations?: NoteAnnotation[];
}

const STORAGE_KEY = 'ainotes_notes_v1';

export const STARTER_NOTES: NoteRecord[] = [
  {
    id: 'note-binary-search',
    title: 'Binary Search & Asymptotic Bounds',
    sourceType: 'md',
    language: 'en',
    updatedAt: Date.now() - 3600 * 1000 * 5,
    tags: ['Python', 'Algorithms'],
    content: `Binary Search & Asymptotic Bounds
*********************************

Problem Statement
=================
Given a sorted array of distinct integers, locate the target index in logarithmic time by halving the search interval on every comparison.

Iterative Python Implementation
-------------------------------
Notice how 3-space indentation automatically detects Python syntax:

   def binary_search(arr, target):
       low, high = 0, len(arr) - 1
       while low <= high:
           mid = (low + high) // 2
           if arr[mid] == target:
               return mid
           elif arr[mid] < target:
               low = mid + 1
           else:
               high = mid - 1
       return -1

Complexity Matrix
-----------------
| Metric | Bound | Notes |
| --- | --- | --- |
| Worst-case Time | O(log n) | Halves interval each step |
| Auxiliary Space | O(1) | Constant pointer storage |`,
  },
  {
    id: 'note-systems-rust-asm',
    title: 'Systems Lab: Rust Ownership & x86 Assembly',
    sourceType: 'mdx',
    language: 'en',
    updatedAt: Date.now() - 3600 * 1000 * 2,
    tags: ['Rust', 'COBOL/Assembly', 'SQL'],
    content: `Systems Lab: Rust Ownership & x86 Assembly
******************************************

Borrow Checker & Memory Safety
==============================
Rust enforces single-owner move semantics at compile time with zero garbage collection overhead.

   fn sum_slice(values: &[i64]) -> i64 {
       let mut total: i64 = 0;
       for v in values.iter() {
           total += *v;
       }
       total
   }

x86-64 Register Loop
--------------------
   SECTION .text
   MOV RAX, 0
   MOV RCX, 10
   JMP loop_start

Relational Telemetry Query (SQL)
--------------------------------
   SELECT student_id, language_tag, AVG(accuracy_score)
   FROM htr_submissions
   GROUP BY student_id, language_tag
   ORDER BY accuracy_score DESC;`,
  },
  {
    id: 'note-arabic-algo',
    title: 'خوارزمية ديكسترا لأقصر مسار',
    sourceType: 'txt',
    language: 'ar',
    updatedAt: Date.now() - 3600 * 1000,
    tags: ['TypeScript', 'Graphs'],
    content: `خوارزمية ديكسترا لأقصر مسار
***************************

فكرة الخوارزمية
===============
تحسب خوارزمية ديكسترا أقصر مسافة من عقدة البداية إلى بقية العقد في رسم بياني موزون بأوزان غير سالبة.

تنفيذ بلغة TypeScript
---------------------
   interface Edge {
     to: string;
     weight: number;
   }
   function relax(dist: Record<string, number>, u: string, edge: Edge): boolean {
     const candidate = dist[u] + edge.weight;
     if (candidate < dist[edge.to]) {
       dist[edge.to] = candidate;
       return true;
     }
     return false;
   }`,
  },
];

export function loadNotes(): NoteRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STARTER_NOTES));
      return STARTER_NOTES;
    }
    const parsed = JSON.parse(raw) as NoteRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : STARTER_NOTES;
  } catch {
    return STARTER_NOTES;
  }
}

export function saveNotes(notes: NoteRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Handle storage quota cleanly
  }
}

export function inferSourceType(filename: string): NoteRecord['sourceType'] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mdx')) return 'mdx';
  if (lower.endsWith('.md')) return 'md';
  return 'txt';
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read text file.'));
    reader.readAsText(file, 'utf-8');
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read binary file.'));
    reader.readAsDataURL(file);
  });
}

export async function urlToDataUrl(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: String(reader.result ?? ''), mimeType });
    reader.onerror = () => reject(new Error('Failed to read sample image.'));
    reader.readAsDataURL(blob);
  });
}
