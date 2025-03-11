/**
 * Enhanced rendering function for fill-in-the-blanks activities
 */

function renderFillInBlanksActivity(data) {
    // Error handling
    if (!data || data.error) {
        return `
            <div class="error-message">
                <p>Sorry, there was an error generating the fill-in-the-blanks activity.</p>
                <p>${data?.error || 'Unknown error'}</p>
            </div>
        `;
    }
    
    console.log("Fill-in-blanks activity data:", data); // Debug logging
    
    // Get language from current session
    const targetLanguage = document.getElementById('target-language-code')?.value || 'en';
    const showRomanization = needsRomanization(targetLanguage) && data.romanization;
    
    // Extract data with fallbacks
    const title = data.title || 'Fill in the Blanks';
    const description = data.description || 'Practice by filling in the missing words.';
    const text = data.text || 'This is a ____ with ____ blanks.';
    const answers = data.answers || ['sample', 'empty'];
    const hints = data.hints || [];
    
    // Get romanization data if available
    const romanization = data.romanization || {};
    const romanizedText = romanization.text || '';
    const romanizedAnswers = romanization.answers || [];
    
    // Prepare text with blanks
    const textWithBlanks = prepareTextWithBlanks(text, answers, romanizedText);
    
    return `
        <div class="activity-card fill-in-blanks-activity">
            <h2>${title}</h2>
            <p class="activity-description">${description}</p>
            
            <form id="fill-in-blanks-form" class="fill-in-form">
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
 * Helper function to prepare text with blanks, including romanization if needed
 */
function prepareTextWithBlanks(text, answers, romanizedText = '') {
    if (!text || !answers || !Array.isArray(answers)) {
        console.error("Invalid text or answers for fill-in-blanks activity");
        return "Error preparing activity";
    }
    
    let index = 0;
    
    // Handle case where there are no blanks in the text
    if (!text.includes('____')) {
        console.warn("Text has no blanks, adding some");
        // Add a few blanks to the text
        const words = text.split(' ');
        if (words.length > 5) {
            // Add blanks at positions 2, 5, and 8 if text is long enough
            const positions = [2, 5, 8].filter(pos => pos < words.length);
            for (let pos of positions) {
                if (pos < words.length) {
                    words[pos] = '____';
                }
            }
            text = words.join(' ');
        }
    }
    
    // Split romanized text into lines if provided
    const romanizedLines = romanizedText ? romanizedText.split('\n') : [];
    
    // Process text line by line to handle multiline text properly
    const textLines = text.split('\n');
    const processedLines = textLines.map((line, lineIndex) => {
        const romanizedLine = lineIndex < romanizedLines.length ? romanizedLines[lineIndex] : '';
        
        // Replace blanks with input fields
        return line.replace(/____/g, () => {
            const answer = index < answers.length ? answers[index] : `answer${index + 1}`;
            const inputHtml = `
                <span class="blank-container">
                    <input type="text" class="blank-input" data-index="${index}" data-answer="${answer}">
                    <span class="feedback-icon"></span>
                </span>
            `;
            index++;
            return inputHtml;
        });
    });
    
    // Add romanization display if available
    if (romanizedText) {
        return `
            <div class="original-text">${processedLines.join('<br>')}</div>
            <div class="romanized-text">${romanizedLines.join('<br>')}</div>
        `;
    } else {
        return processedLines.join('<br>');
    }
}

/**
 * Initialize fill-in-blanks activity behavior
 */
function initFillInBlanksActivity() {
    const form = document.getElementById('fill-in-blanks-form');
    const showAnswersBtn = document.getElementById('show-answers');
    const resultsContainer = document.getElementById('results');
    
    if (!form || !showAnswersBtn || !resultsContainer) {
        console.error("Could not find fill-in-blanks elements");
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

/**
 * Check if we need to show romanization for this language
 */
function needsRomanization(language) {
    const nonLatinScripts = ["ja", "zh", "ko", "ru", "ar", "th", "he", "el", "uk", "bn", "hi"];
    return nonLatinScripts.includes(language);
}