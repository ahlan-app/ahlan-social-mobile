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

import React, { useState, useEffect } from 'react';

const PostGridSkeleton: React.FC = () => {
    const [showBlurPreview, setShowBlurPreview] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowBlurPreview(true);
        }, 750);

        return () => clearTimeout(timer);
    }, []);

    const baseClass = "aspect-square rounded-sm";
    const phase1Class = "bg-gray-200 dark:bg-gray-800 animate-pulse";
    const phase2Class = "bg-gray-200 dark:bg-gray-800 filter blur-sm opacity-80 transition-all duration-500";

    return (
        <div className="p-1">
            <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={`${baseClass} ${showBlurPreview ? phase2Class : phase1Class}`}></div>
                ))}
            </div>
        </div>
    );
};

export default PostGridSkeleton;