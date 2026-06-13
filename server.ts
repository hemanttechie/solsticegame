import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded GoogleGenAI client singleton wrapper
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (aiClient) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return aiClient;
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Endpoint: Generate lore inscription on ancient tablets
app.post('/api/gemini/lore', async (req, res) => {
  try {
    const { levelName, tabletId, timeState } = req.body;
    
    // Check if key is available
    let ai;
    try {
      ai = getAiClient();
    } catch {
      return res.status(200).json({
        text: "The ancient text is worn by time's passage, yet a warm light flickers within its runes. Preserve the Balance.",
        mood: "warm",
        error: "SDK_KEYS_UNCONFIGURED"
      });
    }

    const prompt = `You are a mystical seasonal narrator for a beautiful 2D platforming game "The Last Minute of Daylight". 
Write an ancient, evocative, short solstice lore inscription for an ancient tablet. 
Context:
- Level Name: ${levelName || 'Solstice Lands'}
- Tablet Identifier: ${tabletId || 'tablet-1'}
- Current World Era: ${timeState || 'DAY'}

The game is inspired by the June Solstice: the longest day, light, dark shadow, seasonal shifts, and the sacrifice to keep the solstice embers alive. Write a highly poetic, mysterious, and beautifully atmospheric inscription (1 to 2 short sentences max). Avoid generic gaming clichés. Keep it family-friendly.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: 'The poetic inscription written on the ancient tablet.',
            },
            mood: {
              type: Type.STRING,
              description: 'A single word describing the aesthetic mood of the tablet lore (e.g., mysterious, peaceful, solemn, ancient).',
            }
          },
          required: ['text', 'mood'],
        },
        temperature: 0.8,
      },
    });

    if (response && response.text) {
      const data = JSON.parse(response.text.trim());
      return res.json(data);
    } else {
      throw new Error('No content generated');
    }
  } catch (error: any) {
    console.error('Lore API Error:', error);
    res.json({
      text: "Stars and sunbeams dance in a perpetual circle. When shadows lengthen, the flame must burn the brightest.",
      mood: "mysterious",
      error: error.message
    });
  }
});

// Endpoint: Generate dynamic NPC dialogue
app.post('/api/gemini/dialogue', async (req, res) => {
  try {
    const { npcName, levelName, timeState, daylightRemaining } = req.body;

    let ai;
    try {
      ai = getAiClient();
    } catch {
      return res.status(200).json({
        text: `Greetings, traveller. The fire in your hearth is beautiful. Rest here awhile.`,
        mood: "friendly",
        error: "SDK_KEYS_UNCONFIGURED"
      });
    }

    const prompt = `You are designing character speech for an NPC named "${npcName || 'Solstice Spirit'}" in the puzzle-platformer "The Last Minute of Daylight".
Context:
- Current Level: "${levelName || 'Dawn Meadow'}"
- Current State of the Sky: "${timeState || 'DAY'}" (flip state)
- Daylight Remaining in player's flame: ${daylightRemaining ?? 100}%

Provide a single, short, family-friendly, friendly spoken dialogue (maximum 15 words). Integrate its character type. For instance, daylight animals might be active and joyous during the day but sleepy or anxious at night. Vesper the Owl is wise and speaks of constellations. Mira the Lake Keeper is calm like still water.
Address the player warmly, reflecting their remaining daylight level and the solstice season.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: 'The spoken dialogue of the NPC. Should be short and responsive.'
            },
            mood: {
              type: Type.STRING,
              description: 'The emotional attitude of the NPC (e.g., peaceful, sleepy, optimistic, anxious, wise).'
            }
          },
          required: ['text', 'mood']
        },
        temperature: 0.8
      }
    });

    if (response && response.text) {
      const data = JSON.parse(response.text.trim());
      return res.json(data);
    } else {
      throw new Error('No content returned');
    }
  } catch (error: any) {
    console.error('Dialogue API Error:', error);
    res.json({
      text: "Keep moving, Solstice Flame Keeper! Every shadow is just light waiting to be born again.",
      mood: "cheerful",
      error: error.message
    });
  }
});

// Vite & Static Asset Handling Middleware
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched successfully and listening on http://0.0.0.0:${PORT}`);
  });
}

start();
