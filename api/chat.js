/**
 * Vercel Serverless Function: POST /api/chat
 * Dual-Model Semantic Mood Chatbot
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

// Load segments for context injection
let segmentsCache = null;
function getSegmentsContext() {
  if (segmentsCache) return segmentsCache;
  try {
    const segPath = path.join(__dirname, '..', 'data', 'segments.json');
    if (fs.existsSync(segPath)) {
      const segs = JSON.parse(fs.readFileSync(segPath, 'utf-8'));
      segmentsCache = JSON.stringify(segs.map(s => ({ 
        id: s.start_id, 
        topic: s.topic_en,
        chapters: s.chapter 
      })));
    } else {
      segmentsCache = '[]';
    }
  } catch(e) {
    segmentsCache = '[]';
  }
  return segmentsCache;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  const systemPrompt = `You are a compassionate Spiritual Guide based strictly on the Bhagavad Gita. 
A user is expressing their mood or asking a question. Your job is to comfort them, explain a brief Gita concept, and RECOMMEND exactly one Shloka to read.
Here is the strict list of available segment starting shlokas you can recommend: ${getSegmentsContext()}
When you recommend a Shloka, wrap its ID in braces like this: {BG2.14}.
Keep your response under 150 words. Do not hallucinate shlokas that aren't in the list.`;

  try {
    // 1. Try Primary Model: Gemini 2.5 Flash Lite
    if (!process.env.CHAT_GEMINI_API_KEY) throw new Error('CHAT_GEMINI_API_KEY missing');
    
    const genAI = new GoogleGenerativeAI(process.env.CHAT_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      systemInstruction: systemPrompt
    });

    // Format history for Gemini
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));
    
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(messages[messages.length - 1].text);
    const responseText = result.response.text();

    return res.status(200).json({ role: 'model', text: responseText, provider: 'gemini' });

  } catch (errGemini) {
    console.warn('Gemini Chat Failed, falling back to NVIDIA NIM:', errGemini.message);

    // 2. Try Fallback Model: NVIDIA NIM
    try {
      if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY missing');

      const openai = new OpenAI({
        apiKey: process.env.NVIDIA_API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });

      // Format history for OpenAI spec
      const openAiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: "z-ai/glm5",
        messages: openAiMessages,
        max_tokens: 300
      });

      const responseText = completion.choices[0]?.message?.content || "I am unable to process that request right now.";
      
      return res.status(200).json({ role: 'model', text: responseText, provider: 'nvidia' });

    } catch (errNvidia) {
      console.error('NVIDIA Chat Failed:', errNvidia.message);
      return res.status(500).json({ 
        error: 'Both AI providers are currently unavailable.',
        details: errNvidia.message 
      });
    }
  }
};
