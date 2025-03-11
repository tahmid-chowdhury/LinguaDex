// Dark Mode Toggle Function
function toggleDarkMode() {
    // Toggle dark mode class on body
    document.body.classList.toggle('dark-mode');
    
    // Store user preference in localStorage
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update toggle button text
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.innerHTML = isDarkMode ? 
            '<span class="icon">☀️</span> Light Mode' : 
            '<span class="icon">🌙</span> Dark Mode';
    }
}

// Initialize dark mode based on user preference
function initDarkMode() {
    // Add the toggle button to the sidebar footer
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter) {
        const darkModeButton = document.createElement('button');
        darkModeButton.id = 'dark-mode-toggle';
        darkModeButton.className = 'dark-mode-toggle';
        darkModeButton.innerHTML = '<span class="icon">🌙</span> Dark Mode';
        darkModeButton.addEventListener('click', toggleDarkMode);
        sidebarFooter.prepend(darkModeButton);
    }
    
    // Check for saved preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        
        // Update button text if it exists
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = '<span class="icon">☀️</span> Light Mode';
        }
    }
}

// Add dark mode CSS
function addDarkModeStyles() {
    const darkModeStyles = document.createElement('style');
    darkModeStyles.textContent = `
        /* Dark mode variables */
        body.dark-mode {
            --background-color: #1a1a2e;
            --text-color: #e6e6e6;
            --card-bg: #16213e;
            --sidebar-bg: #0f3460;
            --header-bg: #1e2a4a;
            --border-color: #2a3c63;
            --highlight-color: #4361ee;
            --secondary-color: #3a0ca3;
            --success-color: #2ecc71;
            --warning-color: #f39c12;
            --danger-color: #e63946;
            --muted-text: #a0a0a0;
            --input-bg: #2c3e50;
            --hover-bg: #2c3e55;
        }
        
        /* Apply dark mode */
        body.dark-mode {
            background-color: var(--background-color);
            color: var(--text-color);
        }
        
        /* Sidebar */
        body.dark-mode .sidebar {
            background-color: var(--sidebar-bg);
        }
        
        body.dark-mode .sidebar-header,
        body.dark-mode .user-info,
        body.dark-mode .sidebar-footer {
            border-color: var(--border-color);
        }
        
        /* Headers */
        body.dark-mode h1, 
        body.dark-mode h2, 
        body.dark-mode h3, 
        body.dark-mode h4, 
        body.dark-mode h5, 
        body.dark-mode h6 {
            color: var(--text-color);
        }
        
        /* Cards & containers */
        body.dark-mode .dashboard-card,
        body.dark-mode .conversation-sidebar,
        body.dark-mode .message-input-container,
        body.dark-mode .activity-card,
        body.dark-mode .activity-generator,
        body.dark-mode .activity-display,
        body.dark-mode .summary-card,
        body.dark-mode .chart-card,
        body.dark-mode .vocabulary-stats,
        body.dark-mode .activity-cards,
        body.dark-mode .daily-progress-container,
        body.dark-mode .results-container,
        body.dark-mode .hints-container,
        body.dark-mode .vocab-card,
        body.dark-mode .settings-card {
            background-color: var(--card-bg);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        /* Headers */
        body.dark-mode .content-header {
            background-color: var(--header-bg);
            border-color: var(--border-color);
        }
        
        /* Messages */
        body.dark-mode .ai-message {
            background-color: var(--card-bg);
            color: var(--text-color);
        }
        
        body.dark-mode .user-message {
            background-color: var(--highlight-color);
            color: white;
        }
        
        /* Inputs */
        body.dark-mode input,
        body.dark-mode select,
        body.dark-mode textarea {
            background-color: var(--input-bg);
            color: var(--text-color);
            border-color: var(--border-color);
        }
        
        /* Minor elements */
        body.dark-mode .topic-list li a,
        body.dark-mode .conversation-link,
        body.dark-mode .recommendation-item,
        body.dark-mode .practice-option,
        body.dark-mode .topic-link,
        body.dark-mode .suggestion-item,
        body.dark-mode .vocabulary-item,
        body.dark-mode .word-item {
            background-color: var(--card-bg);
            color: var(--text-color);
        }
        
        body.dark-mode .topic-list li a:hover,
        body.dark-mode .conversation-link:hover,
        body.dark-mode .practice-option:hover,
        body.dark-mode .topic-link:hover,
        body.dark-mode .word-item:hover {
            background-color: var(--hover-bg);
        }
        
        /* Progress bars */
        body.dark-mode .progress-bar {
            background-color: var(--border-color);
        }
        
        /* Meta text */
        body.dark-mode .stat-label,
        body.dark-mode .conversation-date,
        body.dark-mode .date,
        body.dark-mode .translation,
        body.dark-mode .vocab-level,
        body.dark-mode .suggestion-example,
        body.dark-mode .error-explanation {
            color: var(--muted-text);
        }
        
        /* Dark mode toggle button */
        .dark-mode-toggle {
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.7);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            transition: all 0.2s;
        }
        
        .dark-mode-toggle:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
        }
        
        body.dark-mode .dark-mode-toggle {
            border-color: rgba(255, 255, 255, 0.3);
        }
    `;
    
    document.head.appendChild(darkModeStyles);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addDarkModeStyles();
    initDarkMode();
});