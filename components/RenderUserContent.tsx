// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
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
import { useApp } from '../store/AppContext';
import { flagData, FlagComponent } from './FlagContent';
import { prefetchUserProfile } from '../services/apiService';

const flagMap = new Map<string, { component: FlagComponent; originalCode: string }>(
  flagData.map(f => [f.textCode.trim(), { component: f.component, originalCode: f.textCode }])
);

const flagRegexPart = `(${[...flagMap.keys()].map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`;
const mentionRegexPart = `(@[a-zA-Z0-9_]+)`;
const urlRegexPart = `(https?:\\/\\/\\S+)`;

const contentRegex = new RegExp(`${flagRegexPart}|${mentionRegexPart}|${urlRegexPart}`, 'g');

interface RenderUserContentProps {
  text: string;
  onViewProfile?: (username: string) => void;
}

const RenderUserContent: React.FC<RenderUserContentProps> = ({ text, onViewProfile }) => {
    const { addToast, userProfile } = useApp();

    if (!text) return null;
    
    const parts = text.split(contentRegex);

    return (
        <>
            {parts.filter(part => part).map((part, index) => {
                // Check for Flag
                const flagInfo = flagMap.get(part);
                if (flagInfo) {
                    const Flag = flagInfo.component;
                    return (
                        <span
                            key={index}
                            className="inline-block mx-1 align-middle"
                            style={{ width: '1.75em', height: '1em', verticalAlign: '-0.15em' }}
                        >
                            <Flag />
                        </span>
                    );
                }
                
                // Check for Mention
                if (part.startsWith('@')) {
                    const username = part.substring(1);
                    if (username === userProfile.username) {
                        return <span key={index} className="text-blue-400">{part}</span>;
                    }
                    return (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onViewProfile) {
                                    onViewProfile(username);
                                }
                            }}
                            onMouseEnter={() => prefetchUserProfile(username)}
                            className="text-blue-400 hover:underline"
                        >
                            {part}
                        </button>
                    );
                }

                // Check for URL
                if (part.startsWith('http')) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                
                // Normal text
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

export default RenderUserContent;