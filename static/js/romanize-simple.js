// Create a new file: static/js/romanize-simple.js

// Keep track of romanization state
let isRomanized = false;

// Initialize romanization when document is ready
document.addEventListener('DOMContentLoaded', function() {
    const romanizeBtn = document.getElementById('romanize-toggle');
    if (!romanizeBtn) return;
    
    romanizeBtn.addEventListener('click', function() {
        isRomanized = !isRomanized;
        
        if (isRomanized) {
            romanizeMessages();
            romanizeBtn.textContent = 'Hide Romanization';
        } else {
            unromanizeMessages();
            romanizeBtn.textContent = 'Show Romanization';
        }
    });
});

// Romanize all messages
function romanizeMessages() {
    const messages = document.querySelectorAll('.message-content');
    const targetLanguage = document.querySelector('meta[name="target-language"]')?.content || 'unknown';
    
    messages.forEach(message => {
        const originalText = message.textContent.trim();
        if (!originalText) return;
        
        // Mark message as being processed
        message.dataset.romanizing = 'true';
        message.innerHTML = `<div class="original-text">${originalText}</div>
                            <div class="romanized-text">Romanizing...</div>`;
        
        // Call API to romanize
        fetch('/api/romanize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: originalText,
                language: targetLanguage
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            
            // Update with romanized text if still in romanized mode
            if (isRomanized && message.dataset.romanizing === 'true') {
                message.innerHTML = `<div class="original-text">${originalText}</div>
                                    <div class="romanized-text">${data.romanized}</div>`;
            }
        })
        .catch(error => {
            console.error('Romanization error:', error);
            message.innerHTML = `<div class="original-text">${originalText}</div>
                                <div class="romanized-text error">Romanization failed</div>`;
        })
        .finally(() => {
            message.dataset.romanizing = 'false';
        });
    });
}

// Restore original message content
function unromanizeMessages() {
    const messages = document.querySelectorAll('.message-content');
    
    messages.forEach(message => {
        const originalText = message.querySelector('.original-text')?.textContent;
        if (originalText) {
            message.innerHTML = originalText;
        }
    });
}