import * as React from 'react';
import { Challenge, Advantage } from '../../types';
import { PlusCircle, AlertTriangle, AlertOctagon, Info, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ChallengesTabProps {
    challenges: Challenge[];
    advantages: Advantage[];
    canEditChallenges: boolean;
    canEditAdvantages: boolean;
    onOpenModal: (item: Challenge | Advantage | Partial<Challenge> | Partial<Advantage>, type: 'challenges' | 'advantages', isNew?: boolean) => void;
    onUpdateChallenge: (itemId: string, field: keyof Challenge, value: any) => void;
    onUpdateAdvantage: (itemId: string, field: keyof Advantage, value: any) => void;
}

// FIX: Replaced `JSX.Element` with `React.ReactNode` to resolve the "Cannot find namespace 'JSX'" error.
// `React.ReactNode` is available via the `React` import and is a suitable type for React components.
const severityStyles: { [key in Challenge['severity']]: { icon: React.ReactNode, tagBg: string, textColor: string, borderColor: string, glow: string } } = {
    High: {
        icon: <AlertOctagon size={20} className="text-red-500 dark:text-red-400" />,
        tagBg: 'bg-red-500/10',
        textColor: 'text-red-500 dark:text-red-400',
        borderColor: 'border-red-500/30 dark:border-red-500/50',
        glow: 'hover:shadow-lg hover:shadow-red-900/40'
    },
    Medium: {
        icon: <AlertTriangle size={20} className="text-yellow-500 dark:text-yellow-400" />,
        tagBg: 'bg-yellow-500/10',
        textColor: 'text-yellow-500 dark:text-yellow-400',
        borderColor: 'border-yellow-500/30 dark:border-yellow-500/50',
        glow: 'hover:shadow-lg hover:shadow-yellow-900/40'
    },
    Low: {
        icon: <Info size={20} className="text-blue-500 dark:text-blue-400" />,
        tagBg: 'bg-blue-500/10',
        textColor: 'text-blue-500 dark:text-blue-400',
        borderColor: 'border-blue-500/30 dark:border-blue-500/50',
        glow: 'hover:shadow-lg hover:shadow-blue-900/40'
    },
};

const ChallengesTab: React.FC<ChallengesTabProps> = ({ challenges, advantages, canEditChallenges, canEditAdvantages, onOpenModal, onUpdateChallenge, onUpdateAdvantage }) => {
    const { t } = useLanguage();
    const [editingItem, setEditingItem] = React.useState<{ type: 'challenge' | 'advantage', id: string, field: 'title' | 'description' } | null>(null);

    const inputClasses = "w-full bg-neutral-200 dark:bg-neutral-700 border-transparent focus:bg-neutral-300 dark:focus:bg-neutral-600 rounded p-1 text-sm focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-black dark:text-white";

    const handleCellClick = (e: React.MouseEvent, type: 'challenge' | 'advantage', id: string, field: 'title' | 'description') => {
        e.stopPropagation();
        if (type === 'challenge' && canEditChallenges) {
            setEditingItem({ type, id, field });
        } else if (type === 'advantage' && canEditAdvantages) {
            setEditingItem({ type, id, field });
        }
    };

    const handleUpdate = (type: 'challenge' | 'advantage', id: string, field: 'title' | 'description', value: any) => {
        if (type === 'challenge') {
            onUpdateChallenge(id, field, value);
        } else {
            onUpdateAdvantage(id, field, value);
        }
        setEditingItem(null);
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Challenges Column */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-yellow-500 dark:text-yellow-300"><AlertTriangle /> {t('challenges.title')}</h2>
                    {canEditChallenges && (
                        <button onClick={() => onOpenModal({ title: '', description: '', severity: 'Medium'}, 'challenges', true)} className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 text-sm font-semibold rounded-lg hover:bg-yellow-500/20 transition-colors">
                            <PlusCircle size={16}/> {t('challenges.add')}
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {challenges.map((challenge, index) => {
                        const styles = severityStyles[challenge.severity];
                        return (
                            <div
                                key={challenge.id}
                                onClick={() => editingItem ? null : onOpenModal(challenge, 'challenges')}
                                className={`bg-white dark:bg-neutral-800 p-4 rounded-lg border ${styles.borderColor} flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 ${styles.glow} animate-fade-in-up`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        {editingItem?.type === 'challenge' && editingItem.id === challenge.id && editingItem.field === 'title' ? (
                                            <input type="text" defaultValue={challenge.title} onBlur={(e) => handleUpdate('challenge', challenge.id, 'title', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} onClick={(e) => e.stopPropagation()} autoFocus className={`${inputClasses} font-semibold mb-1`} />
                                        ) : (
                                            <h3 onClick={(e) => handleCellClick(e, 'challenge', challenge.id, 'title')} className="font-semibold text-black dark:text-white leading-tight">{challenge.title}</h3>
                                        )}

                                        {editingItem?.type === 'challenge' && editingItem.id === challenge.id && editingItem.field === 'description' ? (
                                            <textarea defaultValue={challenge.description} onBlur={(e) => handleUpdate('challenge', challenge.id, 'description', e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus rows={2} className={`${inputClasses} mt-1`} />
                                        ) : (
                                            <p onClick={(e) => handleCellClick(e, 'challenge', challenge.id, 'description')} className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{challenge.description}</p>
                                        )}
                                    </div>
                                     <div className={`p-2 rounded-lg ${styles.tagBg} flex-shrink-0`}>
                                        {styles.icon}
                                    </div>
                                </div>
                                <div className={`mt-3 text-xs font-semibold px-2 py-1 rounded-full self-start ${styles.tagBg} ${styles.textColor}`}>
                                    {t(`challenges.severities.${challenge.severity.toLowerCase()}`)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Advantages Column */}
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-green-500 dark:text-green-300"><Sparkles /> {t('advantages.title')}</h2>
                    {canEditAdvantages && (
                        <button onClick={() => onOpenModal({ title: '', description: ''}, 'advantages', true)} className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-300 text-sm font-semibold rounded-lg hover:bg-green-500/20 transition-colors">
                           <PlusCircle size={16}/> {t('advantages.add')}
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {advantages.map((advantage, index) => (
                         <div
                            key={advantage.id}
                            onClick={() => editingItem ? null : onOpenModal(advantage, 'advantages')}
                            className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-green-500/30 dark:border-green-500/50 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-900/40 animate-fade-in-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                 {editingItem?.type === 'advantage' && editingItem.id === advantage.id && editingItem.field === 'title' ? (
                                    <input type="text" defaultValue={advantage.title} onBlur={(e) => handleUpdate('advantage', advantage.id, 'title', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} onClick={(e) => e.stopPropagation()} autoFocus className={`${inputClasses} font-semibold mb-1`} />
                                ) : (
                                    <h3 onClick={(e) => handleCellClick(e, 'advantage', advantage.id, 'title')} className="font-semibold text-black dark:text-white leading-tight">{advantage.title}</h3>
                                )}

                                {editingItem?.type === 'advantage' && editingItem.id === advantage.id && editingItem.field === 'description' ? (
                                    <textarea defaultValue={advantage.description} onBlur={(e) => handleUpdate('advantage', advantage.id, 'description', e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus rows={2} className={`${inputClasses} mt-1`} />
                                ) : (
                                    <p onClick={(e) => handleCellClick(e, 'advantage', advantage.id, 'description')} className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{advantage.description}</p>
                                )}
                              </div>
                              <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                                <Sparkles size={20} className="text-green-500 dark:text-green-400" />
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChallengesTab;