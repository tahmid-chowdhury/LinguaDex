"""
Standalone activity generator for Language Learning Companion
Save this file in the root directory of your project
"""

import json
import random
import openai
from config import (
    OPENAI_API_KEY, OPENAI_MODEL, 
    CONVERSATION_TOPICS, SUPPORTED_LANGUAGES
)

# Initialize OpenAI with API key
openai.api_key = OPENAI_API_KEY

def generate_activity(user_info, activity_type="conversation", topic=None):
    """
    Generate a language learning activity using OpenAI API.
    
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

IMPORTANT: Format your response STRICTLY according to the structure below, depending on the activity type.

For conversation activity:
{{
  "title": "A descriptive title for the activity",
  "description": "Brief explanation of what the user will practice",
  "scenario": "Detailed scenario setting up the conversation context",
  "key_vocabulary": ["word1", "word2", "word3", "word4", "word5"],
  "key_phrases": ["Useful phrase 1", "Useful phrase 2", "Useful phrase 3"],
  "questions": ["Question 1 to start conversation?", "Question 2 to continue?", "Question 3 to expand?"],
  "hints": ["Helpful hint 1", "Helpful hint 2"]
}}

For fill-in-blanks activity:
{{
  "title": "A descriptive title",
  "description": "Brief explanation of the exercise",
  "text": "This is an example ____ with blank spaces for ____ to fill in.",
  "answers": ["text", "students"],
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
        # Generate activity with OpenAI
        print("Calling OpenAI API for activity generation")
        response = openai.ChatCompletion.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a language learning activity generator that creates structured activities in JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1024
        )
        activity_text = response.choices[0].message.content.strip()
        print(f"Raw API response received, length: {len(activity_text)}")
        
        # Clean up and extract JSON from response
        activity_text = activity_text.strip()
        
        # Handle various ways the model might format JSON
        if activity_text.startswith("```json"):
            print("Detected ```json format, extracting...")
            activity_text = activity_text.split("```json")[1].split("```")[0].strip()
        elif activity_text.startswith("```"):
            print("Detected ``` format, extracting...")
            activity_text = activity_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON with error handling
        try:
            activity = json.loads(activity_text)
            print(f"Successfully parsed JSON with keys: {list(activity.keys())}")
            return activity
        except json.JSONDecodeError as json_err:
            print(f"JSON parsing error: {json_err}")
            
            # Try to fix common JSON issues
            fixed_text = activity_text
            # Replace single quotes with double quotes if needed
            if "'" in fixed_text and '"' not in fixed_text:
                fixed_text = fixed_text.replace("'", '"')
                print("Attempted to fix quotes")
            
            # Try parsing again
            try:
                activity = json.loads(fixed_text)
                print("Fixed JSON successfully")
                return activity
            except:
                print("Could not fix JSON")
                return {"error": "Could not parse activity JSON"}
    
    except Exception as e:
        import traceback
        print(f"Error generating activity: {e}")
        traceback.print_exc()
        return {"error": f"Could not generate {activity_type} activity: {str(e)}"}


# Create a simple fallback activity in case of error
def get_fallback_activity(activity_type, language_code, level, topic=""):
    language_name = SUPPORTED_LANGUAGES.get(language_code, "this language")
    
    return {
        "title": f"{activity_type.capitalize()} Exercise in {language_name}",
        "description": f"A {level} level activity about {topic or 'general language practice'}.",
        "scenario": "Practice your language skills with this activity.",
        "key_vocabulary": ["hello", "goodbye", "thank you", "please", "help"],
        "key_phrases": ["How are you?", "My name is...", "I would like...", "Can you help me?"],
        "questions": ["What is your name?", "Where are you from?", "What do you like to do?"],
        "hints": ["Try to use new vocabulary", "Practice your pronunciation"]
    }