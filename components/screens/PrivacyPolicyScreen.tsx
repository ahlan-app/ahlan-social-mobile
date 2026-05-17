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
import { ArrowLeftIcon } from '../Icons';

interface PrivacyPolicyScreenProps {
    close: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ close }) => {
    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-100 z-[100] flex flex-col h-screen animate-fade-in">
            <style>{`.animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
            
            <header className="bg-white dark:bg-gray-100 border-b border-gray-200 dark:border-gray-300 p-2 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 safe-pt">
                <button onClick={close} className="p-2 text-black">
                    <ArrowLeftIcon className="w-8 h-8" />
                </button>
                <h1 className="text-xl font-bold text-black">Privacy Policy</h1>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 text-black prose">
                <h2 className="font-bold">Ahlan Social &ndash; Privacy Policy</h2>
                <p className="text-sm text-gray-600 mb-6">Last Updated: October 26, 2025</p>

                <p>Welcome to Ahlan Social ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "App").</p>
                <p>By using Ahlan Social, you agree to the collection and use of information in accordance with this policy. This policy is written to comply with the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and the Google Play Developer Policy.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">1. Information We Collect</h3>
                <p>We collect information that is necessary to provide, maintain, and improve our services.</p>

                <h4 className="text-lg font-semibold mt-4 mb-1">a. Information You Provide to Us</h4>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Account Information:</strong> When you create an account, we collect your full name, username, email address, date of birth, and a hashed version of your password.</li>
                    <li><strong>Profile Information:</strong> You may choose to provide a profile photo and a biography.</li>
                    <li><strong>User Content:</strong> We collect the content you create on the App, including posts, stories, photos, videos, comments, and direct messages.</li>
                    <li><strong>Communications:</strong> If you contact us directly, we may receive additional information about you such as your name, email address, the contents of the message, and any other information you may choose to provide.</li>
                </ul>

                <h4 className="text-lg font-semibold mt-4 mb-1">b. Information We Collect Automatically</h4>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Usage Data:</strong> We collect information about your activity on the App, such as likes, follows, shares, and other interactions with content and users.</li>
                    <li><strong>Device and Log Information:</strong> We collect log files and device information, including your IP address, device type, operating system version, browser type, and timestamps of your activity. This helps us with security and debugging.</li>
                    <li><strong>Media Information:</strong> When you use features like the camera or upload media, we process this data. With your permission, we access your device's camera and photo library.</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-2">2. How We Use Your Information</h3>
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li>To provide, operate, and maintain our App.</li>
                    <li>To improve, personalize, and expand our App's features and content.</li>
                    <li>To understand and analyze how you use our App for analytics and service improvement.</li>
                    <li>To communicate with you, including for customer service and to send you updates and promotional information related to the service.</li>
                    <li>To process your transactions and interactions within the App.</li>
                    <li>To find and prevent fraud, spam, and abuse, and to enforce our Terms of Service.</li>
                    <li>To comply with legal obligations.</li>
                </ul>
                <p className="mt-2"><strong>We do not sell your personal data to third parties.</strong></p>

                <h3 className="text-xl font-bold mt-6 mb-2">3. How We Share Your Information</h3>
                <p>We may share your information in the following situations:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>With Service Providers:</strong> We use third-party service providers like Supabase for database management, authentication, and storage. These providers have access to your information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</li>
                    <li><strong>For Legal Reasons:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</li>
                    <li><strong>Publicly Shared Information:</strong> Your username, profile picture, and any content you post publicly (like posts and comments) are visible to other users of the App.</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-2">4. Data Storage, Security, and Retention</h3>
                <p>Your data is securely stored using Supabase, which implements industry-standard security measures. All data transmission is encrypted using SSL/TLS. While we take reasonable measures to protect your information, no security system is impenetrable.</p>
                <p>We retain your personal data for as long as your account is active or as needed to provide you with services. You may delete your account at any time through the App's settings, which will permanently remove your personal data from our active systems within a reasonable timeframe, subject to our backup and archival policies.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">5. Your Data Protection Rights</h3>
                <p>Depending on your location, you have certain rights regarding your personal information:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Right of Access:</strong> You have the right to request copies of your personal data.</li>
                    <li><strong>Right to Rectification:</strong> You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete. You can edit most of your profile information directly in the App.</li>
                    <li><strong>Right to Erasure (Right to be Forgotten):</strong> You have the right to request that we erase your personal data, under certain conditions. This can be accomplished by deleting your account.</li>
                    <li><strong>Right to Restrict Processing:</strong> You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
                    <li><strong>Right to Object to Processing:</strong> You have the right to object to our processing of your personal data, under certain conditions.</li>
                    <li><strong>Right to Data Portability:</strong> You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
                </ul>
                <p className="mt-2">To exercise any of these rights, please contact us at our support email.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">6. Children's Privacy</h3>
                <p>Our service is not intended for anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us. If we become aware that we have collected personal data from a child under 13 without verification of parental consent, we will take steps to remove that information from our servers.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">7. International Data Transfers</h3>
                <p>Your information, including personal data, may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">8. Changes to This Privacy Policy</h3>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">9. Contact Us</h3>
                <p>If you have any questions, concerns, or complaints about this Privacy Policy, please contact us:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Email:</strong> <a href="mailto:ahlanappinfo@gmail.com" className="text-blue-600 hover:underline">ahlanappinfo@gmail.com</a></li>
                </ul>
            </div>
        </div>
    );
};

export default PrivacyPolicyScreen;