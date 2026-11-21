import { SupportedLangCode } from '../i18n/languages';
import { parseToAst } from '../parsers/setextCustomParser';

export interface AutocompleteSuggestion {
  term: string;
  source: string;
}

const CORE_CS_TERMS: string[] = [
  'algorithm',
  'amortized',
  'array',
  'asymptotic',
  'adjacency',
  'backtracking',
  'balanced',
  'binary search',
  'binary tree',
  'bitmask',
  'breadth-first search',
  'cache',
  'complexity',
  'concurrency',
  'constant space',
  'deadlock',
  'depth-first search',
  'dijkstra',
  'divide and conquer',
  'dynamic programming',
  'edge case',
  'encapsulation',
  'fibonacci',
  'graph',
  'greedy',
  'hash table',
  'hashmap',
  'heap',
  'heuristic',
  'immutable',
  'inheritance',
  'invariant',
  'iteration',
  'kruskal',
  'linked list',
  'logarithmic',
  'loop invariant',
  'memoization',
  'merge sort',
  'mutex',
  'polymorphism',
  'priority queue',
  'quicksort',
  'recurrence',
  'recursion',
  'red-black tree',
  'semaphore',
  'shortest path',
  'sliding window',
  'space complexity',
  'spanning tree',
  'stack',
  'subproblem',
  'tabulation',
  'thread-safe',
  'time complexity',
  'topological sort',
  'traversal',
  'trie',
  'two pointers',
  'union-find',
  'worst-case',
];

const PROGRAMMING_LANG_TERMS: Record<string, string[]> = {
  Python: [
    'collections',
    'comprehension',
    'dataclass',
    'defaultdict',
    'dictionary',
    'enumerate',
    'itertools',
    'lambda',
    'isinstance',
    'yield',
  ],
  JavaScript: [
    'Array.prototype',
    'Promise',
    'async',
    'await',
    'closure',
    'destructuring',
    'event loop',
    'prototype',
  ],
  TypeScript: [
    'Promise',
    'Record',
    'Readonly',
    'generics',
    'interface',
    'type guard',
    'union type',
    'unknown',
  ],
  Java: [
    'ArrayList',
    'Comparable',
    'HashMap',
    'HashSet',
    'PriorityQueue',
    'StringBuilder',
    'implements',
    'synchronized',
  ],
  'C#': [
    'Dictionary',
    'IEnumerable',
    'LINQ',
    'StringBuilder',
    'async',
    'namespace',
    'readonly',
  ],
  Rust: [
    'Option',
    'Result',
    'Vec',
    'borrow checker',
    'impl',
    'lifetime',
    'ownership',
    'pattern matching',
  ],
  'C++': [
    'nullptr',
    'std::map',
    'std::unordered_map',
    'std::vector',
    'template',
    'unique_ptr',
  ],
  C: ['calloc', 'malloc', 'pointer', 'sizeof', 'struct', 'typedef'],
  SQL: [
    'COALESCE',
    'FOREIGN KEY',
    'GROUP BY',
    'HAVING',
    'INNER JOIN',
    'LEFT JOIN',
    'ORDER BY',
    'PRIMARY KEY',
    'SELECT',
    'WHERE',
  ],
  Go: ['channel', 'defer', 'goroutine', 'interface', 'slice', 'struct'],
  Kotlin: ['coroutine', 'data class', 'mutableListOf', 'sealed class', 'when'],
};

