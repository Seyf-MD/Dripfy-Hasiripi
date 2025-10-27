import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader, Sparkles, RefreshCcw } from 'lucide-react';
import { streamDashboardInsights } from '../services/geminiService';
import { useLanguage } from '../i18n/LanguageContext';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatbotProps {
    dataContext: any;
}

// Simple markdown renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
    const renderContent = () => {
        let html = content.replace(/\n/g, '<br />'); // Handle newlines
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        html = html.replace(/- (.*?)(<br \/>|$)/g, '<li>$1</li>'); // List items
        if (html.includes('<li>')) {
            html = `<ul>${html}</ul>`.replace(/<\/li><br \/>/g, '</li>');
        }
        return { __html: html };
    };

    return <div dangerouslySetInnerHTML={renderContent()} className="prose prose-sm max-w-none prose-strong:text-white" />;
};


const Chatbot: React.FC<ChatbotProps> = ({ dataContext }) => {
  const { t } = useLanguage();
  
  const initialMessage: Message = { 
    role: 'model', 
    content: t('chatbot.initialMessage')
  };

  const examplePrompts = [
    t('chatbot.prompt1'),
    t('chatbot.prompt2'),
    t('chatbot.prompt3'),
    t('chatbot.prompt4'),
  ]
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
     setMessages([initialMessage]);
  }, [t])

  useEffect(() => {
    if (isOpen) {
        setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (prompt?: string) => {
    const currentInput = prompt || input;
    if (currentInput.trim() === '' || isLoading) return;

    const userMessage: Message = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
        const stream = streamDashboardInsights(currentInput, dataContext);
        for await (const chunk of stream) {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content += chunk;
                return newMessages;
            });
        }
    } catch (error) {
         console.error("Error streaming response:", error);
         setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = t('chatbot.error');
            return newMessages;
         });
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };
  
  const handleClearChat = () => {
      setMessages([initialMessage]);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-[#32ff84] text-black p-4 rounded-full shadow-lg shadow-green-500/20 hover:scale-105 transition-transform"
        aria-label={t('chatbot.toggle')}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 w-full max-w-sm h-[70vh] max-h-[600px] bg-neutral-900 rounded-xl shadow-2xl flex flex-col border border-neutral-700 overflow-hidden animate-fade-in-up">
          <header className="p-4 bg-neutral-800/50 border-b border-neutral-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#32ff84] to-green-400 flex items-center justify-center text-black">
                    <Bot size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-white">{t('chatbot.header')}</h3>
                    <p className="text-xs text-neutral-400">{t('chatbot.subtitle')}</p>
                </div>
            </div>
            <button onClick={handleClearChat} className="text-neutral-400 hover:text-white transition-colors" aria-label={t('chatbot.clear')}>
                <RefreshCcw size={16} />
            </button>
          </header>
          
          <div className="flex-1 p-4 overflow-y-auto bg-neutral-900">
            <div className="flex flex-col gap-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Bot size={18} className="text-neutral-300"/>
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm leading-6 ${msg.role === 'user' ? 'bg-neutral-700 text-white rounded-br-none' : 'bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-bl-none'}`}>
                    {msg.role === 'model' && index === messages.length - 1 && isLoading && msg.content === '' 
                        ? <Loader className="animate-spin text-neutral-400" size={20}/>
                        : <MarkdownRenderer content={msg.content} />
                    }
                  </div>
                   {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-neutral-300"/>
                    </div>
                  )}
                </div>
              ))}
              {messages.length === 1 && !isLoading && (
                  <div className="flex flex-col gap-2 items-start mt-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                          <Sparkles size={16} className="text-[#32ff84]"/>
                          <span>{t('chatbot.examplePrompts')}</span>
                      </div>
                      {examplePrompts.map(prompt => (
                        <button key={prompt} onClick={() => handleSend(prompt)} className="w-full text-left text-sm text-green-300 bg-green-500/10 hover:bg-green-500/20 p-2 rounded-md transition-colors">
                            "{prompt}"
                        </button>
                      ))}
                  </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <div className="p-4 border-t border-neutral-700 bg-neutral-800/50">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatbot.placeholder')}
                className="w-full pl-4 pr-12 py-2 bg-neutral-800 border border-neutral-600 rounded-full focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-white placeholder:text-neutral-500"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#32ff84] text-black p-2 rounded-full hover:bg-green-400 disabled:bg-neutral-600 transition-colors"
                disabled={isLoading}
                aria-label={t('chatbot.send')}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;