import * as React from 'react';
import { X, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { locationData } from '../data/locationData';

interface InviteUserModalProps {
    onClose: () => void;
    onInvite: (data: any) => Promise<void>;
}

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-bold text-[var(--drip-muted)]/80 dark:text-neutral-400 mb-2 ml-1">{label}</label>
        {children}
    </div>
);

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvite }) => {
    const { t, language: currentLang } = useLanguage();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [selectedCountry, setSelectedCountry] = React.useState<string>(locationData.countries[0].name);

    const [formData, setFormData] = React.useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        country: locationData.countries[0].name,
        company: '',
        language: currentLang,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'country') setSelectedCountry(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onInvite(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Invitation failed');
            setIsLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white placeholder:text-[var(--drip-muted)]/40 transition-all backdrop-blur-sm shadow-inner hover:bg-white/20";

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="ios-glass p-0 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative overflow-hidden border border-white/20 animate-scale-in" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('admin.inviteUser')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </header>
                <form onSubmit={handleSubmit}>
                    <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20">{error}</div>}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.firstName')}><input name="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} required placeholder="Name" /></FormField>
                            <FormField label={t('contacts.lastName')}><input name="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} required placeholder="Surname" /></FormField>
                        </div>

                        <FormField label={t('contacts.email')}><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} required placeholder="user@company.com" /></FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.phone')}><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} required placeholder="+90..." /></FormField>
                            <FormField label={t('contacts.role')}><input name="position" value={formData.position} onChange={handleChange} className={inputClass} required placeholder="Manager, Editor..." /></FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.country')}>
                                <select name="country" value={formData.country} onChange={handleChange} className={inputClass}>
                                    {locationData.countries.map(c => <option key={c.name} value={c.name} className="bg-white dark:bg-neutral-800">{c.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Language">
                                <select name="language" value={formData.language} onChange={handleChange} className={inputClass}>
                                    <option value="tr" className="bg-white dark:bg-neutral-800">Türkçe</option>
                                    <option value="en" className="bg-white dark:bg-neutral-800">English</option>
                                </select>
                            </FormField>
                        </div>
                    </main>
                    <footer className="p-6 flex justify-end items-center gap-4 border-t border-white/10 bg-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white/10 text-[var(--drip-text)] dark:text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/10">
                            {t('actions.cancel')}
                        </button>
                        <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                            {isLoading ? '...' : <><Send size={18} /> {t('actions.send')}</>}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default InviteUserModal;
