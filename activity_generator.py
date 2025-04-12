"""
Standalone activity generator for Language Learning Companion
Save this file in the root directory of your project
"""

import json
import random
import requests
from config import (
    SUPPORTED_LANGUAGES, CONVERSATION_TOPICS, 
    OPENROUTER_API_KEY, OPENROUTER_MODEL
)

def generate_activity(user_info, activity_type="conversation", topic=None):
    """
    Generate a language learning activity using OpenRouter API.
    
    Args:
        user_info: Dictionary with user properties (username, target_language, etc.)
        activity_type: Type of activity to generate
        topic: Optional topic for the activity
        
    Returns:
        Dictionary with activity content
    """
    target_language = user_info.get("target_language", "en")
    level = user_info.get("current_level", "Beginner")
    
    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
    
    # If no topic provided, select one appropriate for the level
    if not topic and level in CONVERSATION_TOPICS:
        topic = random.choice(CONVERSATION_TOPICS[level])
    
    print(f"Generating {activity_type} activity in {language_name} (level: {level}) about: {topic}")
    
    # Create activity prompt with detailed instructions
    prompt = f"""
Create a {activity_type} language learning activity for a {level} level student learning {language_name}.
Topic: {topic or "General conversation practice"}

Return the activity as a JSON object with the following structure:
{{
  "title": "Activity title",
  "description": "Brief description of the activity and learning goals",
  "scenario": "Detailed scenario for the activity (1-2 paragraphs)",
  "key_vocabulary": ["word1", "word2", "word3"...],
  "key_phrases": ["phrase 1", "phrase 2", "phrase 3"...],
  "questions": ["Question 1?", "Question 2?", "Question 3?"],
  "hints": ["Hint 1 for the activity", "Hint 2", "Hint 3"]
}}

For fill-in-blanks activity:
{{
  "title": "Fill-in-blanks activity title",
  "description": "Brief description of the activity",
  "text": "Text with blanks marked as ____ for students to fill in",
  "answers": ["answer1", "answer2", "answer3", "answer4", "answer5"],
  "hints": ["Hint 1 for first blank", "Hint 2 for second blank"]
}}

For reading activity:
{{
  "title": "Reading passage title",
  "description": "Brief description of the passage and goals",
  "text": "Full reading passage text appropriate for {level} level",
  "questions": ["Comprehension question 1?", "Comprehension question 2?"],
  "vocabulary": [
    {{"word": "{language_name} word", "definition": "Definition in simple terms", "example": "Example usage"}}
  ]
}}

Return ONLY the JSON object with no additional text. Do not include ```json at the beginning or ``` at the end.
"""
    
    try:
        # Generate activity with OpenRouter
        print("Calling OpenRouter API for activity generation")
        response = requests.post(
            "https://api.openrouter.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://linguadex.app",
                "X-Title": "LinguaDex Language Learning App",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a language learning activity generator that creates structured activities in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1500
            }
        )
        response.raise_for_status()
        activity_text = response.json()["choices"][0]["message"]["content"].strip()
        
        # Clean up and parse the JSON
        if activity_text.startswith("```json"):
            activity_text = activity_text.split("```json")[1].split("```")[0].strip()
        elif activity_text.startswith("```"):
            activity_text = activity_text.split("```")[1].split("```")[0].strip()
        
        try:
            activity = json.loads(activity_text)
            print(f"Successfully generated {activity_type} activity: {activity.get('title', 'Untitled')}")
            return activity
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            # Return error in a format the app can handle
            return {"error": f"Could not parse activity: {str(e)}"}
        
    except Exception as e:
        print(f"Error generating activity: {e}")
        # Return error in a format the app can handle
        return {"error": f"Activity generation failed: {str(e)}"}


# Create a simple fallback activity in case of error
def get_fallback_activity(activity_type, language_code, level, topic=""):
    """Create a fallback activity in case of API error."""
    language_name = SUPPORTED_LANGUAGES.get(language_code, "this language")
    
    if activity_type == "conversation":
        return {
            "title": f"Conversation Practice in {language_name}",
            "description": f"Practice basic conversation skills in {language_name}.",
            "scenario": f"Imagine you are meeting someone new and need to introduce yourself.",
            "key_vocabulary": ["hello", "name", "nice to meet you", "from", "goodbye"],
            "key_phrases": ["My name is...", "I am from...", "Nice to meet you.", "How are you?"],
            "questions": ["What is your name?", "Where are you from?", "How are you today?"],
            "hints": ["Use the key vocabulary", "Try to form complete sentences", "Ask follow-up questions"]
        }
    elif activity_type == "fill-in-blanks":
        return {
            "title": f"Fill in the Blanks in {language_name}",
            "description": f"Complete the sentences with the correct words.",
            "text": "Hello! My ____ is Alex. I ____ from Canada. I ____ to learn languages. My favorite ____ is pizza. I ____ three languages.",
            "answers": ["name", "am", "like", "food", "speak"],
            "hints": ["Think about introductions", "Consider verb forms", "Think about hobbies", "Consider food items", "Think about abilities"]
        }
    else:  # reading
        return {
            "title": f"Reading Practice in {language_name}",
            "description": f"Improve your reading comprehension in {language_name}.",
            "text": f"This is a simple reading passage about daily routines. It uses basic vocabulary appropriate for {level} students.",
            "questions": ["What is the main topic?", "What did you learn?", "Can you summarize the text?"],
            "vocabulary": [
                {"word": "example1", "definition": "Definition 1", "example": "Example sentence 1"},
                {"word": "example2", "definition": "Definition 2", "example": "Example sentence 2"}
            ]
        }