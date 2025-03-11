/**
 * Improved text-to-speech functionality that works with translation and romanization
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add speech buttons to all messages
    addSpeechButtons();
    
    // Listen for new messages being added
    observeNewMessages();
  });
  
  // Add speech buttons to all message content
  function addSpeechButtons() {
    const messages = document.querySelectorAll('.message');
    
    messages.forEach(message => {
      const messageContent = message.querySelector('.message-content');
      if (messageContent && !message.querySelector('.speak-button')) {
        addSpeechButtonToMessage(message, messageContent);
      }
    });
  }
  
  // Add a speech button to a message
  function addSpeechButtonToMessage(messageElement, contentElement) {
    // Create the button
    const speakButton = document.createElement('button');
    speakButton.className = 'speak-button';
    speakButton.innerHTML = '<span class="speak-icon">🔊</span>';
    speakButton.title = 'Listen to pronunciation';
    
    // Add the button to the message (not inside the content)
    messageElement.appendChild(speakButton);
    
    // Add click event listener
    speakButton.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event bubbling
      
      // Get the original text content (before translation/romanization)
      let text;
      
      // Check if message is translated or romanized
      const originalText = contentElement.querySelector('.original-text');
      if (originalText) {
        // Use original text if available
        text = originalText.textContent.trim();
      } else {
        // Use the message content directly
        text = contentElement.textContent.replace('🔊', '').trim();
      }
      
      const language = document.querySelector('meta[name="target-language"]')?.content || 'en';
      
      // Call server to generate speech
      useServerTTS(text, language, speakButton);
    });
  }
  
  // Use server-side TTS for reliable cross-language support
  function useServerTTS(text, language, buttonElement) {
    // Show loading state
    buttonElement.classList.add('loading');
    buttonElement.innerHTML = '<span class="speak-icon">⏳</span>';
    
    // Call server API
    fetch('/api/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        language: language
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      
      // Reset button
      buttonElement.classList.remove('loading');
      buttonElement.innerHTML = '<span class="speak-icon">🔊</span>';
      
      // Create and play audio
      const audio = new Audio(data.audio_url);
      
      // Show playing state
      audio.onplay = function() {
        buttonElement.classList.add('playing');
      };
      
      // Reset when done
      audio.onended = function() {
        buttonElement.classList.remove('playing');
      };
      
      audio.play().catch(error => {
        console.error('Audio playback error:', error);
        buttonElement.classList.remove('playing');
        alert('Audio playback failed. Please try again.');
      });
    })
    .catch(error => {
      console.error('Speech synthesis error:', error);
      buttonElement.classList.remove('loading');
      buttonElement.innerHTML = '<span class="speak-icon">❌</span>';
      
      // Reset button after error
      setTimeout(() => {
        buttonElement.innerHTML = '<span class="speak-icon">🔊</span>';
      }, 2000);
    });
  }
  
  // Observe for new messages being added to the conversation
  function observeNewMessages() {
    const conversationContainer = document.querySelector('.conversation-messages');
    if (!conversationContainer) return;
    
    // Create a MutationObserver to watch for new messages
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Look for new messages and add speech buttons
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.classList.contains('message')) { // Message element
              const messageContent = node.querySelector('.message-content');
              if (messageContent && !node.querySelector('.speak-button')) {
                addSpeechButtonToMessage(node, messageContent);
              }
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(conversationContainer, { childList: true, subtree: true });
  }
  
  // Additional observer for translation and romanization changes
  document.addEventListener('DOMContentLoaded', function() {
    // Watch for changes in message content (like translation or romanization)
    const messageObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          // If content changed but speech button is missing, add it back
          const message = mutation.target.closest('.message');
          if (message && !message.querySelector('.speak-button')) {
            const messageContent = message.querySelector('.message-content');
            if (messageContent) {
              addSpeechButtonToMessage(message, messageContent);
            }
          }
        }
      });
    });
    
    // Observe all message contents
    document.querySelectorAll('.message-content').forEach(content => {
      messageObserver.observe(content, { childList: true, subtree: true });
    });
  });
  
  // Hook into translation and romanization toggles
  document.addEventListener('DOMContentLoaded', function() {
    const translateToggle = document.getElementById('translate-toggle');
    const romanizeToggle = document.getElementById('romanize-toggle');
    
    // When translation is toggled, check buttons
    if (translateToggle) {
      translateToggle.addEventListener('click', function() {
        // Wait a moment for the DOM to update
        setTimeout(function() {
          // Check if any messages are missing speech buttons
          document.querySelectorAll('.message').forEach(message => {
            if (!message.querySelector('.speak-button')) {
              const messageContent = message.querySelector('.message-content');
              if (messageContent) {
                addSpeechButtonToMessage(message, messageContent);
              }
            }
          });
        }, 100);
      });
    }
    
    // When romanization is toggled, check buttons
    if (romanizeToggle) {
      romanizeToggle.addEventListener('click', function() {
        // Wait a moment for the DOM to update
        setTimeout(function() {
          // Check if any messages are missing speech buttons
          document.querySelectorAll('.message').forEach(message => {
            if (!message.querySelector('.speak-button')) {
              const messageContent = message.querySelector('.message-content');
              if (messageContent) {
                addSpeechButtonToMessage(message, messageContent);
              }
            }
          });
        }, 100);
      });
    }
  });