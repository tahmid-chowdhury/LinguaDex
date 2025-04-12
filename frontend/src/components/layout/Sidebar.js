import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  // Mock user data - in a real app, this would come from context or props
  const [user] = useState({
    username: 'User',
    target_language: 'es',
    current_level: 'Beginner'
  });

  const [languages] = useState({
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    // Add other languages as needed
  });

  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // In a real implementation, you'd update a global dark mode state
  };

  // Navigation links
  const navigationLinks = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/conversation', icon: '💬', label: 'Conversation' },
    { path: '/vocabulary', icon: '📚', label: 'Vocabulary' },
    { path: '/activities', icon: '🎮', label: 'Activities' },
    { path: '/progress', icon: '📈', label: 'Progress' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <nav className="w-64 bg-slate-800 text-white flex flex-col h-screen">
      <div className="p-6 text-center border-b border-slate-700">
        <h2 className="text-xl font-semibold">Language Companion</h2>
      </div>
      
      <div className="p-6 flex items-center space-x-4 border-b border-slate-700">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
          {user.username[0]}
        </div>
        <div>
          <h3 className="font-medium">{user.username}</h3>
          <p className="text-sm text-slate-300">Learning: {languages[user.target_language]}</p>
          <p className="text-sm text-slate-300">Level: {user.current_level}</p>
        </div>
      </div>
      
      <ul className="py-6 flex-1">
        {navigationLinks.map(link => (
          <li key={link.path} className={location.pathname === link.path ? 'bg-blue-500' : ''}>
            <Link 
              to={link.path}
              className={`flex items-center px-6 py-3 transition hover:bg-slate-700 ${
                location.pathname === link.path ? 'text-white' : 'text-slate-300'
              }`}
            >
              <span className="mr-3">{link.icon}</span> {link.label}
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="p-6 border-t border-slate-700">
        <button 
          onClick={toggleDarkMode}
          className="flex items-center px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 transition w-full mb-4"
        >
          <span className="mr-2">{darkMode ? '☀️' : '🌙'}</span>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        
        <Link 
          to="/logout" 
          className="flex items-center text-slate-300 hover:text-white transition"
        >
          <span className="mr-2">🚪</span> Logout
        </Link>
      </div>
    </nav>
  );
}

export default Sidebar;