import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import ProfileDropdown from './ProfileDropdown';
import { UserRole } from '../types';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface HeaderProps {
    userRole: UserRole | null;
    onLogout: () => void;
    onOpenSettings: (tab: SettingsTab) => void;
}

const Header: React.FC<HeaderProps> = ({ userRole, onLogout, onOpenSettings }) => {
    const userName = userRole === 'admin' ? 'Admin User' : 'Demo User';
    const userEmail = userRole === 'admin' ? 'admin@dripfy.de' : 'demo@dripfy.com';

    return (
        <header className="bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-40 border-b border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                         <h1 className="text-2xl font-bold text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <ProfileDropdown 
                            userName={userName}
                            userEmail={userEmail}
                            onLogout={onLogout}
                            onOpenSettings={onOpenSettings}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
