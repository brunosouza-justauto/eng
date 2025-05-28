import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';

export interface Message {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
}

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

/**
 * Component to display the chat history with auto-scrolling
 */
const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          isAI={message.isAI}
          content={message.content}
          timestamp={message.timestamp}
        />
      ))}
      
      {isLoading && (
        <ChatMessage
          isAI={true}
          content=""
          timestamp={new Date()}
          isLoading={true}
        />
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;
