import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Message } from './VaultChat';

interface MessageGroup {
  senderId: string;
  senderName: string;
  messages: Message[];
  isMe: boolean;
}

export const VaultMessageList: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    if (messages.length === 0) return groups;

    let currentGroup: MessageGroup = {
      senderId: messages[0].senderId,
      senderName: messages[0].senderName,
      messages: [messages[0]],
      isMe: messages[0].senderId === 'me'
    };

    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];
      const prevMsg = messages[i - 1];
      
      const timeDiff = (msg.timestamp - prevMsg.timestamp) / 1000 / 60; // diff in minutes

      if (msg.senderId === currentGroup.senderId && timeDiff < 5) {
        currentGroup.messages.push(msg);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          senderId: msg.senderId,
          senderName: msg.senderName,
          messages: [msg],
          isMe: msg.senderId === 'me'
        };
      }
    }
    groups.push(currentGroup);
    return groups;
  }, [messages]);

  return (
    <Virtuoso
      style={{ height: '100%', width: '100%' }}
      data={groupedMessages}
      initialTopMostItemIndex={groupedMessages.length - 1}
      followOutput="smooth"
      itemContent={(index, group) => (
        <div className={`message-group ${group.isMe ? 'me' : 'them'}`}>
          {!group.isMe && (
            <div className="group-avatar">
              {group.senderName.charAt(0)}
            </div>
          )}
          <div className="group-content">
            {group.messages.map((msg, mIndex) => (
              <div 
                key={msg.id} 
                className={`message-block ${msg.status === 'sending' ? 'sending' : ''}`}
              >
                <div className="message-text">{msg.text}</div>
                {mIndex === group.messages.length - 1 && (
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    />
  );
};
