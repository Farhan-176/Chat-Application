import { useMemo } from 'react'
import { Message } from '../types'
import './MoodCore.css'

interface MoodCoreProps {
    messages: Message[]
}

const MOOD_COLORS: Record<string, string> = {
    joy: '#fbbf24',       // Amber/Gold
    excitement: '#10b981', // Emerald
    calm: '#0ea5e9',      // Sky Blue
    sadness: '#8b5cf6',   // Violet/Purple
    anger: '#ef4444',     // Red
    neutral: '#94a3b8',   // Slate
}

const MOOD_WEIGHTS: Record<string, number> = {
    joy: 1,
    excitement: 1.2,
    calm: 0.8,
    sadness: 0.5,
    anger: 1.5,
    neutral: 0.6,
}

export const MoodCore = ({ messages }: MoodCoreProps) => {
    const coreState = useMemo(() => {
        if (messages.length === 0) {
            return { color: MOOD_COLORS.neutral, intensity: 1, label: 'Quiet' }
        }

        // Look at last 15 messages (newest first in this array)
        const relevantMessages = messages.slice(0, 15)
        const moodCounts: Record<string, number> = {}
        let totalWeight = 0

        relevantMessages.forEach(msg => {
            const mood = msg.mood || 'neutral'
            moodCounts[mood] = (moodCounts[mood] || 0) + 1
            totalWeight += MOOD_WEIGHTS[mood] || 0.6
        })

        // Find dominant mood - Tie-break towards emotional moods
        let dominantMood = 'neutral'
        let maxWeight = 0
        Object.entries(moodCounts).forEach(([mood, count]) => {
            const weight = count * (mood === 'neutral' ? 1 : 1.5) // Bias towards active moods
            if (weight >= maxWeight) {
                maxWeight = weight
                dominantMood = mood
            }
        })

        // Intensity based on message density and weights
        const avgWeight = totalWeight / relevantMessages.length
        const intensity = Math.min(2, Math.max(0.5, avgWeight))

        return {
            color: MOOD_COLORS[dominantMood],
            intensity,
            label: dominantMood.charAt(0).toUpperCase() + dominantMood.slice(1)
        }
    }, [messages])

    return (
        <div className="mood-core-container">
            <div className="mood-core-header">
                <h3>Room Heartbeat</h3>
                <span className="mood-status-label">{coreState.label} Vibe</span>
            </div>

            <div className="mood-core-visualizer">
                <div
                    className="mood-orb-outer"
                    style={{
                        '--orb-color': coreState.color,
                        '--pulse-duration': `${2 / coreState.intensity}s`
                    } as any}
                >
                    <div className="mood-orb-inner">
                        <div className="mood-orb-plasma"></div>
                    </div>
                    <div className="mood-aura"></div>
                </div>
            </div>

            <div className="mood-core-stats">
                <div className="stat-line">
                    <span>Pulse Intensity</span>
                    <div className="intensity-bar">
                        <div
                            className="intensity-fill"
                            style={{ width: `${(coreState.intensity / 2) * 100}%`, backgroundColor: coreState.color }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
