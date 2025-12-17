import { useState, useEffect, useCallback } from 'react'
import { SignIn } from './components/auth/SignIn'
import { ForgotPassword } from './components/auth/ForgotPassword'
import { ResetPassword } from './components/auth/ResetPassword'
import { RentalConsole } from './components/rental/RentalConsole'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { Toast } from './components/ui/Toast'
import { WifiOff, RefreshCw } from 'lucide-react'
import './App.css'
import { API_BASE_URL } from './services/api'

const INACTIVITY_TIMEOUT = 600000; // 10 minutes

function App() {
  const [loginError, setLoginError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<'signin' | 'forgot-password' | 'dashboard' | 'admin' | 'reset-password'>('signin');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'blue' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [resetToken, setResetToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check for reset token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setResetToken(token);
      setCurrentPage('reset-password');
    }
  }, []);

  // Monitor internet connection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.clear();
    setCurrentUser(null);
    setCurrentPage('signin');
  }, []);

  // Inactivity timer
  useEffect(() => {
    if (currentPage !== 'dashboard' && currentPage !== 'admin') return;

    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      sessionStorage.setItem('lastActivity', Date.now().toString());

      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout();
        setToast({ message: 'Logged out due to inactivity', type: 'error' });
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentPage, handleLogout]);

  useEffect(() => {
    const savedPage = sessionStorage.getItem('currentPage');
    const lastActivity = sessionStorage.getItem('lastActivity');
    const savedUser = sessionStorage.getItem('user');

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }

    if (savedPage) {
      if (savedPage === 'dashboard' || savedPage === 'admin') {
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity);

          if (elapsed < INACTIVITY_TIMEOUT) {
            setIsLoading(true);
            setCurrentPage(savedPage as 'dashboard' | 'admin');
            setTimeout(() => setIsLoading(false), 500);
          } else {
            sessionStorage.clear();
            setToast({ message: 'Session expired due to inactivity', type: 'error' });
          }
        }
      } else if (savedPage === 'forgot-password') {
        setIsLoading(true);
        setCurrentPage('forgot-password');
        setTimeout(() => setIsLoading(false), 500);
      }
    }
  }, []);

  const handleSignIn = async (username: string, password: string) => {
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoading(true);
        sessionStorage.setItem('lastActivity', Date.now().toString());
        sessionStorage.setItem('currentPage', 'dashboard');
        sessionStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setTimeout(() => {
          setCurrentPage('dashboard');
          setIsLoading(false);
        }, 300);
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (error) {
      setToast({ message: 'An error occurred during login', type: 'error' });
    }
  };

  const handlePageChange = (page: 'admin' | 'dashboard' | 'forgot-password') => {
    if (page === 'admin' || page === 'dashboard') {
      setIsLoading(true);
    }
    sessionStorage.setItem('currentPage', page);
    sessionStorage.setItem('lastActivity', Date.now().toString());
    setTimeout(() => {
      setCurrentPage(page);
      setIsLoading(false);
    }, 300);
  };

  const handleRetry = () => {
    setIsOnline(navigator.onLine);
    window.location.reload();
  };

  // Offline screen
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <WifiOff size={48} className="text-gray-500" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">No Internet</h1>

          <p className="text-gray-600 mb-2">
            Please check your internet connection and try again.
          </p>

          <p className="text-gray-500 text-sm mb-8">
            Make sure you're connected to the internet to access the dashboard.
          </p>

          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <RefreshCw size={20} />
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {currentPage === 'dashboard' ? (
        <RentalConsole
          onLogout={handleLogout}
          onAdminPanelClick={() => handlePageChange('admin')}
          userRole={currentUser?.role}
        />
      ) : currentPage === 'admin' ? (
        <AdminDashboard
          onLogout={handleLogout}
          onResetPassword={() => handlePageChange('forgot-password')}
          onBack={() => handlePageChange('dashboard')}
          username="Admin"
        />
      ) : currentPage === 'signin' ? (
        <SignIn
          onSignIn={handleSignIn}
          onForgotPassword={() => {
            sessionStorage.setItem('currentPage', 'forgot-password');
            setCurrentPage('forgot-password');
          }}
          error={loginError}
          onClearError={() => setLoginError('')}
        />
      ) : currentPage === 'reset-password' ? (
        <ResetPassword
          token={resetToken}
          onBack={() => {
            window.history.replaceState({}, '', '/');
            setCurrentPage('signin');
          }}
        />
      ) : (
        <ForgotPassword onBack={() => {
          sessionStorage.removeItem('currentPage');
          setCurrentPage('signin');
        }} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default App
