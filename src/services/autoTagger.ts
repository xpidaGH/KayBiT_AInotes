import { parseToAst } from '../parsers/setextCustomParser';

interface TagRule {
  label: string;
  pattern: RegExp;
  weight?: number;
}

const KEYWORD_TAG_RULES: TagRule[] = [
  {
    label: 'Algorithms',
    pattern:
      /\b(algorithm|algorithms|heuristic|greedy|divide\s+and\s+conquer|backtracking|two\s+pointers|sliding\s+window)\b/i,
    weight: 3,
  },
  {
    label: 'Complexity',
    pattern:
      /\b(complexity|asymptotic|big[- ]o|time\s+complexity|space\s+complexity|worst[- ]case|best[- ]case|invariant)\b|o\(\s*(?:1|n|log\s*n|n\s*log\s*n|n\^2|2\^n)\s*\)/i,
    weight: 3,
  },
  {
    label: 'Arrays',
    pattern: /\b(array|arrays|subarray|slice|matrix|matrices|vector|indexed)\b/i,
    weight: 2,
  },
  {
    label: 'Graphs',
    pattern:
      /\b(graph|graphs|dijkstra|bfs|dfs|breadth[- ]first|depth[- ]first|topological|adjacency|vertex|vertices|shortest\s+path)\b/i,
    weight: 3,
  },
  {
    label: 'Trees',
    pattern:
      /\b(tree|trees|binary\s+tree|bst|avl|trie|heap|priority\s+queue|red[- ]black)\b/i,
    weight: 2,
  },
  {
    label: 'Searching',
    pattern:
      /\b(binary\s+search|linear\s+search|search\s+interval|target\s+index)\b/i,
    weight: 2,
  },
  {
    label: 'Sorting',
    pattern:
      /\b(quicksort|mergesort|heapsort|merge\s+sort|quick\s+sort|insertion\s+sort|sorting)\b/i,
    weight: 2,
  },
  {
    label: 'Dynamic Programming',
    pattern:
      /\b(dynamic\s+programming|memoization|tabulation|recurrence|subproblem)\b/i,
    weight: 3,
  },
  {
    label: 'Systems',
    pattern:
      /\b(memory\s+safety|register|assembly|kernel|syscall|pointer|borrow\s+checker|ownership|x86)\b/i,
    weight: 2,
  },
  {
    label: 'Databases',
    pattern:
      /\b(sql|database|relational|query|schema|primary\s+key|foreign\s+key|inner\s+join|group\s+by)\b/i,
    weight: 2,
  },
  {
    label: 'Concurrency',
    pattern:
      /\b(async|await|thread|mutex|semaphore|deadlock|concurrent|parallel)\b/i,
    weight: 2,
  },
  {
    label: 'Architecture',
    pattern:
      /\b(architecture|api\s+gateway|microservice|data\s+flow|milestone|system\s+design)\b/i,
    weight: 2,
  },
  {
    label: 'Testing',
    pattern:
      /\b(edge\s+case|edge\s+cases|unit\s+test|verification|assertion|benchmark)\b/i,
    weight: 1,
  },
];

/**
 * Analyzes note title, body keywords, and detected code-block languages
 * to suggest relevant CS labels not already applied to the note.
 */
export function suggestTagsForNote(
  title: string,
  content: string,
  existingTags: string[] = [],
  maxSuggestions = 6
): string[] {
  const combined = `${title}\n${content}`;
  if (!combined.trim()) return [];

  const existingLower = new Set(
    existingTags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  );
  const scores = new Map<string, number>();

  const addCandidate = (label: string, score: number) => {
    const clean = label.trim();
    if (!clean || existingLower.has(clean.toLowerCase())) return;
    scores.set(clean, (scores.get(clean) ?? 0) + score);
  };

  for (const rule of KEYWORD_TAG_RULES) {
    const matches = combined.match(new RegExp(rule.pattern.source, 'gi'));
    if (matches && matches.length > 0) {
      addCandidate(rule.label, (rule.weight ?? 1) * Math.min(3, matches.length));
    }
  }

  // Also suggest programming languages detected in any code blocks within the note
  try {
    const ast = parseToAst(content);
    for (const block of ast) {
      if (block.type === 'code' && block.language) {
        addCandidate(String(block.language), 2);
      }
    }
  } catch {
    // ignore AST parse issues during partial edits
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxSuggestions)
    .map(([label]) => label);
}
