import * as React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { DashboardData } from '../types';
import ChatbotPanel from './ChatbotPanel';

interface ChatbotProps {
  dataContext: { activeView: string } & DashboardData;
}

const Chatbot: React.FC<ChatbotProps> = ({ dataContext }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        data-tour-target="dashboard-chatbot-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 bg-[var(--drip-primary)] text-white p-4 rounded-full shadow-lg shadow-[rgba(75,165,134,0.35)] hover:scale-105 transition-transform z-50"
        aria-label={t('chatbot.toggle')}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 w-full max-w-lg h-[75vh] max-h-[640px] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-neutral-700 overflow-hidden animate-fade-in-up z-50">
          <ChatbotPanel
            dataContext={dataContext}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
};

export default Chatbot;
