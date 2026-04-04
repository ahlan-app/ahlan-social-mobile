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