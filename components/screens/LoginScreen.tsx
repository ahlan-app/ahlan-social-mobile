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

import React, { useState } from 'react';
import { AhlanIcon } from '../Icons';
import { supabase } from '../../services/apiService';

interface LoginScreenProps {
    onLogin: () => void;
    onNavigateToSignUp: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignUp }) => {
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    const isFormValid = loginIdentifier.trim() !== '' && password.trim() !== '';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        if (!isFormValid) {
            setError('Please enter your username/email and password.');
            setShake(true);
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            let emailToLogin = '';
            if (loginIdentifier.includes('@')) {
                emailToLogin = loginIdentifier;
            } else {
                // This assumes you have an RPC function in Supabase named `get_email_by_username`
                // SQL for the function:
                // CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
                // RETURNS TEXT AS $$
                // BEGIN
                //   RETURN (
                //     SELECT email FROM auth.users WHERE raw_user_meta_data->>'username' = p_username
                //   );
                // END;
                // $$ LANGUAGE plpgsql SECURITY DEFINER;
                const { data, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: loginIdentifier });

                if (rpcError || !data) {
                    console.error('RPC Error:', rpcError);
                    throw new Error('Invalid username or email.');
                }
                emailToLogin = data;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: emailToLogin,
                password: password,
            });

            if (error) {
                throw error;
            }
            
        } catch (err) {
            setError((err as Error).message || 'Invalid credentials. Please try again.');
            setShake(true);
        } finally {
            setIsLoading(false);
        }
    };

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
                <h1 className="text-5xl font-bold text-white mb-8 font-handwriting">Ahlan</h1>
                
                <form 
                    onSubmit={handleLogin} 
                    className={`space-y-4 ${shake ? 'animate-shake' : ''}`}
                    onAnimationEnd={() => setShake(false)}
                >
                    <div>
                        <input
                            type="text"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value.toLowerCase())}
                            placeholder="Username or Email"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            aria-label="Username or Email"
                            autoCapitalize="none"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            aria-label="Password"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            'Log In'
                        )}
                    </button>
                </form>
            </div>
             <div className="absolute bottom-8 text-center text-gray-500 text-sm">
                <p>Don't have an account? <button onClick={onNavigateToSignUp} className="font-semibold text-blue-500 hover:text-blue-400">Sign up</button></p>
            </div>
        </div>
    );
};

export default LoginScreen;