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

import React, { useState, useMemo } from 'react';
import { AhlanIcon, CheckIcon } from '../Icons';
import { supabase, checkUsernameExists } from '../../services/apiService';
import DatePicker from '../DatePicker';


interface SignUpScreenProps {
    onSignUp: () => void;
    onNavigateToLogin: () => void;
    onOpenPrivacyPolicy: () => void;
    onOpenTermsOfService: () => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSignUp, onNavigateToLogin, onOpenPrivacyPolicy, onOpenTermsOfService }) => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [birthday, setBirthday] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase();
        setUsername(value);

        if (value.length > 0 && !/^[a-z0-9_.]+$/.test(value)) {
            setUsernameError('Only lowercase letters, numbers, "_", and "." are allowed.');
        } else if (value.length > 0 && (value.length < 3 || value.length > 20)) {
            setUsernameError('Username must be between 3 and 20 characters.');
        }
        else {
            setUsernameError('');
        }
    };
    
    const isFormValid = fullName.trim() !== '' && username.trim() !== '' && email.trim() !== '' && password.trim() !== '' && password === confirmPassword && birthday.trim() !== '' && !usernameError;

    const formattedDate = useMemo(() => {
        if (!birthday) return 'Select your birthday';
        try {
            // Parse YYYY-MM-DD as UTC to avoid timezone off-by-one errors
            const parts = birthday.split('-').map(p => parseInt(p, 10));
            const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        } catch (e) {
            return 'Invalid Date';
        }
    }, [birthday]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || usernameError) return;

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            setShake(true);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setShake(true);
            return;
        }
        
        if (!isFormValid) {
             setError('Please fill out all fields correctly.');
            setShake(true);
            return;
        }
        
        setError('');
        setIsLoading(true);

        try {
            const isTaken = await checkUsernameExists(username);
            if (isTaken) {
                throw new Error('This username is already taken.');
            }
            
            // Sign up user with all data, including avatar
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        username: username,
                        birthday: birthday,
                        bio: "Hello, I am using Ahlan",
                    },
                    emailRedirectTo: window.location.origin,
                }
            });

            if (error) {
                throw error;
            }
            
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 setError('This user already exists. Please try logging in.');
                 setShake(true);
            } else if (data.user) {
                setIsSuccess(true);
            }

        } catch (err) {
            setError((err as Error).message || 'An unexpected error occurred during sign up.');
            setShake(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col justify-center items-center p-4 font-sans animate-fade-in-up">
                <div className="w-full max-w-sm text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4 text-green-500">
                        <CheckIcon className="w-full h-full" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">Success!</h1>
                    <p className="text-gray-300 mb-8">
                        Please click the verification link sent to your email. After clicking the link, return to the login page and sign in.
                    </p>
                    <button
                        onClick={onNavigateToLogin}
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-black flex flex-col justify-center items-center p-4 font-sans">
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
                
                @keyframes water-drop-plus {
                    0% { transform: translateY(-10px) scale(1.1, 0.9); opacity: 0; }
                    60% { transform: translateY(2px) scale(0.95, 1.05); opacity: 1; }
                    100% { transform: translateY(0) scale(1, 1); opacity: 1; }
                }

                @keyframes ripple-splash-stay {
                    from {
                        transform: scale(0.7);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                @keyframes fade-in-only {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .logo-splash-animation g, .logo-splash-animation circle, .logo-splash-animation .cyclone-path {
                    transform-origin: 50% 50%;
                }

                .logo-splash-animation g {
                    animation: water-drop-plus 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    animation-delay: 0.2s; 
                }

                .logo-splash-animation circle:nth-of-type(1) {
                    animation: ripple-splash-stay 0.9s ease-out forwards;
                    animation-delay: 0.4s;
                }
                .logo-splash-animation circle:nth-of-type(2) {
                    animation: ripple-splash-stay 0.9s ease-out forwards;
                    animation-delay: 0.5s;
                }

                .logo-splash-animation .cyclone-path {
                    opacity: 0;
                    animation: fade-in-only 0.4s ease-out forwards;
                    animation-delay: 1.4s;
                }

                /* Modern shake animation for validation */
                @keyframes shake {
                  10%, 90% { transform: translateX(-1px); }
                  20%, 80% { transform: translateX(2px); }
                  30%, 50%, 70% { transform: translateX(-4px); }
                  40%, 60% { transform: translateX(4px); }
                }
                .animate-shake {
                  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
             `}</style>
            <div className="w-full max-w-sm text-center animate-fade-in-up">
                <AhlanIcon className="w-24 h-24 mx-auto mb-4 text-blue-500 logo-splash-animation" />
                <h2 className="text-3xl font-bold text-white mb-6">Create your Account</h2>
                
                <form 
                    onSubmit={handleSignUp} 
                    className={`space-y-4 ${shake ? 'animate-shake' : ''}`}
                    onAnimationEnd={() => setShake(false)}
                >
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        aria-label="Full Name"
                    />
                    <div>
                         <input
                            type="text"
                            value={username}
                            onChange={handleUsernameChange}
                            placeholder="Username"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            aria-label="Username"
                            autoCapitalize="none"
                        />
                        {usernameError && <p className="text-red-500 text-sm text-left pt-1 px-1">{usernameError}</p>}
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        aria-label="Email"
                        autoCapitalize="none"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (min. 6 characters)"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        aria-label="Password"
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        aria-label="Confirm Password"
                    />
                    
                    <div>
                        <label htmlFor="birthday" className="block text-sm font-medium text-gray-400 text-left mb-1">Your birthday</label>
                         <button
                            type="button"
                            id="birthday"
                            onClick={() => setIsDatePickerOpen(true)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            aria-label="Select your birthday"
                        >
                            {birthday ? formattedDate : <span className="text-gray-500">Select your birthday</span>}
                        </button>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <p className="text-xs text-gray-500 text-center !mt-6">
                        By creating an account you agree to the <button type="button" onClick={(e) => { e.preventDefault(); onOpenTermsOfService(); }} className="text-blue-500 hover:underline">terms of service</button> and <button type="button" onClick={(e) => { e.preventDefault(); onOpenPrivacyPolicy(); }} className="text-blue-500 hover:underline">privacy policy</button>
                    </p>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex justify-center items-center disabled:bg-blue-800 disabled:cursor-not-allowed !mt-2"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>
            </div>
             <div className="absolute bottom-8 text-center text-gray-500 text-sm">
                <p>Already have an account? <button onClick={onNavigateToLogin} className="font-semibold text-blue-500 hover:text-blue-400">Log in</button></p>
            </div>
            <DatePicker 
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(date) => {
                    setBirthday(date);
                    setIsDatePickerOpen(false);
                }}
                initialDate={birthday}
            />
        </div>
    );
};

export default SignUpScreen;