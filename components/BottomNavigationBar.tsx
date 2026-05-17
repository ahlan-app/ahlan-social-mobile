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
import { HomeIcon, SearchIcon, CameraIcon, PencilAltIcon, UserIcon } from './Icons';

type Screen = 'home' | 'search' | 'camera' | 'compose' | 'profile';

interface BottomNavigationBarProps {
    activeScreen: Screen | 'notifications' | 'messages';
    navigate: (screen: Screen) => void;
}

const NavButton: React.FC<{
    screen: Screen;
    label: string;
    activeScreen: Screen | 'notifications' | 'messages';
    navigate: (screen: Screen) => void;
    children: React.ReactNode;
}> = ({ screen, label, activeScreen, navigate, children }) => {
    const isActive = activeScreen === screen;
    return (
        <button
            onClick={() => navigate(screen)}
            aria-label={label}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
            {children}
        </button>
    );
};

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({ activeScreen, navigate }) => {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 z-30"
            style={{ height: 'calc(4rem + var(--safe-area-inset-bottom))' }}
        >
            <div className="relative h-full safe-pb">
                <div className="flex justify-around items-center h-full">
                    <div className="w-1/5 h-full">
                        <NavButton screen="home" label="Home" activeScreen={activeScreen} navigate={navigate}>
                            <HomeIcon />
                        </NavButton>
                    </div>
                    <div className="w-1/5 h-full">
                        <NavButton screen="search" label="Search" activeScreen={activeScreen} navigate={navigate}>
                            <SearchIcon />
                        </NavButton>
                    </div>
                    <div className="w-1/5"></div>
                    <div className="w-1/5 h-full">
                        <NavButton screen="camera" label="Camera" activeScreen={activeScreen} navigate={navigate}>
                            <CameraIcon />
                        </NavButton>
                    </div>
                    <div className="w-1/5 h-full">
                        <NavButton screen="profile" label="Profile" activeScreen={activeScreen} navigate={navigate}>
                            <UserIcon />
                        </NavButton>
                    </div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <button
                        onClick={() => navigate('compose')}
                        className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform"
                        aria-label="Compose Post"
                    >
                        <PencilAltIcon />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default BottomNavigationBar;