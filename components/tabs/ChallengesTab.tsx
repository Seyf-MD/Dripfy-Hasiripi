// FIX: Implemented the ChallengesTab component to display challenges and advantages.
import React from 'react';
import { Challenge, Advantage } from '../../types';
import { ShieldAlert, Zap } from 'lucide-react';

const tagColorStyles: { [key: string]: { bg: string; text: string } } = {
  red: { bg: 'bg-red-500/20', text: 'text-red-300' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  green: { bg: 'bg-green-500/20', text: 'text-green-300' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-300' },
};

const Card: React.FC<{ item: Challenge | Advantage }> = ({ item }) => (
    <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 mb-3 transition-all duration-300 hover:border-[#32ff84]/50 hover:shadow-lg hover:shadow-black/20">
        <h4 className="font-semibold text-white">{item.title}</h4>
        <p className="text-sm text-neutral-400 mt-1">{item.description}</p>
        <div className="flex flex-wrap gap-2 mt-3">
            {item.tags.map(tag => (
                <span key={tag.text} className={`px-2 py-1 text-xs rounded-full ${tagColorStyles[tag.color]?.bg || 'bg-gray-500/20'} ${tagColorStyles[tag.color]?.text || 'text-gray-300'}`}>
                    {tag.text}
                </span>
            ))}
        </div>
    </div>
);

const ChallengesTab: React.FC<{ data: { challenges: Challenge[]; advantages: Advantage[] } }> = ({ data }) => {
    if (!data) return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><ShieldAlert className="text-red-400" /> Challenges</h3>
                {data.challenges.map(item => <Card key={item.id} item={item} />)}
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Zap className="text-green-400" /> Advantages</h3>
                {data.advantages.map(item => <Card key={item.id} item={item} />)}
            </div>
        </div>
    );
};

export default ChallengesTab;
