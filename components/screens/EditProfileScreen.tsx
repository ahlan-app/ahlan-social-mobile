// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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

import React, { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { cleanHtml, uploadAvatar, updateUserProfileData } from '../../services/apiService';
import { FlagIcon } from '../Icons';
import FlagPicker from '../FlagPicker';
import UserAvatar from '../UserAvatar';

interface EditProfileScreenProps {
    close: () => void;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ close }) => {
    const { userProfile, updateProfile, addToast } = useApp();
    
    const [name, setName] = useState(userProfile.name);
    const [username, setUsername] = useState(userProfile.username);
    const [bio, setBio] = useState(userProfile.bio);
    const [profilePicture, setProfilePicture] = useState(userProfile.profilePicture);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
    
    const handleSave = () => {
        const originalProfile = { ...userProfile };
        const hasTextChanged = name !== originalProfile.name || username !== originalProfile.username || bio !== originalProfile.bio;
        const hasAvatarChanged = !!avatarFile;

        if (!hasTextChanged && !hasAvatarChanged) {
            close(); // Nothing to save, just close
            return;
        }

        setIsSaving(true); // Disable button to prevent double-clicks

        // --- OPTIMISTIC UI UPDATE ---
        // Create the data for the immediate local update.
        // Use the local preview URL if an avatar was selected.
        const optimisticProfileData = {
            ...userProfile, // Keep other properties like ID, isPrivate, etc.
            name,
            username,
            bio: cleanHtml(bio),
            profilePicture: hasAvatarChanged ? profilePicture : userProfile.profilePicture,
        };
        
        updateProfile(optimisticProfileData);
        close(); // Close the modal immediately
        addToast('Updating profile...', 'info');

        // --- BACKGROUND NETWORK TASKS ---
        // Use an IIFE to run async code without blocking the UI thread.
        (async () => {
            try {
                let finalAvatarUrl = originalProfile.profilePicture;
                
                // 1. Upload avatar if it was changed
                if (hasAvatarChanged && avatarFile) {
                    const uploadedUrl = await uploadAvatar(avatarFile);
                    if (uploadedUrl) {
                        finalAvatarUrl = uploadedUrl;
                    } else {
                        throw new Error('Avatar upload failed.');
                    }
                }

                // 2. Update text fields in DB if they changed
                if (hasTextChanged) {
                    const profileUpdates: { full_name?: string; username?: string; bio?: string } = {};
                    if (name !== originalProfile.name) profileUpdates.full_name = name;
                    if (username !== originalProfile.username) profileUpdates.username = username;
                    if (bio !== originalProfile.bio) profileUpdates.bio = cleanHtml(bio);

                    const success = await updateUserProfileData(profileUpdates);
                    if (!success) {
                        throw new Error('Failed to update profile details.');
                    }
                }
                
                // 3. Final silent update to context with permanent URL if avatar was uploaded
                // This replaces the local blob/data URL with the permanent Supabase URL.
                if (hasAvatarChanged) {
                    updateProfile({ ...optimisticProfileData, profilePicture: finalAvatarUrl });
                }

                addToast('Profile updated successfully!', 'success');

            } catch (error) {
                console.error(error);
                // --- ROLLBACK ON FAILURE ---
                // If anything fails, revert the optimistic update to its original state
                updateProfile(originalProfile); 
                addToast((error as Error).message || 'Profile update failed.', 'error');
            }
        })();
    };
    
    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfilePicture(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleFlagSelect = (flagTextCode: string) => {
        const textarea = bioTextareaRef.current;
        if (!textarea) {
            setBio(prev => prev + flagTextCode);
            return;
        }

        const start = textarea.selectionStart ?? bio.length;
        const end = textarea.selectionEnd ?? bio.length;
        const text = bio;
        const newText = text.substring(0, start) + flagTextCode + text.substring(end);
        
        setBio(newText);
        setFlagPickerOpen(false);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + flagTextCode.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
            />
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 safe-pt">
                <div className="flex items-center">
                    <button onClick={close} disabled={isSaving} className="text-blue-400 text-lg px-4 py-2 disabled:opacity-50">Cancel</button>
                </div>
                <h1 className="text-xl font-bold">Edit Profile</h1>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded-full w-20 flex justify-center items-center disabled:opacity-50 disabled:cursor-wait"
                >
                    {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Save'}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="flex flex-col items-center space-y-2">
                    <UserAvatar username={username} avatarUrl={profilePicture} className="w-24 h-24 rounded-full object-cover"/>
                    <button onClick={() => fileInputRef.current?.click()} className="text-blue-400 font-semibold">
                        Change Photo
                    </button>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400">Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-400">Username</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-700 bg-gray-700 text-gray-400 sm:text-sm">@</span>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase())}
                            className="flex-1 block w-full min-w-0 rounded-none rounded-r-md bg-gray-800 border-gray-700 py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-400">Bio</label>
                    <div className="mt-1 relative">
                        <textarea
                            ref={bioTextareaRef}
                            id="bio"
                            rows={4}
                            value={bio}
                            onChange={(e) => setBio(e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`))}
                            className="block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 pr-10 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                         <button 
                            onClick={() => setFlagPickerOpen(true)}
                            className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700"
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
};

export default EditProfileScreen;