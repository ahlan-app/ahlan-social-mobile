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

import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowRightIcon, TrashIcon, LogoutIcon } from '../Icons';

interface SettingsScreenProps {
    close: () => void;
    onLogout: () => void;
    onOpenPrivacyPolicy: () => void;
    onOpenTermsOfService: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ close, onLogout, onOpenPrivacyPolicy, onOpenTermsOfService }) => {
    const { userProfile, updateProfile } = useApp();
    
    const handleDeleteAccount = () => {
        const isConfirmed = window.confirm(
            "Are you sure you want to delete your account?\n\nThis action is permanent and cannot be undone. All your posts, stories, and data will be erased forever."
        );

        if (isConfirmed) {
            onLogout();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen animate-fade-in">
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                
                /* Custom Toggle Switch Styles */
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #3b82f6; /* blue-500 */
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #3b82f6; /* blue-500 */
                }
            `}</style>
            
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 safe-pt">
                <div className="w-12" />
                <h1 className="text-xl font-bold">Settings</h1>
                <button onClick={close} className="text-blue-400 p-2">
                    <ArrowRightIcon className="w-8 h-8" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">

                {/* Log Out Section */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-300 mb-3">Account</h2>
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-red-400">Log Out</p>
                                <p className="text-xs text-gray-400">You will be returned to the login screen.</p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                            >
                                <LogoutIcon className="w-5 h-5" />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-300 mb-3">Legal & Information</h2>
                    <div className="bg-gray-800 rounded-lg">
                        <button onClick={onOpenPrivacyPolicy} className="w-full text-left p-4 hover:bg-gray-700 rounded-t-lg transition-colors">
                            <p className="font-medium text-white">Privacy Policy</p>
                            <p className="text-xs text-gray-400">Read how we handle your data.</p>
                        </button>
                        <div className="border-t border-gray-700 mx-4"></div>
                        <button onClick={onOpenTermsOfService} className="w-full text-left p-4 hover:bg-gray-700 rounded-b-lg transition-colors">
                            <p className="font-medium text-white">Terms of Service</p>
                            <p className="text-xs text-gray-400">Review the rules for using Ahlan.</p>
                        </button>
                    </div>
                </div>

                {/* Account Deletion Section */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-300 mb-3">Danger Zone</h2>
                     <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-red-400">Delete Account</p>
                                <p className="text-xs text-gray-400">Permanently delete your account and all of your content.</p>
                            </div>
                            <button
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                            >
                                <TrashIcon className="w-5 h-5" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;