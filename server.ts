import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please configure your key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(res: express.Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status =
    message.includes('GEMINI_API_KEY') || message.includes('API_KEY_INVALID')
      ? 400
      : message.includes('PERMISSION_DENIED')
      ? 403
      : message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : 500;
  res.status(status).json({ error: message });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'AInotes', model: MODEL_NAME });
  });

  app.post('/api/htr/recognize', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/png',
        targetLanguage = 'en',
        targetLanguageName = 'English',
        recognitionProfile = 'hybrid_ink_code',
        customVocabulary = '',
      } = req.body ?? {};

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Missing imageBase64 payload.' });
        return;
      }

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const ai = getGeminiClient();

      const profileInstructions: Record<string, string> = {
        hybrid_ink_code:
          'Mode: MyScript Ink & Code — recognize neat/messy stylus strokes, indentation, operators, and mathematical notation.',
        cursive_pentoprint:
          'Mode: Pen to Print / InkReadable Cursive — carefully decode connected cursive handwriting, margin annotations, and crossed-out corrections.',
        transkribus_multilingual:
          'Mode: Transkribus Multilingual Archive — preserve diacritics, non-Latin scripts, and historical/academic line structure.',
        docai_textract_form:
          'Mode: Google Document AI / AWS Textract Forms — extract key-value form fields, tables (render as Markdown tables), and check/record entries cleanly.',
        quick_capture:
          'Mode: Everyday Quick Capture (Apple Live Text / OneNote / Keep) — fast clean transcription of whiteboard or paper photos.',
      };

      const systemInstruction = `You are AInotes HTR/OCR Engine for advanced Computer Science students.
${profileInstructions[recognitionProfile] || profileInstructions.hybrid_ink_code}
Target transcription language: ${targetLanguageName} (${targetLanguage}).
Supported programming languages to detect and preserve accurately: Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart/Flutter, Bash/Shell, Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB, COBOL/Assembly.
${customVocabulary ? `Custom student vocabulary / domain hints to prioritize: ${customVocabulary}` : ''}

Formatting rules for extractedText:
- Preserve exact code indentation, brackets, operators, and variable names.
- Use AInotes lightweight markup when headings appear: underline document titles with *** on the next line, major sections with ===, and subsections with ---.
- Wrap code blocks in fenced markdown blocks with the exact detected language tag (e.g., \`\`\`python, \`\`\`rust, \`\`\`sql, \`\`\`assembly) OR 3-space indented blocks.
- Keep prose in the language written in the image (or translate headings/summary notes into ${targetLanguageName} if requested).`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe all handwritten, cursive, printed, diagram-label, tabular, and source-code content from this document accurately. Return structured JSON.',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedText: {
                type: Type.STRING,
                description:
                  'Complete transcribed Markdown/AInotes lightweight markup with fenced code blocks.',
              },
              detectedLanguage: {
                type: Type.STRING,
                description: 'Detected human language name or ISO code.',
              },
              detectedCodeLanguages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of detected programming languages in the note.',
              },
              recognitionSummary: {
                type: Type.STRING,
                description:
                  'Brief 1-sentence note on legibility, diagrams, or handwritten structure observed.',
              },
            },
            required: ['extractedText', 'detectedLanguage', 'detectedCodeLanguages', 'recognitionSummary'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  app.post('/api/study/summarize', async (req, res) => {
    try {
      const { title = 'Study Note', content = '', targetLanguageName = 'English' } = req.body ?? {};
      if (!content.trim()) {
        res.status(400).json({ error: 'Note content is empty.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Title: ${title}\n\nNote Content:\n${content}`,
        config: {
          systemInstruction: `You are an expert Computer Science teaching assistant. Respond strictly in ${targetLanguageName}. Summarize the note clearly for exam revision, highlighting core concepts and algorithmic complexity if code is present.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              complexityNotes: { type: Type.STRING },
            },
            required: ['summary', 'keyConcepts', 'complexityNotes'],
          },
        },
      });

      res.json(JSON.parse((response.text ?? '{}').trim()));
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  app.post('/api/study/quiz', async (req, res) => {
    try {
      const {
        title = 'Study Note',
        content = '',
        targetLanguageName = 'English',
        questionCount = 5,
      } = req.body ?? {};
      if (!content.trim()) {
        res.status(400).json({ error: 'Note content is empty.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Generate exactly ${questionCount} challenging Computer Science multiple-choice questions (with 4 options each) based strictly on this note.\n\nTitle: ${title}\n\nContent:\n${content}`,
        config: {
          systemInstruction: `You are a Computer Science professor writing an interactive 5-question exam quiz. Write all questions, 4 options per question, and concise explanations strictly in ${targetLanguageName}. Keep code identifiers and Big-O notation exact.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['question', 'options', 'correctIndex', 'explanation'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      res.json(JSON.parse((response.text ?? '{"questions":[]}').trim()));
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  app.post('/api/study/explain-code', async (req, res) => {
    try {
      const { code = '', language = 'auto', targetLanguageName = 'English' } = req.body ?? {};
      if (!code.trim()) {
        res.status(400).json({ error: 'No code snippet provided.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Language hint: ${language}\n\nCode:\n${code}`,
        config: {
          systemInstruction: `You are a senior systems & algorithms mentor. Explain this code snippet in ${targetLanguageName}. Identify exact language, Big-O time & space complexity, and provide a concise line-by-line breakdown.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING },
              timeComplexity: { type: Type.STRING },
              spaceComplexity: { type: Type.STRING },
              walkthrough: { type: Type.STRING },
              lineByLine: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    line: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['line', 'note'],
                },
              },
            },
            required: [
              'detectedLanguage',
              'timeComplexity',
              'spaceComplexity',
              'walkthrough',
              'lineByLine',
            ],
          },
        },
      });

      res.json(JSON.parse((response.text ?? '{}').trim()));
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  app.post('/api/study/flashcards', async (req, res) => {
    try {
      const {
        title = 'Study Note',
        content = '',
        targetLanguageName = 'English',
        cardCount = 8,
      } = req.body ?? {};
      if (!content.trim()) {
        res.status(400).json({ error: 'Note content is empty.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Extract up to ${cardCount} key Computer Science terminology/definition flashcards from this note.\n\nTitle: ${title}\n\nContent:\n${content}`,
        config: {
          systemInstruction: `You are an expert Computer Science tutor building active-recall flashcards in ${targetLanguageName}. For each card, provide a concise front term/concept and a clear, accurate back definition/explanation rooted in the note. Preserve code identifiers and Big-O notation accurately.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ['term', 'definition', 'category'],
                },
              },
            },
            required: ['flashcards'],
          },
        },
      });

      res.json(JSON.parse((response.text ?? '{"flashcards":[]}').trim()));
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AInotes server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AInotes server:', err);
  process.exit(1);
});
