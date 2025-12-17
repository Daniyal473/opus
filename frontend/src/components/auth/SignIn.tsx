import React, { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import customLogo from '../../data/custom-logo.png';

import { Toast } from '../ui/Toast';

interface SignInProps {
    onSignIn?: (email: string, password: string) => void;
    onForgotPassword?: () => void;
    error?: string;
    onClearError?: () => void;
}

// reCAPTCHA v2 Site Key - decoded from Base64 at runtime
const decodeKey = (encoded: string): string => {
    try { return atob(encoded); } catch { return encoded; }
};
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || decodeKey(
    import.meta.env.VITE_RECAPTCHA_SITE_KEY_ENCODED || 'NkxmeUx5a3NBQUFBQUdtWWVnX3hlWWdNODBzbU1YNVV4Q25yc0gyNg=='
);

export const SignIn: React.FC<SignInProps> = ({ onSignIn, onForgotPassword, error, onClearError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberPassword, setRememberPassword] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; captcha?: string }>({});
    const recaptchaRef = useRef<ReCAPTCHA>(null);

    const handleCaptchaChange = (value: string | null) => {
        if (value) {
            setCaptchaVerified(true);
            if (errors.captcha) setErrors({ ...errors, captcha: undefined });
        } else {
            setCaptchaVerified(false);
        }
    };

    const handleCaptchaExpired = () => {
        setCaptchaVerified(false);
    };

    const validateForm = () => {
        const newErrors: { email?: string; password?: string; captcha?: string } = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        }

        if (!captchaVerified) {
            newErrors.captcha = 'Please verify that you are not a robot';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            if (onSignIn) {
                onSignIn(email, password);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-6">
                        <img
                            src={customLogo}
                            alt="Hotel Logo"
                            className="w-32 h-auto mb-4"
                        />

                        {/* Error Toast */}
                        {error && (
                            <Toast
                                message={error}
                                type="blue"
                                onClose={() => onClearError && onClearError()}
                                position="static"
                                duration={0}
                            />
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors({ ...errors, email: undefined });
                                }}
                                placeholder="Email"
                                className={`w-full px-4 py-3.5 rounded-xl border ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                                    } text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition`}
                            />
                            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors({ ...errors, password: undefined });
                                    }}
                                    placeholder="Password"
                                    className={`w-full px-4 py-3.5 rounded-xl border ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                                        } text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition pr-12`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
                        </div>

                        {/* Remember Password Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberPassword}
                                onChange={(e) => setRememberPassword(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-400 cursor-pointer"
                            />
                            <label htmlFor="remember" className="ml-3 text-gray-700 text-sm cursor-pointer">
                                Remember password
                            </label>
                        </div>

                        {/* Google reCAPTCHA */}
                        <div className="flex flex-col items-center">
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={RECAPTCHA_SITE_KEY}
                                onChange={handleCaptchaChange}
                                onExpired={handleCaptchaExpired}
                            />
                            {errors.captcha && <p className="mt-2 text-sm text-red-600">{errors.captcha}</p>}
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Login
                        </button>
                    </form>

                    {/* Forgot Password Link */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={onForgotPassword}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition"
                        >
                            Forgot your password?
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
