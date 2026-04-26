/**
 * Gemini AI Service
 * Powers the AI Intelligence Panel: Catch Me Up, Mood Read, Key Points.
 * Uses the Gemini 1.5 Flash model via the REST API (no SDK required).
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Add it to your .env.local file.')
  }
  return key
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey()
  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error ${response.status}: ${err?.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }
  return text.trim()
}

// ─── Message Preparation ─────────────────────────────────────────────────────

interface SimpleMessage {
  displayName: string
  text: string
  createdAt: Date
}

function formatMessagesForPrompt(messages: SimpleMessage[]): string {
  return messages
    .slice(-60) // cap at 60 most recent
    .map((m) => `[${m.displayName}]: ${m.text}`)
    .join('\n')
}

// ─── Feature: Catch Me Up ────────────────────────────────────────────────────

export interface CatchMeUpResult {
  summary: string
  keyFacts: string[]
  atmosphere: string
}

export async function catchMeUp(messages: SimpleMessage[]): Promise<CatchMeUpResult> {
  const transcript = formatMessagesForPrompt(messages)

  const prompt = `You are an intelligent chat assistant. Below is a recent conversation transcript.

${transcript}

Respond with a JSON object in this exact structure (no markdown fences, just raw JSON):
{
  "summary": "A 2-3 sentence plain-English summary of what was discussed.",
  "keyFacts": ["fact 1", "fact 2", "fact 3"],
  "atmosphere": "One short sentence describing the overall emotional tone (e.g. 'Friendly and productive', 'Tense disagreement', 'Casual and playful')."
}

Do not include any text outside the JSON.`

  const raw = await callGemini(prompt)

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleaned) as CatchMeUpResult
  } catch {
    // graceful fallback
    return {
      summary: raw,
      keyFacts: [],
      atmosphere: 'Unknown',
    }
  }
}

// ─── Feature: Mood Read ──────────────────────────────────────────────────────

export interface MoodReadResult {
  mood: string
  emoji: string
  color: string
  description: string
  warning?: string
}

export async function readRoomMood(messages: SimpleMessage[]): Promise<MoodReadResult> {
  const transcript = formatMessagesForPrompt(messages)

  const prompt = `Analyze the emotional atmosphere of this chat conversation.

${transcript}

Respond with a JSON object (no markdown fences):
{
  "mood": "one of: Chill, Focused, Excited, Tense, Playful, Sad, Supportive, Heated",
  "emoji": "single relevant emoji",
  "color": "a CSS hex color that represents this mood (e.g. #6366f1 for calm)",
  "description": "One sentence about the vibe.",
  "warning": "Optional: only include if the conversation seems heated or toxic, with a brief heads-up."
}`

  const raw = await callGemini(prompt)

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleaned) as MoodReadResult
  } catch {
    return {
      mood: 'Neutral',
      emoji: '💬',
      color: '#6366f1',
      description: raw,
    }
  }
}

// ─── Feature: Key Points ─────────────────────────────────────────────────────

export interface KeyPointsResult {
  decisions: string[]
  actionItems: string[]
  links: string[]
  questions: string[]
}

export async function extractKeyPoints(messages: SimpleMessage[]): Promise<KeyPointsResult> {
  const transcript = formatMessagesForPrompt(messages)

  const prompt = `Extract structured information from this chat conversation.

${transcript}

Respond with a JSON object (no markdown fences):
{
  "decisions": ["Any decisions or conclusions reached (empty array if none)"],
  "actionItems": ["Any tasks, to-dos, or action items mentioned (empty array if none)"],
  "links": ["Any URLs or resources shared (empty array if none)"],
  "questions": ["Any open questions that were asked but not yet answered (empty array if none)"]
}

Keep each item concise (one sentence max). If a category has nothing, return an empty array.`

  const raw = await callGemini(prompt)

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleaned) as KeyPointsResult
  } catch {
    return { decisions: [], actionItems: [], links: [], questions: [raw] }
  }
}

// ─── Feature: Tone Rewriter ───────────────────────────────────────────────────

export type ToneStyle = 'professional' | 'friendly' | 'shorter' | 'direct' | 'casual'

export async function rewriteMessageTone(text: string, tone: ToneStyle): Promise<string> {
  const toneInstructions: Record<ToneStyle, string> = {
    professional: 'Rewrite this message to sound professional and formal.',
    friendly: 'Rewrite this message to sound warm, friendly, and approachable.',
    shorter: 'Rewrite this message to be as concise as possible while keeping the meaning.',
    direct: 'Rewrite this message to be more direct and assertive.',
    casual: 'Rewrite this message to sound casual, relaxed, and conversational.',
  }

  const prompt = `${toneInstructions[tone]}

Original message: "${text}"

Return ONLY the rewritten message. No explanation, no quotes, no prefix.`

  return callGemini(prompt)
}

// ─── Feature: Smart Actions ───────────────────────────────────────────────────

import { SmartAction } from '../types'

export async function parseSmartActions(text: string): Promise<SmartAction[]> {
  if (text.length < 5) return []

  const prompt = `Analyze this message and detect if there are any actionable intents:
- Meeting/Event (e.g. "let's meet at 5", "lunch tomorrow")
- Task/To-do (e.g. "I'll do that", "remind me to...")
- Location/Place (e.g. "at Starbucks", "near the park")

Message: "${text}"

Respond ONLY with a JSON array of objects (no markdown):
[
  { "type": "calendar", "label": "Add to Calendar", "payload": { "title": "...", "date": "..." } },
  { "type": "task",     "label": "Create Task",     "payload": { "task": "..." } },
  { "type": "map",      "label": "View on Map",     "payload": { "location": "..." } }
]

If no intents found, return an empty array [].`

  try {
    const raw = await callGemini(prompt)
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as SmartAction[]
  } catch (error) {
    console.error('Gemini Smart Action parsing failed, using mock fallback:', error)
    
    // Premium Mock Fallback for Demo Purposes
    const actions: SmartAction[] = []
    const lower = text.toLowerCase()
    
    if (lower.includes('meet') || lower.includes('appointment') || lower.includes('call at')) {
      actions.push({ 
        type: 'calendar', 
        label: 'Add to Calendar', 
        payload: { event: 'Meeting', time: 'Detected' } 
      })
    }
    
    if (lower.includes('starbucks') || lower.includes('park') || lower.includes('office') || lower.includes('street')) {
      actions.push({ 
        type: 'map', 
        label: 'View on Map', 
        payload: { location: 'Detected' } 
      })
    }
    
    if (lower.includes('todo') || lower.includes('finish') || lower.includes('report') || lower.includes('send')) {
      actions.push({ 
        type: 'task', 
        label: 'Create Task', 
        payload: { task: 'Follow up' } 
      })
    }

    if (lower.includes('http') || lower.includes('.com') || lower.includes('.io')) {
        actions.push({ 
          type: 'link', 
          label: 'Open Link', 
          payload: { url: 'Detected' } 
        })
      }
    
    return actions
  }
}
