import { useState, useEffect } from 'react';
import { authService } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('login');
  const [languages] = useState({
    en: 'English', 
    es: 'Spanish', 
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ru: 'Russian',
    // Add other languages as needed
  });
  
  // Form states
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    native_language: 'en',
    target_language: 'es'
  });
  
  // Error states
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  // Authentication check state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthentication = async () => {
      setIsCheckingAuth(true);
      try {
        const { authenticated } = await authService.verifyToken();
        if (authenticated) {
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Clear any invalid credentials
        authService.logout();
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthentication();
  }, []);

  const handleLoginChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    
    try {
      await authService.login(loginForm.username, loginForm.password);
      window.location.href = '/dashboard';
    } catch (error) {
      setLoginError(error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setRegisterError('');
    
    try {
      await authService.register(registerForm);
      window.location.href = '/dashboard';
    } catch (error) {
      setRegisterError(error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If still checking authentication, show loading indicator
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-blue-500" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-8">
          <div className="logo">
            <h1 className="text-4xl font-bold text-blue-500">Language Learning Companion</h1>
            <p className="text-gray-600 mt-2">Your AI-powered language learning partner</p>
          </div>
        </header>
        
        <main>
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden mb-12">
            <div className="flex border-b">
              <button 
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'login' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
              >
                Login
              </button>
              <button 
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'register' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
              >
                Register
              </button>
            </div>
            
            <div className="p-6">
              {activeTab === 'login' ? (
                <form onSubmit={handleLoginSubmit}>
                  {loginError && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                      {loginError}
                    </div>
                  )}
                  <div className="mb-4">
                    <label htmlFor="username" className="block text-gray-700 font-medium mb-2">Username</label>
                    <input 
                      type="text" 
                      id="username" 
                      name="username" 
                      value={loginForm.username}
                      onChange={handleLoginChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required 
                    />
                  </div>
                  <div className="mb-6">
                    <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
                    <input 
                      type="password" 
                      id="password" 
                      name="password" 
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit}>
                  {registerError && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                      {registerError}
                    </div>
                  )}
                  <div className="mb-4">
                    <label htmlFor="reg-username" className="block text-gray-700 font-medium mb-2">Username</label>
                    <input 
                      type="text" 
                      id="reg-username" 
                      name="username" 
                      value={registerForm.username}
                      onChange={handleRegisterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="reg-password" className="block text-gray-700 font-medium mb-2">Password</label>
                    <input 
                      type="password" 
                      id="reg-password" 
                      name="password" 
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="native-language" className="block text-gray-700 font-medium mb-2">Native Language</label>
                    <select 
                      id="native-language" 
                      name="native_language"
                      value={registerForm.native_language}
                      onChange={handleRegisterChange} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required
                    >
                      {Object.entries(languages).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="target-language" className="block text-gray-700 font-medium mb-2">Language to Learn</label>
                    <select 
                      id="target-language" 
                      name="target_language"
                      value={registerForm.target_language}
                      onChange={handleRegisterChange} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required
                    >
                      {Object.entries(languages).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Registering...' : 'Register'}
                  </button>
                </form>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 transition transform hover:translate-y-[-5px]">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Natural Conversations</h3>
                <p className="text-gray-600">Practice real conversations with our AI assistant that adapts to your level</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 transition transform hover:translate-y-[-5px]">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Vocabulary Tracking</h3>
                <p className="text-gray-600">Automatically track words you know and words you need to practice</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 transition transform hover:translate-y-[-5px]">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Progress Monitoring</h3>
                <p className="text-gray-600">See your improvement over time with detailed progress reports</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 transition transform hover:translate-y-[-5px]">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Personalized Learning</h3>
                <p className="text-gray-600">Get customized recommendations based on your learning style and goals</p>
              </div>
            </div>
          </div>
        </main>
        
        <footer className="mt-12 text-center text-gray-500 py-4">
          <p>&copy; 2025 Language Learning Companion</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
