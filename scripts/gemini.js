/**
 * Gemini AI Service for blog generation & Telugu translation
 * Model: gemini-pro-latest
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

/**
 * Generate a spiritual blog post for a shloka
 */
async function generateShlokaBlog(shlokaData) {
  const prompt = `You are a spiritual teacher and thoughtful writer. Based on the following Bhagavad Gita shloka, write a deeply meaningful blog post that connects this ancient wisdom to modern everyday life.

**Shloka (Sanskrit):**
${shlokaData.slok}

**Transliteration:**
${shlokaData.transliteration}

**English Translation:**
${shlokaData.english_translation}

**Commentary:**
${shlokaData.english_commentary || 'Not available'}

**Chapter ${shlokaData.chapter}, Verse ${shlokaData.verse}**

Write the response in the following JSON format (return ONLY valid JSON, no markdown):
{
  "title_en": "An engaging blog post title in English",
  "content_en": "A detailed blog post (500-800 words) that:\n1. Opens with a relatable modern-day scenario or question\n2. Explains the shloka's meaning in simple terms\n3. Draws a practical life lesson\n4. Gives a real-world example of applying this wisdom\n5. Ends with a reflective thought or action step\nUse paragraph breaks with \\n\\n between sections.",
  "excerpt_en": "A 2-3 sentence summary for the blog card",
  "title_te": "Same title translated to Telugu",
  "content_te": "Full blog post translated to Telugu (natural Telugu, not transliteration)",
  "excerpt_te": "Telugu summary for the blog card",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from the response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Process a personal draft — strip personal info and create a publishable post
 */
async function processDraft(draftContent, relatedShloka = null) {
  let shlokaContext = '';
  if (relatedShloka) {
    shlokaContext = `\n\n**Related Shloka (Chapter ${relatedShloka.chapter}, Verse ${relatedShloka.verse}):**\n${relatedShloka.slok}\n${relatedShloka.english_translation}`;
  }

  const prompt = `You are a spiritual editor. A person has written personal reflections about a life experience. Your job is to:

1. **STRIP all personal information** — remove names, specific places, relationships (replace with generic terms like "a friend", "a colleague", "a city"), dates, and any identifying details
2. Convert the personal experience into a **universal spiritual lesson** that anyone can relate to
3. Connect it to Bhagavad Gita wisdom if possible
4. Create a polished, publishable blog post
${shlokaContext}

**Original Draft:**
${draftContent}

Return ONLY valid JSON in this format:
{
  "title_en": "Blog post title",
  "content_en": "Polished blog post in English (400-600 words). Use \\n\\n for paragraph breaks.",
  "excerpt_en": "2-3 sentence summary",
  "title_te": "Telugu title",
  "content_te": "Full post in natural Telugu",
  "excerpt_te": "Telugu summary",
  "tags": ["tag1", "tag2", "tag3"],
  "related_shloka_id": "${relatedShloka ? `BG${relatedShloka.chapter}.${relatedShloka.verse}` : ''}"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate Telugu translation for a shloka explanation
 */
async function translateToTelugu(englishText, context = '') {
  const prompt = `Translate the following English text to natural, readable Telugu (using Telugu script, not transliteration). Maintain the spiritual tone and meaning.
${context ? `Context: This is about Bhagavad Gita - ${context}` : ''}

English text:
${englishText}

Return ONLY the Telugu translation, nothing else.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { generateShlokaBlog, processDraft, translateToTelugu };
