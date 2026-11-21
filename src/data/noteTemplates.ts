export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  tags: string[];
  content: string;
}

export const CS_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Empty Setext & Markdown workspace',
    title: 'Untitled CS Note',
    tags: [],
    content: `Untitled CS Note
****************

Notes
=====

- Start writing, paste code, or import handwritten scans here.
`,
  },
  {
    id: 'algorithm-analysis',
    name: 'Algorithm Analysis',
    description: 'Big-O complexity, invariants & edge cases',
    title: 'Algorithm Analysis — [Topic]',
    tags: ['algorithms', 'complexity'],
    content: `Algorithm Analysis — [Topic]
****************************

Problem Statement
=================

Summarize the input constraints, expected output, and key assumptions.

Approach & Loop Invariant
=========================

- Strategy: (e.g., Divide & Conquer / Dynamic Programming / Two Pointers)
- Invariant: State the property that holds before and after each iteration.

Complexity Analysis
===================

| Case | Time Complexity | Space Complexity | Notes |
| --- | --- | --- | --- |
| Best | O(n) | O(1) | Sorted or trivial input |
| Average | O(n log n) | O(log n) | Expected runtime |
| Worst | O(n log n) | O(n) | Adversarial input |

Reference Implementation
========================

\`\`\`python
def solve(items: list[int]) -> int:
    # TODO: Implement core algorithm
    return len(items)
\`\`\`

Edge Cases & Verification
=========================

- Empty input ([])
- Single element ([x])
- Duplicates, negative numbers, and maximum constraint bounds
`,
  },
  {
    id: 'code-reference',
    name: 'Code Reference',
    description: 'API signatures, idioms & common pitfalls',
    title: 'Code Reference — [Language / API]',
    tags: ['reference', 'code'],
    content: `Code Reference — [Language / API]
**********************************

Overview & Signature
====================

Document module purpose, core types, and primary entry points.

Key Patterns & Idioms
=====================

1. Initialization and configuration
2. Error handling and resource cleanup
3. Concurrency / async lifecycle considerations

Implementation Snippet
======================

\`\`\`typescript
export interface Result<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function executeTask<T>(input: T): Result<T> {
  return { ok: true, data: input };
}
\`\`\`

Common Pitfalls
===============

- Watch for off-by-one bounds, shallow copies, or unhandled rejections.
- Benchmark hot paths before optimizing prematurely.
`,
  },
  {
    id: 'lecture-notes',
    name: 'Lecture Notes',
    description: 'Core concepts, worked examples & review Qs',
    title: 'Lecture Notes — [Course / Week]',
    tags: ['lecture', 'notes'],
    content: `Lecture Notes — [Course / Week]
*******************************

> **Course:** CS-XXX · **Topic:** [Lecture Title] · **Instructor:** [Name]

Core Concepts & Definitions
===========================

- **Term 1:** Concise definition and intuition.
- **Term 2:** How it relates to previous lectures.

Worked Example
==============

Step-by-step walkthrough from class:

1. Initial state / setup
2. Key transition or theorem applied
3. Final result and verification

Key Takeaways
=============

- Main principle to remember for exams and assignments.

Review Questions & Action Items
===============================

- [ ] Re-derive proof / trace example from memory
- [ ] Complete related lab exercises before next session
`,
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
    description: 'Architecture, milestones, stack & risks',
    title: 'Project Plan — [System Name]',
    tags: ['project', 'planning'],
    content: `Project Plan — [System Name]
****************************

Objectives & Scope
==================

- **Goal:** Define the primary problem this project solves.
- **Non-Goals:** Explicitly list features deferred to future iterations.

Architecture & Data Flow
========================

\`\`\`bash
# Core system flow
Client UI -> API Gateway / Validation -> Domain Service -> Persistent Store
\`\`\`

Milestone Schedule
==================

| Phase | Deliverable | Target | Status |
| --- | --- | --- | --- |
| M1 | Core data model & prototype | Week 1 | Planned |
| M2 | Integration & automated tests | Week 2 | Planned |
| M3 | Performance audit & release | Week 3 | Planned |

Tech Stack & Dependencies
=========================

- Frontend:
- Backend / API:
- Storage & Testing:

Risks & Open Questions
======================

- Identify bottlenecks, external API limits, or security considerations early.
`,
  },
];
