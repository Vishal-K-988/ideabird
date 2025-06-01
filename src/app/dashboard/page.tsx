'use client';

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { saveChatToS3, getChatFromS3, listUserChats, ChatData } from "@/app/utils/s3";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

type Tone = 'None' | 'Funny' | 'Professional' | 'Inspirational' | 'Witty';
type Goal = 'None' | 'Engagement' | 'Informative' | 'Promotion';
type Audience = 'None' | 'Tech' | 'Marketing' | 'Founders' | 'General';

export default function Dashboard() {
  const { userId } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState<Tone>('None');
  const [goal, setGoal] = useState<Goal>('None');
  const [audience, setAudience] = useState<Audience>('None');
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle window resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load user's chats from S3
  useEffect(() => {
    if (userId) {
      loadUserChats();
    }
  }, [userId]);

  const loadUserChats = async () => {
    if (!userId) return;

    try {
      const chatIds = await listUserChats(userId);
      const loadedChats: Chat[] = [];

      for (const chatId of chatIds) {
        const chatData = await getChatFromS3(userId, chatId);
        if (chatData) {
          loadedChats.push({
            id: chatData.id,
            messages: chatData.messages,
            createdAt: new Date(chatData.createdAt),
            updatedAt: new Date(chatData.updatedAt),
          });
        }
      }

      setChats(loadedChats);
      if (loadedChats.length > 0) {
        setCurrentChatId(loadedChats[0].id);
      } else {
        createNewChat();
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      createNewChat();
    }
  };

  // Initialize with a new chat if none exists
  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  // Update messages when current chat changes
  useEffect(() => {
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat) {
      setMessages(currentChat.messages);
    }
  }, [currentChatId, chats]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChat.id);
    setMessages([]);
    setInput('');
    setCurrentStreamingMessage('');

    // Save new chat to S3
    if (userId) {
      saveChatToS3(userId, newChat.id, {
        ...newChat,
        createdAt: newChat.createdAt.toISOString(),
        updatedAt: newChat.updatedAt.toISOString(),
      });
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const saveChat = async (chatId: string, updatedMessages: Message[]) => {
    if (!userId) return;

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const updatedChat: Chat = {
      ...chat,
      messages: updatedMessages,
      updatedAt: new Date(),
    };

    // Update local state
    setChats(prev => prev.map(c => 
      c.id === chatId ? updatedChat : c
    ));

    // Save to S3
    try {
      await saveChatToS3(userId, chatId, {
        ...updatedChat,
        createdAt: updatedChat.createdAt.toISOString(),
        updatedAt: updatedChat.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setCurrentStreamingMessage('');

    // Save updated messages
    await saveChat(currentChatId, updatedMessages);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: input,
          tone: tone === 'None' ? null : tone,
          goal: goal === 'None' ? null : goal,
          audience: audience === 'None' ? null : audience,
          conversationHistory: messages.slice(-4) // Keep last 4 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        accumulatedMessage += text;
        setCurrentStreamingMessage(accumulatedMessage);
      }

      // Add the complete message to the chat
      const assistantMessage: Message = { role: 'assistant', content: accumulatedMessage };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setCurrentStreamingMessage('');

      // Save final messages
      await saveChat(currentChatId, finalMessages);
    } catch (error) {
      console.error('Error:', error);
      // Add error message to chat
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);
      
      // Save error state
      await saveChat(currentChatId, errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row relative">
      {/* Sidebar Toggle Button - Only visible on mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed left-4 top-20 z-50 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isSidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{
          x: isLargeScreen ? 0 : isSidebarOpen ? 0 : -320
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed lg:relative w-80 xl:w-96 bg-gray-900 p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-4rem)] lg:h-screen z-40 ${
          isSidebarOpen ? 'shadow-2xl' : ''
        }`}
        style={{
          transform: isLargeScreen ? 'none' : undefined
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Chats</h2>
          <button
            onClick={createNewChat}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-md text-sm sm:text-base hover:bg-blue-600 transition-colors"
          >
            New Chat
          </button>
        </div>
        
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                if (!isLargeScreen) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`text-left p-3 sm:p-4 rounded-md text-sm sm:text-base ${
                currentChatId === chat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {chat.messages[0]?.content.slice(0, 30) || 'New Chat'}...
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-white'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4 bg-gray-800 text-white">
                  {currentStreamingMessage}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base"
              >
                <option value="None">Tone: None</option>
                <option value="Funny">Funny</option>
                <option value="Professional">Professional</option>
                <option value="Inspirational">Inspirational</option>
                <option value="Witty">Witty</option>
              </select>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base"
              >
                <option value="None">Goal: None</option>
                <option value="Engagement">Engagement</option>
                <option value="Informative">Informative</option>
                <option value="Promotion">Promotion</option>
              </select>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base"
              >
                <option value="None">Audience: None</option>
                <option value="Tech">Tech</option>
                <option value="Marketing">Marketing</option>
                <option value="Founders">Founders</option>
                <option value="General">General</option>
              </select>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-4">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 text-white rounded-md p-3 sm:p-4 text-sm sm:text-base resize-none min-h-[44px] sm:min-h-[52px] max-h-32"
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-md text-sm sm:text-base font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
