import { parseToAst } from '../parsers/setextCustomParser';

export type FlashcardCategory =
  | 'Definition'
  | 'Concept'
  | 'Complexity'
  | 'Code'
  | 'Terminology';

export interface StudyFlashcard {
  id: string;
  term: string;
  definition: string;
  category: FlashcardCategory;
  source?: 'extracted' | 'ai';
}

const CS_KEY_TERMS: Array<{ pattern: RegExp; term: string; category: FlashcardCategory }> = [
  { pattern: /\bbinary search\b/i, term: 'Binary Search', category: 'Terminology' },
  { pattern: /\basymptotic bounds?\b|\bbig-?o\b/i, term: 'Asymptotic Bounds (Big-O)', category: 'Complexity' },
  { pattern: /\blogarithmic time\b|\bO\(log\s*n\)/i, term: 'Logarithmic Time · O(log n)', category: 'Complexity' },
  { pattern: /\blinearithmic\b|\bO\(n\s*log\s*n\)/i, term: 'Linearithmic Time · O(n log n)', category: 'Complexity' },
  { pattern: /\bauxiliary space\b/i, term: 'Auxiliary Space', category: 'Complexity' },
  { pattern: /\bloop invariant\b/i, term: 'Loop Invariant', category: 'Terminology' },
  { pattern: /\bborrow checker\b/i, term: 'Borrow Checker', category: 'Terminology' },
  { pattern: /\bmove semantics\b/i, term: 'Move Semantics', category: 'Terminology' },
  { pattern: /\bgarbage collection\b/i, term: 'Garbage Collection', category: 'Terminology' },
  { pattern: /\bdijkstra\b/i, term: "Dijkstra's Shortest Path", category: 'Terminology' },
  { pattern: /\bdynamic programming\b/i, term: 'Dynamic Programming', category: 'Terminology' },
  { pattern: /\bmemoization\b/i, term: 'Memoization', category: 'Terminology' },
  { pattern: /\bdivide\s*(?:&|and)\s*conquer\b/i, term: 'Divide & Conquer', category: 'Terminology' },
  { pattern: /\bhash table\b|\bhash map\b/i, term: 'Hash Table', category: 'Terminology' },
  { pattern: /\bbreadth-first search\b|\bBFS\b/, term: 'Breadth-First Search (BFS)', category: 'Terminology' },
  { pattern: /\bdepth-first search\b|\bDFS\b/, term: 'Depth-First Search (DFS)', category: 'Terminology' },
  { pattern: /\btopological sort\b/i, term: 'Topological Sort', category: 'Terminology' },
  { pattern: /\bdeadlock\b/i, term: 'Deadlock', category: 'Terminology' },
  { pattern: /\bmutex\b/i, term: 'Mutex (Mutual Exclusion)', category: 'Terminology' },
  { pattern: /\bpolymorphism\b/i, term: 'Polymorphism', category: 'Terminology' },
  { pattern: /\bconcurrency\b/i, term: 'Concurrency', category: 'Terminology' },
  { pattern: /\bamortized\b/i, term: 'Amortized Analysis', category: 'Complexity' },
  { pattern: /\brecursion\b/i, term: 'Recursion', category: 'Terminology' },
];

