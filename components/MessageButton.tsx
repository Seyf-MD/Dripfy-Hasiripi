import * as React from 'react';
import { Mail, Plus, CheckCircle, ChevronRight, X, User as UserIcon, Shield } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';

const MessageButton: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [view, setView] = React.useState<'list' | 'detail' | 'new'>('list');
    const [activeMessage, setActiveMessage] = React.useState<Message | null>(null);
    const [newMsgContent, setNewMsgContent] = React.useState('');
    const [newMsgSubject, setNewMsgSubject] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/messages', { credentials: 'include' });
            const json = await res.json();
            if (json.ok) {
                setMessages(json.messages);
                setUnreadCount(json.messages.filter((m: Message) => !m.isRead && m.fromId !== user?.id).length);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) fetchMessages();
    };

    const handleViewMessage = async (msg: Message) => {
        setActiveMessage(msg);
        setView('detail');
        if (!msg.isRead && msg.fromId !== user?.id) {
            try {
                await fetch(`/api/messages/${msg.id}/read`, { method: 'PATCH', credentials: 'include' });
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) { console.error(err); }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Detect theme from DOM or local storage
        const isDark = document.documentElement.classList.contains('dark');
        const theme = isDark ? 'dark' : 'light';

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    toId: 'admin',
                    subject: newMsgSubject,
                    content: newMsgContent,
                    language: language,
                    theme: theme
                })
            });
            const json = await res.json();
            if (json.ok) {
                setNewMsgContent('');
                setNewMsgSubject('');
                setView('list');
                fetchMessages();
            } else {
                console.error("Message send failed:", json);
                if (res.status === 401 || res.status === 403) {
                    alert("Your session has expired or is invalid. Please log in again.");
                    // Optional: window.location.href = '/login';
                } else {
                    alert("Failed to send message: " + (json.error || "Unknown error"));
                }
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-xl text-[var(--drip-muted)] hover:text-[var(--drip-text)] hover:bg-white/10 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-[var(--drip-primary)]/50"
            >
                <Mail size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-[var(--drip-surface)] dark:border-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-white shadow-sm pointer-events-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/95 dark:bg-[#1a1a1a]/95 rounded-2xl shadow-2xl border border-neutral-200/50 dark:border-white/10 overflow-hidden flex flex-col z-[100] animate-fade-in origin-top-right backdrop-blur-xl ring-1 ring-black/5">
                    <div className="p-4 border-b border-neutral-200/50 dark:border-white/10 flex items-center gap-3 bg-white/50 dark:bg-black/20 backdrop-blur-md">
                        {view !== 'list' && (
                            <button
                                onClick={() => setView('list')}
                                className="p-1.5 -ml-1.5 rounded-lg text-[var(--drip-muted)] hover:text-[var(--drip-text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                aria-label="Back"
                            >
                                <ChevronRight className="rotate-180" size={20} />
                            </button>
                        )}
                        <h3 className="font-bold text-[var(--drip-text)] dark:text-white flex-1">
                            {view === 'list' ? 'Messages' : view === 'detail' ? 'Message' : 'New Message'}
                        </h3>
                        {view === 'list' && (
                            <button onClick={() => setView('new')} className="p-1.5 rounded-lg bg-[var(--drip-primary)]/10 text-[var(--drip-primary)] hover:bg-[var(--drip-primary)]/20 transition-colors">
                                <Plus size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 max-h-[400px] overflow-y-auto bg-transparent scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                        {view === 'list' && (
                            messages.length === 0 ? <div className="p-8 text-center text-[var(--drip-muted)] opacity-60">No messages yet.</div> :
                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                    {messages.map(msg => {
                                        const isUnread = !msg.isRead && msg.fromId !== user?.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                onClick={() => handleViewMessage(msg)}
                                                className={`p-4 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors flex gap-3 ${isUnread ? 'bg-[var(--drip-primary)]/5 dark:bg-[var(--drip-primary)]/10' : ''}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-black/5 dark:border-white/5 ${msg.fromId === 'admin' ? 'bg-[var(--drip-primary)]/10 text-[var(--drip-primary)]' : 'bg-white/50 dark:bg-white/10 text-[var(--drip-muted)]'}`}>
                                                    {msg.fromId === 'admin' ? <Shield size={18} /> : <UserIcon size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <span className={`text-xs truncate ${isUnread ? 'font-bold text-[var(--drip-primary)]' : 'font-semibold text-[var(--drip-text)] dark:text-neutral-300'}`}>
                                                                {msg.fromId === 'admin' ? 'Admin' : (msg.fromId === user?.id ? 'You' : msg.fromName || 'User')}
                                                            </span>
                                                            <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-[var(--drip-text)] dark:text-white' : 'font-medium text-[var(--drip-text)]/80 dark:text-neutral-400'}`}>
                                                                {msg.subject || 'No Subject'}
                                                            </h4>
                                                        </div>
                                                        <span className="text-[10px] text-[var(--drip-muted)] dark:text-neutral-500 opacity-60 whitespace-nowrap flex-shrink-0">{new Date(msg.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className={`text-xs line-clamp-2 ${isUnread ? 'text-[var(--drip-text)] dark:text-neutral-200' : 'text-[var(--drip-muted)] dark:text-neutral-400'}`}>{msg.content}</p>
                                                    {msg.isResolved && (
                                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-wide">
                                                            <CheckCircle size={10} /> Resolved
                                                        </div>
                                                    )}
                                                </div>
                                                {isUnread && <div className="w-2 h-2 rounded-full bg-[var(--drip-primary)] self-center flex-shrink-0 animate-pulse" />}
                                            </div>
                                        );
                                    })}
                                </div>
                        )}

                        {view === 'detail' && activeMessage && (
                            <div className="p-4 space-y-4">
                                <div>
                                    <h4 className="font-bold text-lg text-[var(--drip-text)] dark:text-white mb-1">{activeMessage.subject}</h4>
                                    <div className="flex items-center gap-2 text-xs text-[var(--drip-muted)]">
                                        <span>From: {activeMessage.fromId === 'admin' ? 'Admin' : (activeMessage.fromId === user?.id ? 'You' : activeMessage.fromName || 'User')}</span>
                                        <span>•</span>
                                        <span>{new Date(activeMessage.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm leading-relaxed text-[var(--drip-text)] dark:text-neutral-200">
                                    {activeMessage.content}
                                </div>
                                {activeMessage.isResolved && (
                                    <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-2 rounded-lg text-sm font-bold">
                                        <CheckCircle size={16} /> This issue has been marked as resolved.
                                    </div>
                                )}
                            </div>
                        )}

                        {view === 'new' && (
                            <form onSubmit={handleSendMessage} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--drip-muted)] mb-1.5">Subject</label>
                                    <input
                                        required
                                        value={newMsgSubject}
                                        onChange={e => setNewMsgSubject(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none text-sm"
                                        placeholder="Briefly describe your issue..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--drip-muted)] mb-1.5">Message</label>
                                    <textarea
                                        required
                                        value={newMsgContent}
                                        onChange={e => setNewMsgContent(e.target.value)}
                                        rows={5}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none text-sm resize-none"
                                        placeholder="Write your message here..."
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-[var(--drip-primary)]/30 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Sending...' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageButton;
