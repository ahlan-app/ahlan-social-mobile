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

import React, { useRef, useEffect, useState } from 'react';
// @ts-ignore - react-dom types may not be installed in RN web builds
import { createPortal } from 'react-dom';
import { useApp } from '../store/AppContext';

const TooltipRenderer: React.FC = () => {
    const { tooltip, setTooltip } = useApp();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (tooltip && tooltip.target) {
            // Use a short timeout to allow the tooltip to render and get its dimensions
            // This is necessary because the content of the tooltip might change its size.
            const timer = setTimeout(() => {
                if (tooltipRef.current && tooltip.target) {
                    const targetRect = tooltip.target.getBoundingClientRect();
                    const tooltipRect = tooltipRef.current.getBoundingClientRect();
                    
                    const top = targetRect.top - tooltipRect.height;
                    const left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

                    // Prevent tooltip from going off-screen
                    const safeTop = Math.max(8, top);
                    const safeLeft = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

                    setPosition({ top: safeTop, left: safeLeft });
                    setIsVisible(true);
                }
            }, 0);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [tooltip]);

    useEffect(() => {
        const handleInteraction = (event: MouseEvent | TouchEvent) => {
            if (tooltip && tooltip.target && !tooltip.target.contains(event.target as Node)) {
                setTooltip(null);
            }
        };

        // We use mousedown/touchstart to catch the event before a potential navigation or other action
        document.addEventListener('mousedown', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);
        
        return () => {
            document.removeEventListener('mousedown', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
    }, [tooltip, setTooltip]);

    if (!tooltip) return null;

    return createPortal(
        <div 
            ref={tooltipRef} 
            style={{ 
                top: `${position.top}px`, 
                left: `${position.left}px`,
                opacity: isVisible ? 1 : 0,
            }} 
            className="fixed z-[9999] px-2 py-1 text-xs font-semibold text-white bg-gray-700 rounded-md shadow-lg transition-opacity duration-150"
            role="tooltip"
        >
            {tooltip.text}
        </div>,
        document.body
    );
};

export default TooltipRenderer;