const LOCALE_CS_TERMS: Partial<Record<SupportedLangCode, string[]>> = {
  es: [
    'algoritmo',
    'complejidad',
    'recursión',
    'arreglo',
    'grafo',
    'árbol',
    'pila',
    'cola',
    'tabla hash',
  ],
  fr: [
    'algorithme',
    'complexité',
    'récursivité',
    'tableau',
    'graphe',
    'arbre',
    'pile',
    'file',
  ],
  de: [
    'Algorithmus',
    'Komplexität',
    'Rekursion',
    'Datenstruktur',
    'Baum',
    'Graph',
    'Sortierung',
  ],
  pt: [
    'algoritmo',
    'complexidade',
    'recursão',
    'grafo',
    'árvore',
    'pilha',
    'fila',
  ],
  it: [
    'algoritmo',
    'complessità',
    'ricorsione',
    'grafo',
    'albero',
    'tabella hash',
  ],
  ar: ['خوارزمية', 'تعقيد', 'مصفوفة', 'شجرة', 'رسم بياني', 'مكدس'],
  ur: ['الگورتھم', 'پیچیدگی', 'اررے', 'درخت', 'گراف'],
  fa: ['الگوریتم', 'پیچیدگی', 'آرایه', 'درخت', 'گراف'],
  'pa-PK': ['الگورتھم', 'پیچیدگی', 'اررے', 'درخت', 'گراف'],
  ru: ['алгоритм', 'сложность', 'рекурсия', 'массив', 'граф', 'дерево'],
  tr: ['algoritma', 'karmaşıklık', 'özyineleme', 'dizi', 'graf', 'ağaç'],
  hi: ['एल्गोरिथ्म', 'जटिलता', 'सरणी', 'ग्राफ़', 'वृक्ष'],
  zh: ['算法', '时间复杂度', '空间复杂度', '数组', '二叉树', '图论', '动态规划'],
  ja: ['アルゴリズム', '計算量', '配列', '二分探索', '動的計画法', '木構造'],
  ko: ['알고리즘', '시간 복잡도', '배열', '이진 탐색', '동적 계획법', '그래프'],
};

export function getAutocompleteSuggestions(params: {
  prefix: string;
  noteLanguage: SupportedLangCode;
  noteTags: string[];
  libraryTags: string[];
  noteContent: string;
  maxResults?: number;
}): AutocompleteSuggestion[] {
  const {
    prefix,
    noteLanguage,
    noteTags,
    libraryTags,
    noteContent,
    maxResults = 6,
  } = params;

  const cleanPrefix = prefix.trim();
  if (cleanPrefix.length < 2) return [];
  const lowerPrefix = cleanPrefix.toLowerCase();

  const candidates = new Map<string, { term: string; source: string; score: number }>();

  const register = (term: string, source: string, baseScore: number) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (lower === lowerPrefix) return;

    const startsWithPrefix = lower.startsWith(lowerPrefix);
    const wordStartsWithPrefix =
      !startsWithPrefix &&
      lower.split(/[\s_-]+/).some((part) => part.startsWith(lowerPrefix));

    if (!startsWithPrefix && !wordStartsWithPrefix) return;

    const matchBonus = startsWithPrefix ? 40 : 15;
    const totalScore = baseScore + matchBonus - Math.min(20, trimmed.length * 0.2);

    const existing = candidates.get(lower);
    if (!existing || totalScore > existing.score) {
      candidates.set(lower, { term: trimmed, source, score: totalScore });
    }
  };

  // 1. Active note tags (highest boost)
  for (const tag of noteTags) {
    register(tag, 'Note label', 100);
  }

  // 2. Previously used tags across the library
  for (const tag of libraryTags) {
    register(tag, 'Library tag', 85);
  }

  // 3. Terms matching active note's document language
  const localeTerms = LOCALE_CS_TERMS[noteLanguage] ?? [];
  for (const term of localeTerms) {
    register(term, noteLanguage.toUpperCase(), 80);
  }

  // 4. Terms matching programming languages detected inside code blocks of the note
  try {
    const ast = parseToAst(noteContent);
    for (const block of ast) {
      if (block.type === 'code' && block.language) {
        const langName = String(block.language);
        const langTerms = PROGRAMMING_LANG_TERMS[langName] ?? [];
        for (const term of langTerms) {
          register(term, langName, 75);
        }
      }
    }
  } catch {
    // ignore partial AST issues while typing
  }

  // 5. Core CS terminology
  for (const term of CORE_CS_TERMS) {
    register(term, 'CS term', 50);
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
    .slice(0, maxResults)
    .map(({ term, source }) => ({ term, source }));
}
