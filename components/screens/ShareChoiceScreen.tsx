// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
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

import React from 'react';
import { XIcon, PlusCircleIcon, PencilAltIcon } from '../Icons';

interface ShareChoiceScreenProps {
    mediaSrc: string;
    onClose: () => void;
    onChoose: (choice: 'story' | 'post') => void;
}

const ShareChoiceScreen: React.FC<ShareChoiceScreenProps> = ({ mediaSrc, onClose, onChoose }) => {
    
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
            <button
                onClick={onClose}
                className="absolute right-4 text-white bg-black/50 p-2 rounded-full z-10"
                style={{ top: 'calc(1rem + var(--safe-area-inset-top))' }}
            >
                <XIcon className="w-6 h-6" />
            </button>
            
            <div className="w-full max-w-md aspect-[9/16] rounded-xl overflow-hidden flex items-center justify-center bg-gray-900">
                <img src={mediaSrc} alt="Shared content preview" className="w-full h-full object-contain" />
            </div>
            
            <div className="mt-8 w-full max-w-md flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <button 
                    onClick={() => onChoose('story')}
                    className="flex-1 flex flex-col items-center justify-center space-y-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-4 rounded-xl transition-colors duration-200"
                >
                    <PlusCircleIcon />
                    <span>Share as Story</span>
                </button>
                <button 
                    onClick={() => onChoose('post')}
                    className="flex-1 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl transition-colors duration-200"
                >
                    <PencilAltIcon />
                    <span>Share as Post</span>
                </button>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ShareChoiceScreen;