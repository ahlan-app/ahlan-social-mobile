
import React, { useState, useMemo } from 'react';
import { flagData } from './FlagContent';
import { SearchIcon, XIcon } from './Icons';

interface FlagPickerProps {
    onFlagSelected: (flagTextCode: string) => void;
    onClose: () => void;
}

const FlagPicker: React.FC<FlagPickerProps> = ({ onFlagSelected, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFlags = useMemo(() => {
        const query = searchTerm.toLowerCase();
        if (!query) return flagData;
        return flagData.filter(flag => flag.name.toLowerCase().includes(query));
    }, [searchTerm]);

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 rounded-t-2xl shadow-xl h-[70vh] w-full flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-8"></div> {/* Spacer */}
                        <h2 className="text-lg font-bold text-white text-center">Add a Flag</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for a flag..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <SearchIcon />
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {filteredFlags.length > 0 ? (
                        <ul>
                            {filteredFlags.map(flag => {
                                const FlagComponent = flag.component;
                                return (
                                    <li key={flag.textCode}>
                                        <button 
                                            onClick={() => onFlagSelected(flag.textCode)}
                                            className="w-full flex items-center space-x-4 p-3 hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="w-12 h-8 flex items-center justify-center flex-shrink-0">
                                                <div style={{ width: '35px', height: '20px' }}><FlagComponent /></div>
                                            </div>
                                            <span className="text-white font-medium">{flag.name}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-8">No flags found.</p>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default FlagPicker;