function stripInlineMarkup(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTermDefinition(rawLine: string): { term: string; definition: string } | null {
  const cleanedLine = rawLine.replace(/^\[[ xX]\]\s+/, '').trim();

  // Pattern 1: **Term:** Definition or **Term**: Definition
  const boldMatch = cleanedLine.match(/^\*\*([^*]{2,65}?)\*\*\s*[:—–-]\s+(.+)$/);
  if (boldMatch) {
    const term = stripInlineMarkup(boldMatch[1].replace(/[:：]$/, ''));
    const definition = stripInlineMarkup(boldMatch[2]);
    if (term && definition) return { term, definition };
  }

  // Pattern 2: `Term` — Definition or `Term`: Definition
  const codeMatch = cleanedLine.match(/^`([^`]{2,65}?)`\s*[:—–-]\s+(.+)$/);
  if (codeMatch) {
    const term = codeMatch[1].trim();
    const definition = stripInlineMarkup(codeMatch[2]);
    if (term && definition) return { term, definition };
  }

  // Pattern 3: Plain Term: Definition or Term — Definition
  const plainMatch = cleanedLine.match(/^([^:—–]{2,55}?)\s*(?::|—|–|\s-\s)\s+(.+)$/);
  if (plainMatch) {
    const term = stripInlineMarkup(plainMatch[1]);
    const definition = stripInlineMarkup(plainMatch[2]);
    // Skip labels that look like full sentences rather than terms
    if (term && definition && term.split(/\s+/).length <= 7) {
      return { term, definition };
    }
  }

  return null;
}

function extractCodeSignature(code: string, language: string): string {
  const lines = code
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//') && !l.startsWith('--'));

  if (lines.length === 0) return `${language} Snippet`;

  const sig = lines.find((line) =>
    /^(def |async def |fn |pub fn |func |function |export function |class |interface |type |struct |enum |SELECT |CREATE TABLE|SECTION )/i.test(
      line
    )
  );
  const chosen = (sig ?? lines[0]).replace(/[{:]\s*$/, '').trim();
  return chosen.length > 68 ? `${chosen.slice(0, 65)}...` : chosen;
}

function classifyTextCategory(term: string, definition: string): FlashcardCategory {
  if (/\bO\([^)]+\)|\btime complexity\b|\bspace complexity\b|\basymptotic\b/i.test(`${term} ${definition}`)) {
    return 'Complexity';
  }
  return 'Definition';
}

export function extractFlashcardsFromNote(
  noteTitle: string,
  noteContent: string
): StudyFlashcard[] {
  const trimmed = noteContent.trim();
  if (!trimmed) return [];

  const blocks = parseToAst(trimmed);
  const cards: StudyFlashcard[] = [];
  const seenTerms = new Set<string>();

  const pushCard = (
    term: string,
    definition: string,
    category: FlashcardCategory
  ) => {
    const cleanTerm = stripInlineMarkup(term);
    const cleanDef = stripInlineMarkup(definition);
    if (!cleanTerm || !cleanDef || cleanTerm.toLowerCase() === cleanDef.toLowerCase()) {
      return;
    }
    const key = cleanTerm.toLowerCase();
    if (seenTerms.has(key)) return;
    seenTerms.add(key);
    cards.push({
      id: `fc-${cards.length + 1}-${key.slice(0, 18).replace(/[^a-z0-9]/g, '')}`,
      term: cleanTerm,
      definition: cleanDef,
      category,
      source: 'extracted',
    });
  };

  let currentHeading = '';
  const allProseSentences: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.type === 'h1') {
      currentHeading = stripInlineMarkup(block.text);
      continue;
    }

    if (block.type === 'h2' || block.type === 'h3') {
      currentHeading = stripInlineMarkup(block.text);
      const nextBlock = blocks[i + 1];

      if (nextBlock?.type === 'paragraph') {
        const para = stripInlineMarkup(nextBlock.text);
        if (para.length >= 16) {
          pushCard(currentHeading, para, classifyTextCategory(currentHeading, para));
        }
      } else if (nextBlock?.type === 'list') {
        const hasExplicitDefs = nextBlock.items.some(
          (item) => splitTermDefinition(item) !== null
        );
        if (!hasExplicitDefs && nextBlock.items.length > 0) {
          const summaryDef = nextBlock.items
            .slice(0, 4)
            .map((item) => stripInlineMarkup(item.replace(/^\[[ xX]\]\s+/, '')))
            .join(' · ');
          if (summaryDef.length >= 12) {
            pushCard(currentHeading, summaryDef, 'Concept');
          }
        }
      }
      continue;
    }

    if (block.type === 'paragraph') {
      const cleanPara = stripInlineMarkup(block.text);
      const sentences = cleanPara.split(/(?<=[.!?؟])\s+/);
      allProseSentences.push(...sentences);

      // Extract inline "**Term** — definition" sentences if standalone
      const split = splitTermDefinition(block.text);
      if (split) {
        pushCard(split.term, split.definition, classifyTextCategory(split.term, split.definition));
      }
      continue;
    }

    if (block.type === 'blockquote') {
      const segments = block.text.split('·');
      for (const seg of segments) {
        const split = splitTermDefinition(seg);
        if (split) {
          pushCard(split.term, split.definition, 'Definition');
        }
      }
      continue;
    }

    if (block.type === 'list') {
      for (const item of block.items) {
        const split = splitTermDefinition(item);
        if (split) {
          pushCard(
            split.term,
            split.definition,
            classifyTextCategory(split.term, split.definition)
          );
        }
      }
      continue;
    }

    if (block.type === 'table') {
      for (const row of block.rows) {
        const term = stripInlineMarkup(row[0] ?? '');
        const details = row
          .slice(1)
          .map((cell, cIdx) => {
            const cleanCell = stripInlineMarkup(cell);
            const header = stripInlineMarkup(block.headers[cIdx + 1] ?? '');
            if (!cleanCell) return '';
            return header ? `${header}: ${cleanCell}` : cleanCell;
          })
          .filter(Boolean)
          .join(' · ');
        if (term && details) {
          const tableTitle = currentHeading && currentHeading !== noteTitle ? `${term} (${currentHeading})` : term;
          pushCard(tableTitle, details, classifyTextCategory(tableTitle, details));
        }
      }
      continue;
    }

    if (block.type === 'code') {
      const signature = extractCodeSignature(block.code, String(block.language));
      const previewLines = block.code
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 4)
        .join('  |  ');
      const contextPrefix = currentHeading
        ? `${block.language} (${currentHeading})`
        : `${block.language} implementation`;
      pushCard(signature, `${contextPrefix}: ${previewLines}`, 'Code');
      continue;
    }
  }

  // Enrich with matched CS terminology & explanatory sentences from prose
  for (const entry of CS_KEY_TERMS) {
    if (cards.length >= 20) break;
    if (seenTerms.has(entry.term.toLowerCase())) continue;
    const matchedSentence = allProseSentences.find((sentence) =>
      entry.pattern.test(sentence)
    );
    if (matchedSentence && matchedSentence.length >= 18) {
      pushCard(entry.term, matchedSentence, entry.category);
    }
  }

  // If the note still produced zero cards (e.g., short unstructured text), synthesize one summary card
  if (cards.length === 0 && trimmed.length >= 8) {
    const cleanTitle = stripInlineMarkup(noteTitle) || 'Note Key Idea';
    const snippet = stripInlineMarkup(trimmed).slice(0, 260);
    if (snippet && snippet.toLowerCase() !== cleanTitle.toLowerCase()) {
      pushCard(cleanTitle, snippet, 'Concept');
    }
  }

  return cards.slice(0, 24);
}
