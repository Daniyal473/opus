import React from 'react';
import { LogOut, Key, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  onLogout?: () => void;
  onResetPassword?: () => void;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userName = 'Admin', onLogout, onResetPassword, onBack }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>

        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 border border-blue-200"
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Back</span>
            </button>
          )}

          <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{userName}</span>
          </div>

          {onResetPassword && (
            <button
              onClick={onResetPassword}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 border border-blue-200"
            >
              <Key size={18} />
              <span className="font-medium">Reset Password</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 border border-blue-200"
            >
              <LogOut size={18} />
              <span className="font-medium">LOGOUT</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
