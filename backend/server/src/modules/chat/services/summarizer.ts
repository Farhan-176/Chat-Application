import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null
let model: any = null

function getModel() {
    if (!model) {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey || apiKey === 'your-gemini-api-key-here') {
            return null
        }
        genAI = new GoogleGenerativeAI(apiKey)
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    }
    return model
}

/**
 * Generates a concise summary of the provided messages.
 */
export async function summarizeRoom(messages: any[]): Promise<string> {
    try {
        const geminiModel = getModel()
        if (!geminiModel) {
            return "AI Summary is currently unavailable (API key not set)."
        }

        if (messages.length === 0) {
            return "No messages to summarize yet."
        }

        // Prepare the chat history for Gemini
        const history = messages
            .map(m => `${m.displayName}: ${m.text}`)
            .join('\n')

        const prompt = `Summarize the following chat conversation into 2-3 concise sentences. Focus on the main topics and any decisions made.
        
        Chat History:
        ${history}
        
        Summary:`

        const result = await geminiModel.generateContent(prompt)
        return result.response.text().trim()

    } catch (error) {
        console.error('Error generating room summary:', error)
        return "Failed to generate summary. Please try again later."
    }
}

