import React from 'react';
import { FiUser, FiCpu } from 'react-icons/fi';

export interface ChatMessageProps {
  isAI: boolean;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

/**
 * Component to display a single chat message from either the user or AI
 */
const ChatMessage: React.FC<ChatMessageProps> = ({ isAI, content, timestamp, isLoading = false }) => {
  return (
    <div className={`flex mb-4 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div 
        className={`flex max-w-3xl ${
          isAI 
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-left' 
            : 'bg-green-100 dark:bg-green-900/30 text-left'
        } rounded-lg px-4 py-3 shadow-sm`}
      >
        <div className="flex-shrink-0 mr-3 mt-1">
          {isAI ? (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <FiCpu />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
              <FiUser />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
              {isAI ? 'AI Assistant' : 'You'}
            </span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full mr-1 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              content
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
