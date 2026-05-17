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
import { useApp } from '../../store/AppContext';
import { XIcon, DownloadIcon, AhlanIcon, ShareIOSIcon, AddToHomeScreenIOSIcon, MoreVertAndroidIcon } from '../Icons';

// Simple OS detection utility
const getOS = (): 'iOS' | 'Android' | 'Desktop' => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) {
    return 'Android';
  }
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return 'iOS';
  }
  return 'Desktop';
};

const InstallAppModal: React.FC = () => {
    const {
        isInstallModalOpen,
        setInstallModalOpen,
        installPromptEvent,
        triggerInstallPrompt,
        isStandalone
    } = useApp();

    if (!isInstallModalOpen || isStandalone) {
        return null;
    }

    const handleClose = () => {
        sessionStorage.setItem('installModalDismissed', 'true');
        setInstallModalOpen(false);
    };

    const handleInstall = async () => {
        await triggerInstallPrompt();
        setInstallModalOpen(false);
    };

    const os = getOS();

    const renderInstructions = () => {
        if (os === 'iOS') {
            return (
                <>
                    <h3 className="text-lg font-bold text-white mt-2">To install the app:</h3>
                    <ol className="text-left text-gray-300 space-y-3 mt-4 text-sm">
                        <li className="flex items-center space-x-3">
                            <span className="bg-gray-700 rounded-md p-1.5"><ShareIOSIcon className="w-5 h-5 text-blue-400" /></span>
                            <span>Tap the <strong>Share</strong> button in your browser's toolbar.</span>
                        </li>
                        <li className="flex items-center space-x-3">
                            <span className="bg-gray-700 rounded-md p-1.5"><AddToHomeScreenIOSIcon className="w-5 h-5 text-blue-400" /></span>
                            <span>Scroll down and tap <strong>'Add to Home Screen'</strong>.</span>
                        </li>
                    </ol>
                </>
            );
        }
        if (os === 'Android') {
            return (
                 <>
                    <h3 className="text-lg font-bold text-white mt-2">To install the app:</h3>
                    <ol className="text-left text-gray-300 space-y-3 mt-4 text-sm">
                        <li className="flex items-center space-x-3">
                            <span className="bg-gray-700 rounded-md p-1.5"><MoreVertAndroidIcon className="w-5 h-5 text-white" /></span>
                            <span>Tap the <strong>Menu</strong> button in your browser.</span>
                        </li>
                        <li className="flex items-center space-x-3">
                            <span className="bg-gray-700 rounded-md p-1.5"><DownloadIcon className="w-5 h-5 text-white" /></span>
                            <span>Tap <strong>'Install app'</strong> or <strong>'Add to Home Screen'</strong>.</span>
                        </li>
                    </ol>
                </>
            );
        }
        return <p className="text-gray-400 mt-4 text-sm">You can install this app from your browser's settings menu.</p>;
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-dialog-title"
        >
            <div 
                className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl p-6 text-center animate-fade-in-scale relative"
            >
                <button 
                    onClick={handleClose} 
                    className="absolute top-2 right-2 p-2 text-gray-500 hover:text-white"
                    aria-label="Close install dialog"
                >
                    <XIcon className="w-5 h-5" />
                </button>
                
                <AhlanIcon className="w-16 h-16 text-blue-500 mx-auto" />
                
                <h2 id="install-dialog-title" className="text-2xl font-bold text-white mt-4">Get the Ahlan App</h2>
                
                {installPromptEvent ? (
                    <>
                        <p className="text-gray-300 mt-2">
                            Download the Ahlan app to your device for a faster, more immersive experience with offline access.
                        </p>
                        <div className="mt-6 flex flex-col space-y-3">
                            <button
                                onClick={handleInstall}
                                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-full hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span>Download</span>
                            </button>
                             <button
                                onClick={handleClose}
                                className="w-full text-gray-400 font-semibold py-2 px-6 rounded-full hover:bg-gray-800 transition-colors duration-200"
                            >
                                Not Now
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                        {renderInstructions()}
                    </div>
                )}

            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                @keyframes fade-in-scale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-scale { animation: fade-in-scale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default InstallAppModal;
