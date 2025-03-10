/**
 * Activity generation functionality for Language Learning Companion
 */

// Initialize activities when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initActivities();
});

/**
 * Initialize activity generation
 */
function initActivities() {
    const activityTypeSelect = document.getElementById('activity-type');
    const topicSelect = document.getElementById('activity-topic');
    const generateBtn = document.getElementById('generate-activity');
    const activityContainer = document.getElementById('activity-container');
    
    if (!generateBtn || !activityContainer) {
        // Not on the activities page
        return;
    }
    
    // Add event listener for the generate button
    generateBtn.addEventListener('click', function() {
        // Show loading state
        activityContainer.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
                <p>Generating your personalized activity...</p>
            </div>
        `;
        
        // Get selected values
        const activityType = activityTypeSelect.value;
        const topic = topicSelect.value;
        
        // Fetch activity from API
        fetch(`/api/practice_activity?type=${activityType}&topic=${encodeURIComponent(topic)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Activity data received:', data);
                
                // Generate appropriate HTML based on activity type
                if (activityType === 'conversation') {
                    activityContainer.innerHTML = renderConversationActivity(data);
                } else if (activityType === 'fill-in-blanks') {
                    activityContainer.innerHTML = renderFillInBlanksActivity(data);
                    initFillInBlanksActivity();
                } else if (activityType === 'reading') {
                    activityContainer.innerHTML = renderReadingActivity(data);
                } else {
                    activityContainer.innerHTML = `
                        <div class="error-message">
                            <p>Unsupported activity type: ${activityType}</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error fetching activity:', error);
                activityContainer.innerHTML = `
                    <div class="error-message">
                        <p>Sorry, there was an error generating the activity.</p>
                        <p>Technical details: ${error.message}</p>
                        <button class="btn btn-primary" onclick="initActivities()">Try Again</button>
                    </div>
                `;
            });
    });
}

/**
 * Render a conversation practice activity
 */
function renderConversationActivity(data) {
    if (!data || data.error) {
        return `
            <div class="error-message">
                <p>Sorry, there was an error generating the conversation activity.</p>
                <p>${data.error || 'Unknown error'}</p>
            </div>
        `;
    }
    
    const title = data.title || 'Conversation Practice';
    const description = data.description || 'Practice your language skills with this conversation activity.';
    const scenario = data.scenario || 'General conversation practice.';
    const keyVocabulary = data.key_vocabulary || [];
    const keyPhrases = data.key_phrases || [];
    const questions = data.questions || [];
    const hints = data.hints || [];
    
    return `
        <div class="activity-card conversation-activity">
            <h2>${title}</h2>
            <p class="activity-description">${description}</p>
            
            <div class="scenario-box">
                <h3>Scenario</h3>
                <p>${scenario}</p>
            </div>
            
            ${keyVocabulary.length > 0 ? `
                <div class="vocabulary-box">
                    <h3>Key Vocabulary</h3>
                    <ul class="vocab-list">
                        ${keyVocabulary.map(word => `<li>${word}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${keyPhrases.length > 0 ? `
                <div class="phrases-box">
                    <h3>Useful Phrases</h3>
                    <ul class="phrase-list">
                        ${keyPhrases.map(phrase => `<li>${phrase}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${questions.length > 0 ? `
                <div class="questions-box">
                    <h3>Conversation Starters</h3>
                    <ul class="question-list">
                        ${questions.map(question => `<li>${question}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${hints.length > 0 ? `
                <div class="hints-box">
                    <h3>Helpful Hints</h3>
                    <ul class="hint-list">
                        ${hints.map(hint => `<li>${hint}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="activity-footer">
                <a href="/conversation?topic=${encodeURIComponent(title)}" class="btn btn-primary">
                    Start Conversation
                </a>
            </div>
        </div>
    `;
}

/**
 * Render a fill-in-the-blanks activity
 */
function renderFillInBlanksActivity(data) {
    if (!data || data.error) {
        return `
            <div class="error-message">
                <p>Sorry, there was an error generating the fill-in-the-blanks activity.</p>
                <p>${data.error || 'Unknown error'}</p>
            </div>
        `;
    }
    
    const title = data.title || 'Fill in the Blanks';
    const description = data.description || 'Practice your vocabulary and grammar by filling in the blanks.';
    const text = data.text || '';
    const answers = data.answers || [];
    const hints = data.hints || [];
    
    // Replace the blanks with input fields
    const textWithBlanks = prepareTextWithBlanks(text, answers);
    
    return `
        <div class="activity-card fill-in-blanks-activity">
            <h2>${title}</h2>
            <p class="activity-description">${description}</p>
            
            <form id="fill-in-blanks-form">
                <div class="text-with-blanks" id="text-with-blanks">
                    ${textWithBlanks}
                </div>
                
                ${hints.length > 0 ? `
                    <div class="hints-box">
                        <h3>Hints</h3>
                        <ul class="hint-list">
                            ${hints.map(hint => `<li>${hint}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="activity-footer">
                    <button type="submit" class="btn btn-primary">Check Answers</button>
                    <button type="button" id="show-answers" class="btn btn-secondary">Show Answers</button>
                </div>
            </form>
            
            <div id="results" class="results-container hidden"></div>
        </div>
    `;
}

/**
 * Render a reading comprehension activity
 */
function renderReadingActivity(data) {
    if (!data || data.error) {
        return `
            <div class="error-message">
                <p>Sorry, there was an error generating the reading activity.</p>
                <p>${data.error || 'Unknown error'}</p>
            </div>
        `;
    }
    
    const title = data.title || 'Reading Comprehension';
    const description = data.description || 'Improve your reading skills with this exercise.';
    const text = data.text || '';
    const questions = data.questions || [];
    const vocabulary = data.vocabulary || [];
    
    return `
        <div class="activity-card reading-activity">
            <h2>${title}</h2>
            <p class="activity-description">${description}</p>
            
            <div class="reading-text">
                ${text}
            </div>
            
            ${vocabulary.length > 0 ? `
                <div class="vocabulary-box">
                    <h3>Key Vocabulary</h3>
                    <ul class="vocab-list">
                        ${vocabulary.map(v => `
                            <li>
                                <strong>${v.word}</strong>: ${v.definition || ''}
                                ${v.example ? `<p class="example">"${v.example}"</p>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${questions.length > 0 ? `
                <div class="questions-box">
                    <h3>Comprehension Questions</h3>
                    <ol class="question-list">
                        ${questions.map(q => `<li>${q}</li>`).join('')}
                    </ol>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Helper function to prepare fill-in-blanks text
 */
function prepareTextWithBlanks(text, answers) {
    let index = 0;
    
    // Replace ____ with input fields
    return text.replace(/____/g, function() {
        const answer = answers[index] || '';
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

/**
 * Initialize fill-in-blanks activity interactions
 */
function initFillInBlanksActivity() {
    const form = document.getElementById('fill-in-blanks-form');
    const showAnswersBtn = document.getElementById('show-answers');
    const resultsContainer = document.getElementById('results');
    
    if (!form || !showAnswersBtn || !resultsContainer) {
        console.error('Fill-in-blanks elements not found');
        return;
    }
    
    // Check answers on form submission
    form.addEventListener('submit', function(e) {
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
    
    // Show answers button
    showAnswersBtn.addEventListener('click', function() {
        const inputs = document.querySelectorAll('.blank-input');
        
        inputs.forEach(input => {
            const correctAnswer = input.getAttribute('data-answer');
            input.value = correctAnswer;
            input.classList.add('shown-answer');
            input.setAttribute('readonly', true);
        });
    });
}