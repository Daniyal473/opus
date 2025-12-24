import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

interface ForgotPasswordProps {
    onBack?: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Password reset link has been sent to your email. Please check your inbox.');
                setEmail('');
            } else {
                setError(data.error || 'Email not found in database');
            }
        } catch (error) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Reset Password</h2>
                    <p className="text-gray-600 text-center mb-8">Enter your email to reset your password</p>

                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="text-green-700 text-sm">{message}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[var(--color-primary)] text-white font-semibold py-3.5 px-6 rounded-xl hover:brightness-90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Reset Password'}
                        </button>
                    </form>

                    <button
                        onClick={onBack}
                        className="mt-6 w-full flex items-center justify-center gap-2 text-[var(--color-primary)] hover:opacity-80 font-medium transition"
                    >
                        <ArrowLeft size={18} />
                        Back to Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};
