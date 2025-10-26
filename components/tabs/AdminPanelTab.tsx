// FIX: Implemented a placeholder AdminPanelTab component.
import React from 'react';
import { Shield } from 'lucide-react';

const AdminPanelTab: React.FC = () => {
    return (
        <div className="animate-fade-in bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center">
            <Shield size={48} className="mx-auto text-[#32ff84]" />
            <h3 className="text-2xl font-bold text-white mt-4">Admin Panel</h3>
            <p className="text-neutral-400 mt-2">This area is restricted. Advanced settings and user management options will be available here.</p>
        </div>
    );
};

export default AdminPanelTab;
