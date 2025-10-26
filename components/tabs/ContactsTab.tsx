import React from 'react';
import { Contact } from '../../types';
import { Building, User, PlusCircle } from 'lucide-react';

interface ContactsTabProps {
    data: Contact[];
    userRole: 'admin' | 'user' | null;
    onOpenModal: (item: Contact | Partial<Contact>, type: 'contacts', isNew?: boolean) => void;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ data, userRole, onOpenModal }) => {
    const handleAddNew = () => {
        onOpenModal({ name: '', role: '', type: 'Individual', email: ''}, 'contacts', true);
    }
    
    return (
        <div className="animate-fade-in">
            <div className="flex justify-end mb-4">
                {userRole === 'admin' && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        <PlusCircle size={18}/> New Contact
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.map((contact) => (
                    <div key={contact.id} onClick={() => onOpenModal(contact, 'contacts')} className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 flex flex-col justify-between transition-all duration-300 hover:border-[#32ff84]/50 hover:-translate-y-1 relative group cursor-pointer">
                        <div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{contact.name}</h3>
                                    <p className="text-sm text-neutral-400">{contact.role}</p>
                                </div>
                                <span className="p-2 bg-neutral-700 rounded-lg">
                                    {contact.type === 'Company' ? <Building size={20} className="text-orange-400" /> : <User size={20} className="text-blue-400" />}
                                </span>
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <p className="text-neutral-300 break-all">{contact.email}</p>
                                {contact.phone && <p className="text-neutral-500">{contact.phone}</p>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContactsTab;