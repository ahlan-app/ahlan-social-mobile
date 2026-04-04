import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CameraIcon, ImageIcon, XIcon, ArrowRightIcon, FlipCameraIcon, FlagIcon, ArrowLeftIcon } from '../Icons';
import { useApp } from '../../store/AppContext';
import type { Post } from '../../types';
import PostCard from '../PostCard';
import FlagPicker from '../FlagPicker';
import UserAvatar from '../UserAvatar';

interface CameraTabProps {
    onPostCreated: () => void;
    close: () => void;
}

type View = 'options' | 'capture' | 'compose' | 'denied';
type Mode = 'photo';

const CameraTab: React.FC<CameraTabProps> = ({ onPostCreated, close }) => {
    const [view, setView] = useState<View>('options');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [media, setMedia] = useState<{ url: string, type: Mode } | null>(null);
    const [caption, setCaption] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);

    const { addProfilePost, userProfile } = useApp();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // --- Camera & Media Logic ---

    const stopCamera = useCallback(() => {
        setStream(prevStream => {
            if (prevStream) {
                prevStream.getTracks().forEach(track => track.stop());
            }
            return null;
        });
    }, []);

    const startCamera = useCallback(async (facingMode: 'environment' | 'user') => {
        // FIX: The call to stopCamera() is redundant here. The useEffect that calls
        // startCamera has a cleanup function that already stops the previous stream.
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
            });
            setStream(mediaStream);
            setView('capture');
        } catch (error) {
            console.error("Error accessing camera/mic:", error);
            setView('denied');
        }
    }, [setStream, setView]);
    
    const handleFlipCamera = () => {
        const newMode = cameraFacingMode === 'user' ? 'environment' : 'user';
        setCameraFacingMode(newMode);
    };

    // The useEffect now correctly starts and stops the camera based on component state.
    useEffect(() => {
        if (view === 'capture') {
            startCamera(cameraFacingMode);
        }
        return () => stopCamera();
    }, [view, cameraFacingMode, startCamera, stopCamera]);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    
    // --- Capture & Recording ---

    const handlePhotoCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const targetAspectRatio = 1080 / 1350;
        canvas.width = 1080;
        canvas.height = 1350;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        let sx = 0, sy = 0, sWidth = videoWidth, sHeight = videoHeight;

        if (videoAspectRatio > targetAspectRatio) {
            // Video is wider than target, crop width
            sWidth = videoHeight * targetAspectRatio;
            sx = (videoWidth - sWidth) / 2;
        } else {
            // Video is taller than target, crop height
            sHeight = videoWidth / targetAspectRatio;
            sy = (videoHeight - sHeight) / 2;
        }

        // Flip image if using front camera
        if (cameraFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        setMedia({ url: imageUrl, type: 'photo' });
        setView('compose');
        stopCamera();
    }, [cameraFacingMode, stopCamera]);

    const handleShutterPress = () => {
        handlePhotoCapture();
    };

    // --- Gallery Logic ---

    const handleGalleryPick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setMedia({ url, type: 'photo' });
            setView('compose');
        }
        if(event.target) event.target.value = '';
    };

    // --- Post Creation ---

    const handleFlagSelect = (flagTextCode: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setCaption(prev => prev + flagTextCode);
            return;
        }

        const start = textarea.selectionStart ?? caption.length;
        const end = textarea.selectionEnd ?? caption.length;
        const text = caption;
        const newText = text.substring(0, start) + flagTextCode + text.substring(end);
        
        setCaption(newText);
        setFlagPickerOpen(false);

        // Focus and set cursor position after insertion
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + flagTextCode.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handlePostCreation = async () => {
        if (!media || isPosting) return;
        setIsPosting(true);

        const newPost: Post = {
            id: `post_${Date.now()}`,
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            content: caption,
            media: media.url,
            media_type: 'image',
            media_aspect_ratio: 1080 / 1350,
            likes: 0,
            reposts: 0,
            replies: 0,
            timestamp: new Date().toISOString(),
        };

        await new Promise(res => setTimeout(res, 800)); // Simulate network latency
        addProfilePost(newPost);
        onPostCreated();
    };
    
    const resetToCapture = () => {
        setMedia(null);
        setCaption('');
        setView('capture');
    };
    
    // --- Render Logic ---

    if (view === 'options') {
        return (
            <div className="flex flex-col justify-center items-center h-full w-full bg-black text-center p-8">
                <header className="absolute top-0 left-0 right-0 p-2 flex items-center justify-start z-10 safe-pt">
                    <button onClick={close} className="text-blue-400 p-2">
                        <ArrowLeftIcon className="w-8 h-8" />
                    </button>
                </header>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                <h1 className="text-2xl font-bold text-white mb-8">Create a Post</h1>
                <div className="flex flex-col space-y-4 w-full max-w-xs">
                    <button onClick={() => setView('capture')} className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full transition-colors duration-200">
                        <CameraIcon />
                        <span>Use Camera</span>
                    </button>
                    <button onClick={handleGalleryPick} className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-full transition-colors duration-200">
                        <ImageIcon />
                        <span>From Gallery</span>
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'denied') {
        return (
            <div className="flex flex-col justify-center items-center h-full w-full bg-black text-center text-red-400 p-8">
                 <p className="text-lg font-semibold">Access Denied</p>
                 <p className="mt-2">Please enable camera permissions in your browser settings.</p>
                  <button onClick={close} className="mt-6 bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                    Go Back
                  </button>
            </div>
        );
    }
    
    if (view === 'compose' && media) {
        const previewPost: Post = {
            id: 'preview_post',
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            content: caption,
            media: media.url,
            media_type: 'image',
            media_aspect_ratio: 1080 / 1350,
            likes: 0, reposts: 0, replies: 0,
        };

        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen w-screen">
                <header className="flex items-center justify-between p-2 bg-black border-b border-gray-800 z-10 flex-shrink-0 safe-pt">
                    <button onClick={resetToCapture} className="p-2 text-white"> <XIcon /> </button>
                    <h1 className="text-xl font-bold">New Post</h1>
                    <button
                        onClick={handlePostCreation}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-opacity hover:bg-blue-700 disabled:opacity-50"
                        disabled={isPosting}
                    >
                        {isPosting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Share'}
                    </button>
                </header>
                <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
                    <div className="relative flex-shrink-0">
                         <PostCard
                            post={previewPost}
                            onViewComments={() => {}}
                            onViewProfile={(username, avatar) => {}}
                            isFullScreen
                            onViewLikers={() => {}}
                            onViewReposters={() => {}}
                            onSharePost={() => {}}
                        />
                    </div>
                    <div className="flex items-start space-x-3">
                        <UserAvatar username={userProfile.username} avatarUrl={userProfile.profilePicture} className="w-10 h-10 rounded-full"/>
                        <div className="relative flex-1">
                            <textarea
                                ref={textareaRef}
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Write a caption..."
                                className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg pr-10"
                            />
                            <button 
                                onClick={() => setFlagPickerOpen(true)}
                                className="absolute bottom-1 right-1 p-1.5 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700"
                                aria-label="Add a flag"
                            >
                                <FlagIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
                {isFlagPickerOpen && (
                    <FlagPicker
                        onFlagSelected={handleFlagSelect}
                        onClose={() => setFlagPickerOpen(false)}
                    />
                )}
            </div>
        );
    }
    
    // Default: Capture View
    return (
        <div className="relative flex flex-col h-full w-full bg-black">
            <header className="absolute top-0 left-0 right-0 p-2 flex justify-between z-10 safe-pt">
                <button onClick={() => { setView('options'); stopCamera(); }} className="text-white bg-black/50 p-2 rounded-full">
                    <ArrowLeftIcon className="w-6 h-6"/>
                </button>
                <button onClick={handleFlipCamera} className="text-white bg-black/50 p-2 rounded-full">
                    <FlipCameraIcon />
                </button>
            </header>
            
            <main className="flex-1 relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                <canvas ref={canvasRef} className="hidden" />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
            </main>
            
            <footer className="w-full p-4 z-10 flex flex-col items-center safe-pb">
                <div className="flex items-center justify-around w-full max-w-sm">
                    <button onClick={handleGalleryPick} className="p-2">
                        <ImageIcon />
                    </button>
                    <button
                        onClick={handleShutterPress}
                        className="relative w-20 h-20 rounded-full bg-white/30 flex items-center justify-center"
                        aria-label="Take Photo"
                    >
                        <div className={`w-16 h-16 rounded-full transition-all duration-200 bg-white`}></div>
                    </button>
                    <div className="w-10 h-10 p-2"></div>
                </div>
                 <div className="flex items-center space-x-6 mt-4">
                    <p className={`font-bold text-lg text-white`}>PHOTO</p>
                </div>
            </footer>
        </div>
    );
};

export default CameraTab;