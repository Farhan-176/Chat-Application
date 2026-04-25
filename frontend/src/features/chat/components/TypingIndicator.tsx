import './TypingIndicator.css'

interface TypingIndicatorProps {
    typingUsers: string[]
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
    if (typingUsers.length === 0) return null

    return (
        <div className="message-wrapper other typing-wrapper new-message">
            <div className="message-content-wrapper">
                <div className="message-bubble bubble-standalone other typing-indicator-bubble">
                    <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    )
}

