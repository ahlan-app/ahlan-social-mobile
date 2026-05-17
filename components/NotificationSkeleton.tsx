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

import React, { useState, useEffect } from 'react';

const NotificationSkeleton: React.FC = () => {
    const [isBlurPhase, setIsBlurPhase] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlurPhase(true);
        }, 750); // Duration before switching to blur preview
        return () => clearTimeout(timer);
    }, []);

    const containerClasses = `w-full transition-all duration-500 ${isBlurPhase ? 'filter blur-sm opacity-80' : 'animate-pulse'}`;
    const elementClass = "bg-gray-200 dark:bg-gray-800";
    
    const SkeletonItem: React.FC = () => (
        <div className="flex items-start space-x-3 p-4">
            <div className={`w-10 h-10 rounded-full ${elementClass} flex-shrink-0`}></div>
            <div className="flex-1 space-y-2">
                <div className={`h-4 rounded w-3/4 ${elementClass}`}></div>
                <div className={`h-3 rounded w-1/2 ${elementClass}`}></div>
            </div>
            <div className={`w-12 h-12 rounded-md ${elementClass} flex-shrink-0`}></div>
        </div>
    );

    return (
        <div className={containerClasses}>
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border-b border-gray-200 dark:border-gray-800">
                    <SkeletonItem />
                </div>
            ))}
        </div>
    );
};

export default NotificationSkeleton;
