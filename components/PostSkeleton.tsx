import React, { useState, useEffect } from 'react';

const PostSkeleton: React.FC = () => {
    const [isBlurPhase, setIsBlurPhase] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlurPhase(true);
        }, 750); // Duration of the pulse animation before switching to blur

        return () => clearTimeout(timer);
    }, []);

    const containerClasses = isBlurPhase
        ? "bg-gray-50 dark:bg-[#15181d] rounded-xl overflow-hidden shadow-sm dark:shadow-none p-4 filter blur-sm opacity-80 transition-all duration-500"
        : "bg-gray-50 dark:bg-[#15181d] rounded-xl overflow-hidden shadow-sm dark:shadow-none p-4 animate-pulse";
    
    const elementClass = "bg-gray-200 dark:bg-gray-700";

    return (
        <div className="m-2">
            <div className={containerClasses}>
                <div className="flex space-x-3">
                    <div className={`w-12 h-12 rounded-full ${elementClass}`}></div>
                    <div className="flex-1 space-y-2 py-1">
                        <div className={`h-4 rounded w-3/4 ${elementClass}`}></div>
                        <div className={`h-3 rounded w-1/2 ${elementClass}`}></div>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <div className={`h-4 rounded ${elementClass}`}></div>
                    <div className={`h-4 rounded w-5/6 ${elementClass}`}></div>
                </div>
                <div className={`aspect-[1080/1350] mt-4 rounded-lg ${elementClass}`}></div>
            </div>
        </div>
    );
};

export default PostSkeleton;