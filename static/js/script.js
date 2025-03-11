/**
 * Language Learning Companion
 * Main JavaScript file for client-side functionality
 */

// DOM loaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips if any
    initTooltips();
    
    // Initialize vocabulary flashcards if on vocabulary page
    if (document.querySelector('.flashcard-container')) {
        initFlashcards();
    }
    
    // Initialize progress charts if on progress page
    if (document.querySelector('.chart-container')) {
        initCharts();
    }
    
    // Initialize practice activities if on activities page
    if (document.querySelector('.activities-container')) {
        initActivities();
    }
});

/**
 * Initialize tooltips for elements with data-tooltip attribute
 */
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function(e) {
            const tooltipText = this.getAttribute('data-tooltip');
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            
            // Position the tooltip
            document.body.appendChild(tooltip);
            const rect = this.getBoundingClientRect();
            
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            
            // Store reference to tooltip
            this._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                document.body.removeChild(this._tooltip);
                this._tooltip = null;
            }
        });
    });
}

/**
 * Initialize vocabulary flashcards
 */
function initFlashcards() {
    const flashcardContainer = document.querySelector('.flashcard-container');
    const flashcards = document.querySelectorAll('.flashcard');
    let currentIndex = 0;
    
    // Show the first flashcard
    if (flashcards.length > 0) {
        flashcards[0].classList.add('active');
    }
    
    // Event listeners for navigation
    document.querySelector('.flashcard-nav-prev')?.addEventListener('click', () => {
        if (currentIndex > 0) {
            flashcards[currentIndex].classList.remove('active');
            currentIndex--;
            flashcards[currentIndex].classList.add('active');
            updateNavButtons();
        }
    });
    
    document.querySelector('.flashcard-nav-next')?.addEventListener('click', () => {
        if (currentIndex < flashcards.length - 1) {
            flashcards[currentIndex].classList.remove('active');
            currentIndex++;
            flashcards[currentIndex].classList.add('active');
            updateNavButtons();
        }
    });
    
    // Flip functionality
    flashcards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });
    
    // Update navigation button states
    function updateNavButtons() {
        const prevBtn = document.querySelector('.flashcard-nav-prev');
        const nextBtn = document.querySelector('.flashcard-nav-next');
        
        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = currentIndex === flashcards.length - 1;
        }
        
        // Update counter
        const counter = document.querySelector('.flashcard-counter');
        if (counter) {
            counter.textContent = `${currentIndex + 1} / ${flashcards.length}`;
        }
    }
    
    // Initial button state
    updateNavButtons();
    
    // Know/Don't Know buttons
    document.querySelector('.flashcard-know')?.addEventListener('click', function() {
        // Get current flashcard
        const currentCard = flashcards[currentIndex];
        const wordId = currentCard.getAttribute('data-word-id');
        
        // Update proficiency via API
        fetch('/api/update_vocabulary_proficiency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                word: currentCard.getAttribute('data-word'),
                change: 0.1
            }),
        })
        .then(response => response.json())
        .then(data => {
            // Visual feedback
            currentCard.classList.add('known');
            
            // Move to next card after a short delay
            setTimeout(() => {
                if (currentIndex < flashcards.length - 1) {
                    flashcards[currentIndex].classList.remove('active', 'flipped', 'known');
                    currentIndex++;
                    flashcards[currentIndex].classList.add('active');
                    updateNavButtons();
                } else {
                    // End of deck
                    flashcardContainer.innerHTML = `
                        <div class="flashcard-complete">
                            <h2>Good job!</h2>
                            <p>You've completed this flashcard deck.</p>
                            <button class="btn btn-primary" onclick="location.reload()">Start Over</button>
                        </div>
                    `;
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
    
    document.querySelector('.flashcard-dont-know')?.addEventListener('click', function() {
        // Get current flashcard
        const currentCard = flashcards[currentIndex];
        const wordId = currentCard.getAttribute('data-word-id');
        
        // Update proficiency via API
        fetch('/api/update_vocabulary_proficiency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                word: currentCard.getAttribute('data-word'),
                change: -0.05
            }),
        })
        .then(response => response.json())
        .then(data => {
            // Visual feedback
            currentCard.classList.add('unknown');
            
            // Move to next card after a short delay
            setTimeout(() => {
                if (currentIndex < flashcards.length - 1) {
                    flashcards[currentIndex].classList.remove('active', 'flipped', 'unknown');
                    currentIndex++;
                    flashcards[currentIndex].classList.add('active');
                    updateNavButtons();
                } else {
                    // End of deck
                    flashcardContainer.innerHTML = `
                        <div class="flashcard-complete">
                            <h2>Good job!</h2>
                            <p>You've completed this flashcard deck.</p>
                            <button class="btn btn-primary" onclick="location.reload()">Start Over</button>
                        </div>
                    `;
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
}

/**
 * Initialize activity generation
 */
function initActivities() {
    const activityTypeSelect = document.getElementById('activity-type');
    const topicSelect = document.getElementById('activity-topic');
    const generateBtn = document.getElementById('generate-activity');
    const activityContainer = document.getElementById('activity-container');
    
    generateBtn?.addEventListener('click', () => {
        const activityType = activityTypeSelect.value;
        const topic = topicSelect.value;
        
        // Show loading state
        activityContainer.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
                <p>Generating your activity...</p>
            </div>
        `;
        
        // Fetch activity from API
        fetch(`/api/practice_activity?type=${activityType}&topic=${encodeURIComponent(topic)}`)
            .then(response => response.json())
            .then(data => {
                // Render activity based on type
                let activityHtml = '';
                
                if (activityType === 'conversation') {
                    activityHtml = renderConversationActivity(data);
                } else if (activityType === 'fill-in-blanks') {
                    activityHtml = renderFillInBlanksActivity(data);
                } else if (activityType === 'reading') {
                    activityHtml = renderReadingActivity(data);
                }
                
                activityContainer.innerHTML = activityHtml;
                
                // Initialize activity-specific JS
                if (activityType === 'fill-in-blanks') {
                    initFillInBlanksActivity();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                activityContainer.innerHTML = `
                    <div class="error-message">
                        Failed to generate activity. Please try again.
                    </div>
                `;
            });
    });
    
    // Render functions for different activity types
    function renderConversationActivity(data) {
        return `
            <div class="activity-card conversation-activity">
                <h2>${data.title}</h2>
                <p class="activity-description">${data.description}</p>
                
                <div class="scenario-box">
                    <h3>Scenario</h3>
                    <p>${data.scenario}</p>
                </div>
                
                <div class="vocabulary-box">
                    <h3>Key Vocabulary</h3>
                    <ul class="vocab-list">
                        ${data.key_vocabulary.map(word => `<li>${word}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="phrases-box">
                    <h3>Useful Phrases</h3>
                    <ul class="phrase-list">
                        ${data.key_phrases.map(phrase => `<li>${phrase}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="questions-box">
                    <h3>Conversation Starters</h3>
                    <ul class="question-list">
                        ${data.questions.map(question => `<li>${question}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="activity-footer">
                    <a href="/conversation?topic=${encodeURIComponent(data.title)}" class="btn btn-primary">
                        Start Conversation
                    </a>
                </div>
            </div>
        `;
    }
    
    function renderFillInBlanksActivity(data) {
        return `
            <div class="activity-card fill-in-blanks-activity">
                <h2>${data.title}</h2>
                <p class="activity-description">${data.description}</p>
                
                <form id="fill-in-blanks-form">
                    <div class="text-with-blanks" id="text-with-blanks">
                        ${prepareTextWithBlanks(data.text, data.answers)}
                    </div>
                    
                    <div class="activity-footer">
                        <button type="submit" class="btn btn-primary">Check Answers</button>
                        <button type="button" id="show-answers" class="btn btn-secondary">Show Answers</button>
                    </div>
                </form>
                
                <div id="results" class="results-container hidden"></div>
            </div>
        `;
    }
    
    function renderReadingActivity(data) {
        return `
            <div class="activity-card reading-activity">
                <h2>${data.title}</h2>
                <p class="activity-description">${data.description}</p>
                
                <div class="reading-text">
                    ${data.text}
                </div>
                
                <div class="vocabulary-box">
                    <h3>Key Vocabulary</h3>
                    <ul class="vocab-list">
                        ${data.vocabulary.map(v => `
                            <li>
                                <strong>${v.word}</strong>: ${v.definition}
                                ${v.example ? `<p class="example">"${v.example}"</p>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="questions-box">
                    <h3>Comprehension Questions</h3>
                    <ol class="question-list">
                        ${data.questions.map(q => `<li>${q}</li>`).join('')}
                    </ol>
                </div>
            </div>
        `;
    }
    
    // Helper function to prepare fill-in-blanks text
    function prepareTextWithBlanks(text, answers) {
        let index = 0;
        
        // Replace ____ with input fields
        return text.replace(/____/g, () => {
            const answer = answers[index];
            const inputHtml = `
                <span class="blank-container">
                    <input type="text" class="blank-input" data-index="${index}" data-answer="${answer}">
                    <span class="feedback-icon"></span>
                </span>
            `;
            index++;
            return inputHtml;
        });
    }
    
    function initFillInBlanksActivity() {
        const form = document.getElementById('fill-in-blanks-form');
        const showAnswersBtn = document.getElementById('show-answers');
        const resultsContainer = document.getElementById('results');
        
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Check answers
            const inputs = document.querySelectorAll('.blank-input');
            let correctCount = 0;
            
            inputs.forEach(input => {
                const userAnswer = input.value.trim().toLowerCase();
                const correctAnswer = input.getAttribute('data-answer').toLowerCase();
                
                if (userAnswer === correctAnswer) {
                    input.classList.add('correct');
                    input.classList.remove('incorrect');
                    input.closest('.blank-container').querySelector('.feedback-icon').textContent = '✓';
                    correctCount++;
                } else {
                    input.classList.add('incorrect');
                    input.classList.remove('correct');
                    input.closest('.blank-container').querySelector('.feedback-icon').textContent = '✗';
                }
            });
            
            // Show results
            resultsContainer.innerHTML = `
                <div class="results-summary">
                    <h3>Results</h3>
                    <p>You got ${correctCount} out of ${inputs.length} correct!</p>
                    <div class="score-meter">
                        <div class="score-fill" style="width: ${(correctCount / inputs.length) * 100}%"></div>
                    </div>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
        });
        
        showAnswersBtn?.addEventListener('click', () => {
            const inputs = document.querySelectorAll('.blank-input');
            
            inputs.forEach(input => {
                const correctAnswer = input.getAttribute('data-answer');
                input.value = correctAnswer;
                input.classList.add('shown-answer');
                input.setAttribute('readonly', true);
            });
        });
    }
}

/**
 * Initialize progress charts
 */
function initCharts() {
    // This is a placeholder for chart initialization
    // In a real application, you would use a charting library like Chart.js
    console.log('Charts would be initialized here');
}

/**
 * Add a new vocabulary word
 */
function addVocabulary(word, translation) {
    return fetch('/api/add_vocabulary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            word: word,
            translation: translation
        }),
    })
    .then(response => response.json());
}

/**
 * Translate text using the API
 */
function translateText(text, sourceLang, targetLang) {
    return fetch('/api/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            source_lang: sourceLang,
            target_lang: targetLang
        }),
    })
    .then(response => response.json())
    .then(data => data.translation);
}

/**
 * Get vocabulary suggestions
 */
function getVocabularySuggestions(topic, count) {
    return fetch(`/api/vocabulary_suggestions?topic=${encodeURIComponent(topic)}&count=${count}`)
        .then(response => response.json())
        .then(data => data.suggestions);
}
// Add this to your script.js file or in a new <script> tag at the end of your HTML
document.addEventListener('DOMContentLoaded', function() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    
    // Check if user previously enabled dark mode
    if (localStorage.getItem('darkMode') === 'enabled') {
      document.body.classList.add('dark-mode');
      themeCheckbox.checked = true;
    }
    
    // Listen for toggle changes
    themeCheckbox.addEventListener('change', function() {
      if (this.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
      }
    });
  });