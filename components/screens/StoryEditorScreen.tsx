// Copyright 2026 Samet Yilmaz Temel
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

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { XIcon, TrashIcon, FlagIcon } from '../Icons';
import FlagPicker from '../FlagPicker';

interface StoryEditorScreenProps {
    imageSrc: string;
    onClose: () => void;
    onShare: (imageDataUrl: string) => void;
}

interface TextElement {
  id: string;
  text: string;
  x: number; // Center offset from container center
  y: number; // Center offset from container center
  color: string;
  fontSize: number; // Base size
  scale: number;    // Multiplier from gestures
  rotation: number; // Degrees from gestures
  backgroundStyle: 'none' | 'translucent' | 'solid';
}

interface Point { x: number; y: number; }

const colors = ['#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#AF52DE'];
const backgroundStyles: TextElement['backgroundStyle'][] = ['none', 'translucent', 'solid'];
const TAP_THRESHOLD = { distance: 10, duration: 250 };

const StoryEditorScreen: React.FC<StoryEditorScreenProps> = ({ imageSrc, onClose, onShare }) => {
    const [texts, setTexts] = useState<TextElement[]>([]);
    const [imageScale, setImageScale] = useState(1);
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
    const [isPosting, setPosting] = useState(false);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<TextElement | null>(null);
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [isOverTrash, setIsOverTrash] = useState(false);


    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trashRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    
    // Refs for gesture handling
    const activePointers = useRef<Map<number, Point>>(new Map());
    const textGesture = useRef<{
        textId: string;
        initialText: TextElement;
        initialPointers: Point[];
        initialPinch?: { distance: number; angle: number; };
    } | null>(null);
    const imageGesture = useRef<{
        initialOffset: Point;
        initialPointers: Point[];
        initialPinchDist?: number;
    } | null>(null);
    const tapStart = useRef<{ time: number; point: Point; pointerId: number; target: EventTarget | null } | null>(null);

    useEffect(() => {
        if (editingText) {
            setTimeout(() => textInputRef.current?.focus(), 100);
        }
    }, [editingText]);

    const handleEditingTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (editingText) {
            const newText = e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`);
            setEditingText({ ...editingText, text: newText });
        }
    };

    const updateTextElement = (id: string, updates: Partial<TextElement>) => {
        setTexts(texts.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const getRelativePoint = (clientX: number, clientY: number): Point | null => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const addTextElement = (point: Point) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const newText: TextElement = {
            id: `text-${Date.now()}`,
            text: '',
            x: point.x - containerRect.width / 2,
            y: point.y - containerRect.height / 2,
            color: '#FFFFFF',
            fontSize: 40,
            scale: 1,
            rotation: 0,
            backgroundStyle: 'translucent',
        };
        setTexts(prevTexts => [...prevTexts, newText]);
        setSelectedTextId(newText.id);
        setEditingText(newText);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('.editor-footer, .editor-header')) return;

        const currentPoint = { x: e.clientX, y: e.clientY };
        activePointers.current.set(e.pointerId, currentPoint);
        e.currentTarget.setPointerCapture(e.pointerId);

        const textElement = (e.target as HTMLElement).closest('[data-text-id]');
        const textId = textElement?.getAttribute('data-text-id');

        if (textId) {
            const initialText = texts.find(t => t.id === textId);
            if (!initialText) return;
            
            setSelectedTextId(textId);
            textGesture.current = {
                textId,
                initialText,
                initialPointers: [...activePointers.current.values()],
            };

            if (activePointers.current.size === 2) {
                const pointers = textGesture.current.initialPointers;
                textGesture.current.initialPinch = {
                    distance: Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y),
                    angle: Math.atan2(pointers[1].y - pointers[0].y, pointers[1].x - pointers[0].x) * 180 / Math.PI,
                };
            }
        } else {
            setSelectedTextId(null);
            const tapPoint = getRelativePoint(e.clientX, e.clientY);
            if(tapPoint) tapStart.current = { time: Date.now(), point: tapPoint, pointerId: e.pointerId, target: e.target };

            imageGesture.current = {
                initialOffset: imageOffset,
                initialPointers: [...activePointers.current.values()],
            };

            if (activePointers.current.size === 2) {
                const pointers = imageGesture.current.initialPointers;
                imageGesture.current.initialPinchDist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
            }
        }
    };
    
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!activePointers.current.has(e.pointerId)) return;
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const currentPointers = [...activePointers.current.values()];

        if (tapStart.current && e.pointerId === tapStart.current.pointerId) {
            const relPoint = getRelativePoint(e.clientX, e.clientY);
            if (relPoint) {
                const dist = Math.hypot(relPoint.x - tapStart.current.point.x, relPoint.y - tapStart.current.point.y);
                if (dist > TAP_THRESHOLD.distance) {
                    tapStart.current = null;
                }
            }
        }

        if (textGesture.current) {
            if (!isDraggingText) setIsDraggingText(true);

            const { initialText, initialPointers, initialPinch } = textGesture.current;
            if (currentPointers.length === 1 && initialPointers.length > 0) { // Drag
                const dx = currentPointers[0].x - initialPointers[0].x;
                const dy = currentPointers[0].y - initialPointers[0].y;
                updateTextElement(initialText.id, {
                    x: initialText.x + dx,
                    y: initialText.y + dy,
                });
            } else if (currentPointers.length === 2 && initialPointers.length > 1 && initialPinch) { // Scale/Rotate
                const currentDist = Math.hypot(currentPointers[0].x - currentPointers[1].x, currentPointers[0].y - currentPointers[1].y);
                const currentAngle = Math.atan2(currentPointers[1].y - currentPointers[0].y, currentPointers[1].x - currentPointers[0].x) * 180 / Math.PI;
                
                const newScale = initialText.scale * (currentDist / initialPinch.distance);
                const newRotation = initialText.rotation + (currentAngle - initialPinch.angle);
                updateTextElement(initialText.id, { scale: newScale, rotation: newRotation });
            }
            
            const trashRect = trashRef.current?.getBoundingClientRect();
            if (trashRect) {
                const isOver = e.clientX > trashRect.left && e.clientX < trashRect.right && e.clientY > trashRect.top && e.clientY < trashRect.bottom;
                setIsOverTrash(isOver);
            }

        } else if (imageGesture.current) {
             const { initialOffset, initialPointers, initialPinchDist } = imageGesture.current;
             if (currentPointers.length === 1 && initialPointers.length > 0) {
                 const dx = currentPointers[0].x - initialPointers[0].x;
                 const dy = currentPointers[0].y - initialPointers[0].y;
                 setImageOffset({ x: initialOffset.x + dx, y: initialOffset.y + dy });
             } else if (currentPointers.length === 2 && initialPointers.length > 1 && initialPinchDist) {
                 const currentDist = Math.hypot(currentPointers[0].x - currentPointers[1].x, currentPointers[0].y - currentPointers[1].y);
                 const scaleFactor = currentDist / initialPinchDist;
                 setImageScale(prev => Math.max(1, Math.min(prev * scaleFactor, 5)));
             }
        }
    };
    
    const handlePointerUp = (e: React.PointerEvent) => {
        if (tapStart.current && e.pointerId === tapStart.current.pointerId) {
            const duration = Date.now() - tapStart.current.time;
            const targetEl = tapStart.current.target as HTMLElement;
            if (duration < TAP_THRESHOLD.duration && !targetEl.closest('[data-text-id]')) {
                addTextElement(tapStart.current.point);
            }
        }
        
        if (textGesture.current && isOverTrash) {
             setTexts(texts.filter(t => t.id !== textGesture.current!.textId));
        } else if (textGesture.current) {
             const tappedText = texts.find(t => t.id === textGesture.current!.textId);
             if (tappedText && !isDraggingText) {
                 setEditingText(tappedText);
             }
        }

        activePointers.current.delete(e.pointerId);
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
        
        textGesture.current = null;
        imageGesture.current = null;
        tapStart.current = null;
        setIsDraggingText(false);
        setIsOverTrash(false);
    };

    const handleShare = async () => {
        if (!imageRef.current || !canvasRef.current || !containerRef.current) return;
        setPosting(true);
        setSelectedTextId(null);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const containerRect = containerRef.current.getBoundingClientRect();
        
        canvas.width = 1080;
        canvas.height = 1920;

        if (!ctx) {
            setPosting(false);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const canvasAspectRatio = canvas.width / canvas.height;
        const imgAspectRatio = image.naturalWidth / image.naturalHeight;

        let initialDrawWidth, initialDrawHeight;

        if (imgAspectRatio > canvasAspectRatio) {
            initialDrawWidth = canvas.width;
            initialDrawHeight = initialDrawWidth / imgAspectRatio;
        } else {
            initialDrawHeight = canvas.height;
            initialDrawWidth = initialDrawHeight * imgAspectRatio;
        }

        const scaleFactor = canvas.width / containerRect.width;
        const finalDrawWidth = initialDrawWidth * imageScale;
        const finalDrawHeight = initialDrawHeight * imageScale;

        const drawX = (canvas.width - finalDrawWidth) / 2 + (imageOffset.x * scaleFactor);
        const drawY = (canvas.height - finalDrawHeight) / 2 + (imageOffset.y * scaleFactor);

        ctx.drawImage(image, drawX, drawY, finalDrawWidth, finalDrawHeight);

        texts.forEach(text => {
            if (!text.text.trim()) return;
            
            ctx.save();
            
            const scaledFontSize = text.fontSize * scaleFactor;
            ctx.font = `700 ${scaledFontSize}px 'Fredoka', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
    
            const transformedX = (containerRect.width / 2 + text.x) * scaleFactor;
            const transformedY = (containerRect.height / 2 + text.y) * scaleFactor;
            
            ctx.translate(transformedX, transformedY);
            ctx.rotate(text.rotation * Math.PI / 180);
            ctx.scale(text.scale, text.scale);

            if (text.backgroundStyle !== 'none') {
                const metrics = ctx.measureText(text.text);
                const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                const paddingX = scaledFontSize * 0.5;
                const paddingY = scaledFontSize * 0.25;
                const rectWidth = metrics.width + paddingX;
                const rectHeight = textHeight + paddingY;
                
                let bgColor = 'transparent';
                if (text.backgroundStyle === 'translucent') {
                    bgColor = text.color === '#FFFFFF' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
                } else if (text.backgroundStyle === 'solid') {
                    bgColor = text.color === '#000000' ? '#FFFFFF' : '#000000';
                }

                ctx.fillStyle = bgColor;
                ctx.fillRect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight);
            }
    
            ctx.fillStyle = text.color;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText(text.text, 0, 0);
            
            ctx.restore();
        });
        
        const finalImageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onShare(finalImageDataUrl);
    };
    
    const handleDoneEditing = () => {
        if (editingText) {
            updateTextElement(editingText.id, editingText);
        }
        setEditingText(null);
    }
    
    const handleFlagSelect = (flagTextCode: string) => {
        if (editingText) {
            setEditingText({ ...editingText, text: editingText.text + flagTextCode });
        }
        setFlagPickerOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen w-screen">
             <canvas ref={canvasRef} className="hidden" />
            <header className="editor-header flex items-center justify-between p-2 bg-black/30 backdrop-blur-sm z-20 safe-pt">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
                    <XIcon className="w-6 h-6 text-white" />
                </button>
                 <div className="flex items-center space-x-4">
                    <button onClick={() => setFlagPickerOpen(true)} className="p-2 rounded-full hover:bg-white/20">
                        <FlagIcon className="w-6 h-6 text-white" />
                    </button>
                 </div>
                <button 
                    onClick={handleShare}
                    disabled={isPosting}
                    className="bg-blue-500 text-white font-bold py-2 px-6 rounded-full disabled:bg-blue-800 disabled:text-gray-400"
                >
                    {isPosting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Share'}
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center p-2 relative bg-gray-900 overflow-hidden">
                <div 
                    ref={containerRef}
                    className="relative w-full h-full max-h-full aspect-[9/16] bg-black shadow-lg rounded-lg overflow-hidden touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    <img 
                        ref={imageRef} 
                        src={imageSrc} 
                        alt="Edit preview" 
                        className="absolute top-0 left-0 w-full h-full object-contain"
                        style={{ 
                            transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                            transition: 'transform 0.2s'
                        }}
                        draggable="false" 
                    />
               
                    {texts.map(text => (
                        <div
                            key={text.id}
                            data-text-id={text.id}
                            className="absolute text-center whitespace-pre p-2"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) translate(${text.x}px, ${text.y}px) scale(${text.scale}) rotate(${text.rotation}deg)`,
                                color: text.color,
                                fontSize: `${text.fontSize}px`,
                                backgroundColor: text.backgroundStyle === 'none' ? 'transparent' : (text.backgroundStyle === 'translucent' ? (text.color === '#FFFFFF' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)') : (text.color === '#000000' ? '#FFFFFF' : '#000000')),
                                borderRadius: '8px',
                                textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
                                pointerEvents: 'auto',
                                cursor: 'move',
                                lineHeight: 1.2,
                                fontFamily: "'Fredoka', sans-serif",
                                fontWeight: 500,
                            }}
                        >
                            {text.text || ' '}
                        </div>
                    ))}
                </div>
            </main>

            {isDraggingText && (
                <div ref={trashRef} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                    <TrashIcon className={`w-16 h-16 p-4 rounded-full text-white transition-all duration-200 ${isOverTrash ? 'bg-red-500 scale-125' : 'bg-black/50'}`} />
                </div>
            )}
            
            {editingText && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 animate-fade-in-fast" onClick={handleDoneEditing}>
                    <div className="absolute top-0 left-0 right-0 p-2 flex justify-end safe-pt">
                        <button onClick={handleDoneEditing} className="bg-white text-black font-bold py-2 px-5 rounded-full">Done</button>
                    </div>

                    <textarea
                        ref={textInputRef}
                        value={editingText.text}
                        onChange={handleEditingTextChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent border-none text-center outline-none text-4xl resize-none"
                        style={{
                            color: editingText.color,
                            fontFamily: "'Fredoka', sans-serif",
                            fontWeight: 700,
                            textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
                        }}
                    />

                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col space-y-4 safe-pb" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <button onClick={() => {
                                const currentIndex = backgroundStyles.indexOf(editingText.backgroundStyle);
                                const nextIndex = (currentIndex + 1) % backgroundStyles.length;
                                setEditingText({...editingText, backgroundStyle: backgroundStyles[nextIndex]});
                            }} className="w-10 h-10 rounded-full bg-white/30 border-2 border-white flex items-center justify-center text-xl font-bold">
                                A
                            </button>
                             <div className="flex items-center justify-center space-x-2">
                                {colors.map(color => (
                                    <button 
                                        key={color} 
                                        onClick={() => setEditingText({...editingText, color})}
                                        className="w-8 h-8 rounded-full transition-transform hover:scale-110" 
                                        style={{ backgroundColor: color, border: editingText.color === color ? '3px solid white' : 'none' }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isFlagPickerOpen && (
                <FlagPicker 
                    onFlagSelected={handleFlagSelect}
                    onClose={() => setFlagPickerOpen(false)}
                />
            )}

             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; } 
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default StoryEditorScreen;