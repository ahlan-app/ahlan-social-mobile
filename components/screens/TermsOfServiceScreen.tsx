import React from 'react';
import { ArrowLeftIcon } from '../Icons';

interface TermsOfServiceScreenProps {
    close: () => void;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ close }) => {
    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-100 z-[100] flex flex-col h-screen animate-fade-in">
            <style>{`.animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
            
            <header className="bg-white dark:bg-gray-100 border-b border-gray-200 dark:border-gray-300 p-2 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 safe-pt">
                <button onClick={close} className="p-2 text-black">
                    <ArrowLeftIcon className="w-8 h-8" />
                </button>
                <h1 className="text-xl font-bold text-black">Terms of Service</h1>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 text-black prose">
                <h2 className="font-bold">Ahlan Social &ndash; Terms of Service</h2>
                <p className="text-sm text-gray-600 mb-6">Last Updated: October 26, 2025</p>

                <p>Welcome to Ahlan Social ("the App," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the Ahlan Social app, website, and related services (collectively, the "Service"). By creating an account or using the Service, you agree to be bound by these Terms.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">1. Eligibility</h3>
                <p>You must be at least 13 years old to create an account and use the Service. By using the App, you represent and warrant that you meet this age requirement and have the legal capacity to enter into this agreement.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">2. Your Account</h3>
                <p>You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account. You agree to notify us immediately of any unauthorized use of your account.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">3. User Content and Conduct</h3>
                <h4 className="text-lg font-semibold mt-4 mb-1">a. Your Content</h4>
                <p>You retain ownership of all content you post, upload, or share on the Service ("User Content"). By submitting User Content, you grant Ahlan Social a non-exclusive, worldwide, royalty-free, sublicensable, and transferable license to host, display, reproduce, modify (for formatting purposes), distribute, and make available your content in connection with operating and providing the Service.</p>

                <h4 className="text-lg font-semibold mt-4 mb-1">b. Community Guidelines and Prohibited Content</h4>
                <p>You agree not to post User Content or engage in any activity on the Service that violates our community standards. Prohibited content and conduct includes, but is not limited to, anything that:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Promotes Hate Speech or Discrimination:</strong> Content that attacks, demeans, or promotes discrimination or violence against individuals or groups based on race, ethnic origin, religion, disability, age, nationality, veteran status, sexual orientation, gender, gender identity, or any other characteristic associated with systemic discrimination or marginalization.</li>
                    <li><strong>Incites Violence or Terrorism:</strong> Content that threatens, glorifies, or promotes violence, terrorism, or other dangerous illegal acts. We have a zero-tolerance policy for content that encourages harm towards others.</li>
                    <li><strong>Involves Harassment and Bullying:</strong> Targeting individuals or groups with malicious or abusive behavior.</li>
                    <li><strong>Is Sexually Explicit or Exploitative:</strong> Content that is pornographic, depicts sexual violence, or exploits individuals.</li>
                    <li><strong>Is Illegal or Fraudulent:</strong> Promotes illegal activities, schemes, or scams.</li>
                    <li><strong>Infringes Intellectual Property:</strong> Violates a third party’s intellectual property rights, such as copyrights and trademarks.</li>
                    <li><strong>Involves Impersonation or Misinformation:</strong> Impersonating others in a deceptive manner or spreading harmful misinformation.</li>
                    <li><strong>Is Spam:</strong> Distributing unsolicited or repetitive content.</li>
                </ul>

                <h4 className="text-lg font-semibold mt-4 mb-1">c. Our Stance on Political Expression</h4>
                <p>Ahlan Social is a platform for diverse voices and perspectives. We respect the right to freedom of expression, which includes political speech and advocacy for political change. This includes peaceful and lawful calls for self-determination or separatism. However, this freedom does not extend to any content that violates our Community Guidelines, particularly those that incite violence, hatred, or discrimination.</p>
                
                <p className="mt-2">We reserve the right to remove any content and terminate accounts that violate these rules, without prior notice.</p>


                <h3 className="text-xl font-bold mt-6 mb-2">4. Our Intellectual Property</h3>
                <p>The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of Ahlan Social and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">5. Termination</h3>
                <p>You can terminate your account at any time by deleting it through the app settings. We may suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms, is harmful to other users, or is otherwise disruptive to the Service.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">6. Disclaimers and Limitation of Liability</h3>
                <h4 className="text-lg font-semibold mt-4 mb-1">Disclaimer of Warranties</h4>
                <p>THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>

                <h4 className="text-lg font-semibold mt-4 mb-1">Limitation of Liability</h4>
                <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL AHLAN SOCIAL, ITS AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE, OR INABILITY TO USE, THE SERVICE, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">7. Governing Law</h3>
                <p>These Terms shall be governed and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. This does not deprive you of the protection afforded to you by mandatory provisions of the law of your country of residence.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">8. Changes to These Terms</h3>
                <p>We reserve the right to modify these Terms at any time. If we make material changes, we will provide you with notice, such as by sending an email, providing a notification through the Service, or updating the "Last Updated" date. By continuing to use the Service after those changes become effective, you agree to be bound by the revised Terms.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">9. Contact Us</h3>
                <p>If you have any questions about these Terms, please contact us:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Email:</strong> <a href="mailto:ahlanappinfo@gmail.com" className="text-blue-600 hover:underline">ahlanappinfo@gmail.com</a></li>
                </ul>
            </div>
        </div>
    );
};

export default TermsOfServiceScreen;