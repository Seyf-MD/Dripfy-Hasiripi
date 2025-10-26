// FIX: Implemented the main App component to structure the application, manage state, and render UI components.
import React, { useState } from 'react';
import Header from './components/Header';
import StatCards from './components/StatCards';
import TabNavigation from './components/TabNavigation';
import WeeklyScheduleTab from './components/tabs/WeeklyScheduleTab';
import FinancialsTab from './components/tabs/FinancialsTab';
import ChallengesTab from './components/tabs/ChallengesTab';
import ContactsTab from './components/tabs/ContactsTab';
import TasksTab from './components/tabs/TasksTab';
import AdminPanelTab from './components/tabs/AdminPanelTab';
import Chatbot from './components/Chatbot';
import LoginPage from './components/LoginPage';

import { scheduleData, financialData, challengesAndAdvantages, contactsData, tasksData } from './data/mockData';

const tabComponents: { [key: string]: React.FC<any> } = {
    'Weekly Schedule': WeeklyScheduleTab,
    'Financials': FinancialsTab,
    'Challenges': ChallengesTab,
    'Contacts': ContactsTab,
    'Tasks': TasksTab,
    'Admin Panel': AdminPanelTab,
};

const dataForTab: { [key: string]: any } = {
    'Weekly Schedule': scheduleData,
    'Financials': financialData,
    'Challenges': challengesAndAdvantages,
    'Contacts': contactsData,
    'Tasks': tasksData,
    'Admin Panel': { info: 'Admin panel data is not available for AI analysis.' },
};

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('Weekly Schedule');

    const ActiveTabComponent = tabComponents[activeTab];
    const currentDataContext = dataForTab[activeTab];
    
    if (!isLoggedIn) {
        return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
    }

    return (
        <div className="bg-neutral-900 text-white min-h-screen font-sans">
            <div className="container mx-auto p-6 lg:p-8">
                <Header />
                <main className="mt-8">
                    <StatCards />
                    <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
                    <div className="mt-6">
                        <ActiveTabComponent data={currentDataContext} />
                    </div>
                </main>
            </div>
            <Chatbot dataContext={currentDataContext} />
        </div>
    );
};

export default App;
