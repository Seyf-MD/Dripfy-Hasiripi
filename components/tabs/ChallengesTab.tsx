import React from 'react';
import { Challenge, Advantage } from '../../types';
import { ThumbsUp, AlertTriangle, PlusCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ChallengesTabProps {
    challenges: Challenge[];
    advantages: Advantage[];
    userRole: 'admin' | 'user' | null;
    onOpenModal: (item: Challenge | Advantage | Partial<Challenge> | Partial<Advantage>, type: 'challenges' | 'advantages', isNew?: boolean) => void;
}

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'High': return 'border-red-500/50';
        case 'Medium': return 'border-yellow-500/50';
        case 'Low': return 'border-blue-500/50';
        default: return 'border-neutral-700';
    }
}

const ChallengesTab: React.FC<ChallengesTabProps> = ({ challenges, advantages, userRole, onOpenModal }) => {
    const { t } = useLanguage();
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-yellow-300"><AlertTriangle /> {t('challenges.title')}</h2>
                     {userRole === 'admin' && (
                        <button onClick={() => onOpenModal({ title: '', description: '', severity: 'Medium'}, 'challenges', true)} className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-300 text-sm font-semibold rounded-lg hover:bg-yellow-500/20 transition-colors">
                            <PlusCircle size={16}/> {t('challenges.add')}
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {challenges.map(challenge => (
                        <div key={challenge.id} onClick={() => onOpenModal(challenge, 'challenges')} className={`bg-neutral-800 p-4 rounded-lg border-l-4 ${getSeverityColor(challenge.severity)} relative group cursor-pointer hover:bg-neutral-700/50 transition-colors`}>
                            <h3 className="font-semibold text-white">{challenge.title}</h3>
                            <p className="text-sm text-neutral-400 mt-1">{challenge.description}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-green-300"><ThumbsUp /> {t('advantages.title')}</h2>
                    {userRole === 'admin' && (
                        <button onClick={() => onOpenModal({ title: '', description: ''}, 'advantages', true)} className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-300 text-sm font-semibold rounded-lg hover:bg-green-500/20 transition-colors">
                           <PlusCircle size={16}/> {t('advantages.add')}
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {advantages.map(advantage => (
                         <div key={advantage.id} onClick={() => onOpenModal(advantage, 'advantages')} className="bg-neutral-800 p-4 rounded-lg border-l-4 border-green-500/50 relative group cursor-pointer hover:bg-neutral-700/50 transition-colors">
                            <h3 className="font-semibold text-white">{advantage.title}</h3>
                            <p className="text-sm text-neutral-400 mt-1">{advantage.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChallengesTab;