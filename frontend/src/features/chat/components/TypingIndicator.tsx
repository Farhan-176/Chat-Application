import './TypingIndicator.css'

interface TypingIndicatorProps {
    typingUsers: string[]
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
    if (typingUsers.length === 0) return null

    const text = typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : typingUsers.length === 2
            ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
            : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`

    return (
        <div className="typing-indicator-container">
            <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span className="typing-text">{text}</span>
        </div>
    )
}

