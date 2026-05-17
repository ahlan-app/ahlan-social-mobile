// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState, useEffect, useMemo, useRef } from 'react';

const ITEM_HEIGHT = 40; // h-10
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);
const PADDING_HEIGHT = PADDING_ITEMS * ITEM_HEIGHT;

interface WheelProps {
    items: (string | number)[];
    value: string | number;
    onChange: (newValue: string | number) => void;
    className?: string;
}

const Wheel: React.FC<WheelProps> = ({ items, value, onChange, className }) => {
    const wheelRef = useRef<HTMLDivElement>(null);
    // FIX: Replaced 'NodeJS.Timeout' with 'number' for browser compatibility as 'setTimeout' returns a number in web environments.
    const scrollTimeout = useRef<number | undefined>(undefined);
    const [isInteracting, setIsInteracting] = useState(false);
    
    const currentIndex = useMemo(() => items.findIndex(item => String(item) === String(value)), [items, value]);

    useEffect(() => {
        if (currentIndex > -1 && wheelRef.current && !isInteracting) {
            // Use smooth scrolling for a better UX when dependencies change (like day count)
            wheelRef.current.scrollTo({ top: currentIndex * ITEM_HEIGHT, behavior: 'smooth' });
        }
    }, [value, items, isInteracting, currentIndex]);

    const handleScroll = () => {
        if (wheelRef.current) {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = window.setTimeout(() => {
                if (wheelRef.current) {
                    const index = Math.round(wheelRef.current.scrollTop / ITEM_HEIGHT);
                    const newValue = items[index];
                    if (newValue !== undefined && String(newValue) !== String(value)) {
                        onChange(newValue);
                    }
                }
                setIsInteracting(false);
            }, 150);
        }
    };
    
    const handleInteractionStart = () => {
        setIsInteracting(true);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    }
    
    return (
        <div 
            className={`flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar ${className}`}
            style={{ 
                height: PICKER_HEIGHT,
                maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)'
            }}
            ref={wheelRef}
            onScroll={handleScroll}
            onTouchStart={handleInteractionStart}
            onMouseDown={handleInteractionStart}
        >
            <div style={{ height: PADDING_HEIGHT }} />
            {items.map((item, index) => {
                const isSelected = index === currentIndex;
                return (
                    <div
                        key={item}
                        className="h-10 flex items-center justify-center snap-center"
                        style={{ height: ITEM_HEIGHT }}
                    >
                        <span className={`transition-all duration-200 ${isSelected ? 'text-2xl font-bold text-white' : 'text-xl text-gray-500'}`}>
                            {item}
                        </span>
                    </div>
                );
            })}
            <div style={{ height: PADDING_HEIGHT }} />
        </div>
    );
};


const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const endYear = 2025;
const startYear = endYear - 100;
const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);


interface DatePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string) => void;
    initialDate?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ isOpen, onClose, onConfirm, initialDate }) => {
    const initial = initialDate && !isNaN(new Date(initialDate).getTime()) ? new Date(initialDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 18));
    
    const [year, setYear] = useState(initial.getUTCFullYear());
    const [month, setMonth] = useState(initial.getUTCMonth()); // 0-11
    const [day, setDay] = useState(initial.getUTCDate());

    const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
    const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    useEffect(() => {
        if (day > daysInMonth) {
            setDay(daysInMonth);
        }
    }, [daysInMonth, day]);

    const handleConfirm = () => {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onConfirm(dateString);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="date-picker-title">
            <div className="bg-[#1c1c1e] rounded-2xl w-full max-w-sm text-white shadow-lg animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700">
                    <h2 id="date-picker-title" className="text-xl font-bold text-center">Select Date</h2>
                </div>
                <div className="p-4 relative flex items-center justify-center" style={{ height: PICKER_HEIGHT }}>
                    <div className="absolute inset-x-4 h-10 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="absolute top-0 inset-x-0 h-px bg-gray-600"></div>
                        <div className="absolute bottom-0 inset-x-0 h-px bg-gray-600"></div>
                    </div>
                    
                    <Wheel items={months} value={months[month]} onChange={(m) => setMonth(months.indexOf(m as string))} className="text-center" />
                    <Wheel items={days} value={day} onChange={(d) => setDay(d as number)} className="text-center" />
                    <Wheel items={years} value={year} onChange={(y) => setYear(y as number)} className="text-center" />

                </div>
                 <div className="p-4 border-t border-gray-700 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 text-blue-400 font-semibold hover:bg-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleConfirm} className="px-4 py-2 text-blue-400 font-bold hover:bg-blue-900/50 rounded-lg">Confirm</button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-slide-up { animation: slide-up 0.25s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; } 
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default DatePicker;