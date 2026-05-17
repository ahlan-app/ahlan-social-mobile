// Copyright 2026 Samet Yilmaz Temel
// SPDX-License-Identifier: Apache-2.0
//
// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CameraIcon, ImageIcon, ArrowLeftIcon, FlipCameraIcon } from '../Icons';
import { useApp } from '../../store/AppContext';
import type { Story } from '../../types';
import StoryEditorScreen from './StoryEditorScreen';
import { uploadStory } from '../../services/apiService';

interface StoryCreationScreenProps {
    close: () => void;
    initialMediaSrc?: string;
}

type View = 'options' | 'live' | 'edit' | 'denied';

function dataURLtoFile(dataurl: string, filename: string): File | null {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const match = arr[0].match(/:(.*?);/);
    if (!match) return null;
    const mime = match[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

const StoryCreationScreen: React.FC<StoryCreationScreenProps> = ({ close, initialMediaSrc }) => {
    const [view, setView] = useState<View>(initialMediaSrc ? 'edit' : 'options');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [mediaSrc, setMediaSrc] = useState<string | null>(initialMediaSrc || null);
    const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
    const { addUserStory, userProfile, replaceStory, deleteStory } = useApp();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const startCamera = useCallback(async (mode: 'environment' | 'user') => {
        stopCamera();
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: mode }
            });
            setStream(mediaStream);
            setView('live');
        } catch (error) {
            console.error(`Error accessing ${mode} camera:`, error);
            if (mode === 'environment') {
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    setStream(fallbackStream);
                    setCameraMode('user');
                    setView('live');
                } catch (fallbackError) {
                    console.error('Fallback to user camera also failed:', fallbackError);
                    setView('denied');
                }
            } else {
                setView('denied');
            }
        }
    }, [stopCamera]);

    const handleCameraFlip = () => {
        const newMode = cameraMode === 'user' ? 'environment' : 'user';
        setCameraMode(newMode);
        startCamera(newMode);
    };

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Capture the full frame from the camera, not a cropped version
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    
        // Flip image if using front camera
        if (cameraMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        setMediaSrc(imageUrl);
        setView('edit');
        stopCamera();
    }, [stopCamera, cameraMode]);

    const handleGalleryPick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target?.result as string;
                setMediaSrc(imageUrl);
                setView('edit');
            };
            reader.readAsDataURL(file);
        }
        if(event.target) event.target.value = '';
    };

    const handleShareStory = async (imageDataUrl: string) => {
        const localId = `local-${Date.now()}`;
        // Optimistic update for instant UI feedback
        const optimisticStory: Story = {
            id: localId,
            userId: userProfile.id,
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            timestamp: new Date().toISOString(),
            imageUrl: imageDataUrl,
            content: '', // Captions are burned into the image in the editor
        };
        addUserStory(optimisticStory);
        close();

        // Perform upload in the background
        try {
            const file = dataURLtoFile(imageDataUrl, `story-${Date.now()}.jpg`);
            if (!file || !userProfile.id) {
                throw new Error("Could not prepare story for upload.");
            }
            const realStory = await uploadStory(file, null, userProfile.id);
            if (realStory) {
                replaceStory(localId, realStory);
            } else {
                 throw new Error("Story upload failed on the server.");
            }
        } catch (error) {
            console.error("Failed to upload story:", error);
            // Rollback the optimistic update
            deleteStory(localId);
        }
    };
    
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (view === 'edit' && mediaSrc) {
        return (
            <StoryEditorScreen 
                imageSrc={mediaSrc}
                onClose={() => { 
                    setMediaSrc(null); 
                    // If started from share target, close completely. Otherwise, go back to options.
                    if (initialMediaSrc) {
                        close();
                    } else {
                        setView('options');
                    }
                }}
                onShare={handleShareStory}
            />
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black z-40 flex flex-col justify-center items-center h-full w-full">
            <canvas ref={canvasRef} className="hidden" />
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />

            {view === 'live' && (
                <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: cameraMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }} />
                    <button onClick={() => { setView('options'); stopCamera(); }} className="absolute left-4 text-white bg-black/50 p-2 rounded-full z-10" style={{ top: 'calc(1rem + var(--safe-area-inset-top))'}}>
                        <ArrowLeftIcon />
                    </button>
                    <button onClick={handleCameraFlip} className="absolute right-4 text-white bg-black/50 p-2 rounded-full z-10" style={{ top: 'calc(1rem + var(--safe-area-inset-top))'}}>
                        <FlipCameraIcon />
                    </button>
                    <div className="absolute bottom-8 flex justify-center w-full">
                        <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white border-4 border-black/50 ring-4 ring-white/30" aria-label="Take picture"></button>
                    </div>
                </>
            )}

            {view === 'options' && (
                <>
                    <header className="absolute top-0 left-0 right-0 p-2 flex items-center justify-start z-10 safe-pt">
                        <button onClick={close} className="text-blue-400 p-2">
                            <ArrowLeftIcon className="w-8 h-8" />
                        </button>
                    </header>
                    <div className="flex flex-col items-center text-gray-400">
                        <h1 className="text-2xl font-bold text-white mb-8">Create a Story</h1>
                        <div className="flex flex-col space-y-4 w-full max-w-xs">
                            <button onClick={() => startCamera('environment')} className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full transition-colors duration-200">
                                <CameraIcon />
                                <span>Take Photo</span>
                            </button>
                            <button onClick={handleGalleryPick} className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-full transition-colors duration-200">
                                <ImageIcon />
                                <span>Gallery</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {view === 'denied' && (
                <div className="text-center text-red-400 p-8">
                     <p className="text-lg font-semibold">Camera Access Denied</p>
                     <p className="mt-2">Please enable camera permissions in your browser settings to continue.</p>
                      <button onClick={() => setView('options')} className="mt-6 bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                        Go Back
                      </button>
                </div>
            )}
        </div>
    );
};

export default StoryCreationScreen;