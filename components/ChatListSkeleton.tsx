import React, { useState, useEffect } from 'react';

const ChatListSkeleton: React.FC = () => {
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
        <div className="flex items-center space-x-4 p-4">
            <div className={`w-12 h-12 rounded-full ${elementClass}`}></div>
            <div className="flex-1 space-y-3">
                <div className={`h-4 rounded w-1/3 ${elementClass}`}></div>
                <div className={`h-3 rounded w-2/3 ${elementClass}`}></div>
            </div>
        </div>
    );

    return (
        <div className={containerClasses}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-b border-gray-200 dark:border-gray-800">
                    <SkeletonItem />
                </div>
            ))}
        </div>
    );
};

export default ChatListSkeleton;
