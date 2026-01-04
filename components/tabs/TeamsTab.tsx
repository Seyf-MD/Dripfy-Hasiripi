import * as React from 'react';
import { Team, Contact } from '../../types';
import { Users, PlusCircle, X, User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TeamsTabProps {
    data: Team[];
    contacts: Contact[];
    canEdit: boolean;
    onOpenModal: (item: Team | Partial<Team>, type: 'teams', isNew?: boolean) => void;
    onUpdate: (itemId: string, field: keyof Team, value: any) => void;
    onDelete: (itemId: string) => void;
}

const TeamsTab: React.FC<TeamsTabProps> = ({ data, contacts, canEdit, onOpenModal, onUpdate, onDelete }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = React.useState('');

    const inputClasses = "w-full bg-white/10 dark:bg-neutral-800/30 border border-white/10 focus:bg-white/20 rounded-xl p-2 text-sm focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white backdrop-blur-sm transition-all";

    const filteredTeams = React.useMemo(() => {
        return data.filter(team => {
            const search = searchTerm.toLowerCase();
            const memberNames = team.memberIds
                .map(id => {
                    const contact = contacts.find(c => c.id === id);
                    return contact ? `${contact.firstName} ${contact.lastName}` : '';
                })
                .join(' ')
                .toLowerCase();
            
            return (
                team.name.toLowerCase().includes(search) ||
                (team.description && team.description.toLowerCase().includes(search)) ||
                memberNames.includes(search)
            );
        });
    }, [data, searchTerm, contacts]);

    const getContactName = (contactId: string) => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return contactId;
        return `${contact.firstName} ${contact.lastName}`.trim() || contact.email;
    };

    const handleAddNew = () => {
        onOpenModal({ name: '', memberIds: [], description: '' }, 'teams', true);
    };

    const handleRemoveMember = (teamId: string, contactId: string) => {
        const team = data.find(t => t.id === teamId);
        if (team) {
            const updatedMemberIds = team.memberIds.filter(id => id !== contactId);
            onUpdate(teamId, 'memberIds', updatedMemberIds);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-auto flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder={t('teams.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${inputClasses} px-4 py-2.5 shadow-sm`}
                    />
                </div>
                {canEdit && (
                    <button 
                        onClick={handleAddNew} 
                        className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-full shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all"
                    >
                        <PlusCircle size={18} /> {t('teams.newTeam')}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTeams.map((team) => (
                    <div
                        key={team.id}
                        onClick={() => canEdit && onOpenModal(team, 'teams')}
                        className="ios-glass ios-card p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:border-[var(--drip-primary)]/30 hover:shadow-2xl hover:-translate-y-1 relative group cursor-pointer border border-white/20"
                    >
                        {/* Gradient Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--drip-primary)]/0 to-[var(--drip-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 mr-4">
                                    <h3 className="text-lg font-bold text-[var(--drip-text)] dark:text-white truncate group-hover:text-[var(--drip-primary)] transition-colors">
                                        {team.name}
                                    </h3>
                                    {team.description && (
                                        <p className="text-sm text-[var(--drip-muted)]/70 dark:text-neutral-400 mt-1 line-clamp-2">
                                            {team.description}
                                        </p>
                                    )}
                                </div>
                                <div className="p-2.5 bg-white/10 dark:bg-white/5 rounded-2xl flex-shrink-0 backdrop-blur-md shadow-sm border border-white/10">
                                    <Users size={20} className="text-[var(--drip-primary)]" />
                                </div>
                            </div>
                            
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-[var(--drip-muted)]/80 dark:text-neutral-400 font-medium">
                                    <Users size={12} className="text-[var(--drip-accent)]" />
                                    <span>{team.memberIds.length} {t('teams.members')}</span>
                                </div>
                                
                                {team.memberIds.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-xs font-semibold text-[var(--drip-muted)]/80 dark:text-neutral-400 uppercase tracking-wide">
                                            {t('teams.teamMembers')}
                                        </p>
                                        <div className="space-y-1.5">
                                            {team.memberIds.slice(0, 3).map((contactId) => {
                                                const contact = contacts.find(c => c.id === contactId);
                                                return (
                                                    <div 
                                                        key={contactId}
                                                        className="flex items-center justify-between p-2 bg-white/5 dark:bg-black/20 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <div className="w-6 h-6 rounded-full bg-[var(--drip-primary)]/20 flex items-center justify-center flex-shrink-0">
                                                                <User size={12} className="text-[var(--drip-primary)]" />
                                                            </div>
                                                            <span className="text-xs text-[var(--drip-text)] dark:text-white truncate">
                                                                {getContactName(contactId)}
                                                            </span>
                                                        </div>
                                                        {canEdit && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveMember(team.id, contactId);
                                                                }}
                                                                className="p-1 hover:bg-red-500/20 rounded-full transition-colors flex-shrink-0 ml-2"
                                                            >
                                                                <X size={12} className="text-red-500" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {team.memberIds.length > 3 && (
                                                <p className="text-xs text-[var(--drip-muted)]/60 dark:text-neutral-500 text-center pt-1">
                                                    +{team.memberIds.length - 3} {t('teams.more')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {filteredTeams.length === 0 && (
                <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-[var(--drip-muted)]/40 dark:text-neutral-600 mb-4" />
                    <p className="text-[var(--drip-muted)] dark:text-neutral-400">
                        {searchTerm ? t('teams.noTeamsFound') : t('teams.noTeams')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default TeamsTab;

