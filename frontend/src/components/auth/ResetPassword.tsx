import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface ResetPasswordProps {
    token: string;
    onBack?: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onBack }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

    // Calculate password strength
    const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

        if (strength <= 2) return 'weak';
        if (strength <= 4) return 'medium';
        return 'strong';
    };

    const handlePasswordChange = (value: string) => {
        setNewPassword(value);
        setPasswordStrength(calculatePasswordStrength(value));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passwordStrength !== 'strong') {
            setError('Please use a strong password. Your password must be unique and contain uppercase, lowercase, numbers, and special characters.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL} /reset-password-email/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Password changed successfully! Redirecting to sign in...');
                setTimeout(() => {
                    if (onBack) onBack();
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password. Link may have expired.');
            }
        } catch (error) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Reset Password</h2>
                    <p className="text-gray-600 text-center mb-8">Enter your new password</p>

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
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    placeholder="New Password"
                                    required
                                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h - full transition - all duration - 300 ${passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                                                    passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                                                        'w-full bg-green-500'
                                                } `}
                                        />
                                    </div>
                                    <span className={`text - sm font - medium ${passwordStrength === 'weak' ? 'text-red-600' :
                                            passwordStrength === 'medium' ? 'text-yellow-600' :
                                                'text-green-600'
                                        } `}>
                                        {passwordStrength === 'weak' ? 'Weak' :
                                            passwordStrength === 'medium' ? 'Medium' :
                                                'Strong'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    required
                                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Reset Password
                        </button>
                    </form>

                    <button
                        onClick={onBack}
                        className="mt-6 w-full text-blue-600 hover:text-blue-700 font-medium transition text-center"
                    >
                        Back to Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};
