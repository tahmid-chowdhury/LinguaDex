from flask import Flask, request, jsonify, render_template, session, redirect, url_for
import os
import datetime
import json
import random
import requests
from functools import wraps

# Import our modules
from database.db_handler import DatabaseHandler, init_db
from models.llm_handler import LLMHandler
from models.progress_tracker import ProgressTracker
from utils.language_utils import LanguageUtils
from config import SUPPORTED_LANGUAGES, CONVERSATION_TOPICS, OPENROUTER_MODEL, OPENROUTER_API_KEY

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "language-learning-companion-secret")

# Display startup message
print("=== Learning Language Companion Application Starting ===")
print(f"OpenRouter API Key available: {'Yes' if os.getenv('OPENROUTER_API_KEY') else 'No'}")
print(f"Using model: {OPENROUTER_MODEL}")
print("=============================================")

# Initialize our components
db_handler = DatabaseHandler()
llm_handler = LLMHandler()
language_utils = LanguageUtils()
progress_tracker = ProgressTracker(db_handler)

# Initialize database
init_db()

# Activity generation functions
"""
Bilingual activity generator that puts instructions and hints in native language
Replace the generate_activity function in app.py with this version
"""

"""
Enhanced activity generator that includes romanization for non-Latin script languages
Replace the generate_activity function in app.py with this version
"""

def generate_activity(user_info, activity_type="conversation", topic=None):
    """
    Generate a bilingual language learning activity with romanization for non-Latin scripts.
    
    Args:
        user_info: Dictionary with user properties (username, target_language, etc.)
        activity_type: Type of activity to generate
        topic: Optional topic for the activity
        
    Returns:
        Dictionary with complete activity content
    """
    target_language = user_info.get("target_language", "en")
    native_language = user_info.get("native_language", "en")
    level = user_info.get("current_level", "Beginner")
    
    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
    native_language_name = SUPPORTED_LANGUAGES.get(native_language, "English")
    
    # Determine if the target language needs romanization
    needs_romanization = target_language in ["ja", "zh", "ko", "ru", "ar", "th", "he", "el", "uk", "bn", "hi"]
    romanization_system = "romaji" if target_language == "ja" else "pinyin" if target_language == "zh" else "transliteration"
    
    # If no topic provided, select one appropriate for the level
    if not topic and level in CONVERSATION_TOPICS:
        topic = random.choice(CONVERSATION_TOPICS[level])
    elif not topic:  # Fallback if level has no topics
        topic = "General conversation"
    
    print(f"Generating {activity_type} activity in {language_name} (level: {level}) about: {topic}")
    print(f"Instructions will be in {native_language_name}")
    if needs_romanization:
        print(f"Including {romanization_system} for {language_name}")
    
    # Define expected fields for each activity type
    expected_fields = {
        "conversation": [
            "title", "description", "scenario", 
            "key_vocabulary", "key_phrases", "questions", "hints", "translations"
        ],
        "fill-in-blanks": ["title", "description", "text", "answers", "hints", "translations"],
        "reading": ["title", "description", "text", "questions", "vocabulary", "translations"]
    }
    
    # For languages needing romanization, include it in expected fields
    if needs_romanization:
        if "romanization" not in expected_fields[activity_type]:
            expected_fields[activity_type].append("romanization")
    
    # Create activity prompt with bilingual instructions and romanization request
    romanization_instruction = f"""
IMPORTANT: Since {language_name} uses a non-Latin script, you MUST include romanization for ALL {language_name} content.
Add a "romanization" field to the JSON with romanized versions of all vocabulary, phrases, and example sentences.
Use {romanization_system} for the romanization of {language_name}.
The romanization field should follow the same structure as the content it romanizes.
""" if needs_romanization else ""

    prompt = f"""
Create a detailed {activity_type} activity for {level} level students learning {language_name}.
Topic: {topic}

REQUIREMENTS:
1. Your response MUST be a VALID JSON object
2. Include ALL fields listed in the template
3. All INSTRUCTIONS, HINTS, and EXPLANATIONS must be in {native_language_name} (the user's native language)
4. All CONTENT to be PRACTICED must be in {language_name} (the language being learned)
5. Ensure the vocabulary and grammar matches the {level} level of difficulty
6. Include translations for key elements to help the user understand

{romanization_instruction}

For conversation activity:
{{
  "title": "Activity title in {native_language_name}",
  "description": "Detailed description (2-3 sentences) in {native_language_name}",
  "scenario": "Conversation scenario (3-4 sentences) in {native_language_name}",
  "key_vocabulary": ["word1 in {language_name}", "word2 in {language_name}", "word3 in {language_name}", "word4 in {language_name}", "word5 in {language_name}"],
  "key_phrases": ["Phrase 1 in {language_name}", "Phrase 2 in {language_name}", "Phrase 3 in {language_name}"],
  "questions": ["Question 1 in {language_name}?", "Question 2 in {language_name}?", "Question 3 in {language_name}?"],
  "hints": ["Hint 1 in {native_language_name}", "Hint 2 in {native_language_name}", "Hint 3 in {native_language_name}"],
  "translations": {{
    "key_vocabulary": ["translation of word1 in {native_language_name}", "translation of word2 in {native_language_name}", "translation of word3 in {native_language_name}"],
    "key_phrases": ["translation of phrase1 in {native_language_name}", "translation of phrase2 in {native_language_name}", "translation of phrase3 in {native_language_name}"],
    "questions": ["translation of question1 in {native_language_name}", "translation of question2 in {native_language_name}", "translation of question3 in {native_language_name}"]
  }}
  {f''',"romanization": {{
    "key_vocabulary": ["romanized word1", "romanized word2", "romanized word3", "romanized word4", "romanized word5"],
    "key_phrases": ["romanized phrase 1", "romanized phrase 2", "romanized phrase 3"],
    "questions": ["romanized question 1?", "romanized question 2?", "romanized question 3?"]
  }}''' if needs_romanization else ""}
}}

Return ONLY the JSON object with no additional text or explanation.
"""
    
    # Try generating the activity
    try:
        # Generate activity with OpenRouter
        print("Calling OpenRouter API for bilingual activity generation with romanization")
        response = requests.post(
            "https://api.openrouter.ai/v1/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": f"You are a bilingual language learning activity creator with expertise in {language_name} and {native_language_name}."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1024
            }
        )
        response.raise_for_status()
        activity_text = response.json()["choices"][0]["message"]["content"].strip()
        print(f"Raw API response received, length: {len(activity_text)}")
        
        # Clean up and extract JSON
        activity_text = activity_text.strip()
        
        # Handle various ways the model might format JSON
        if activity_text.startswith("```json"):
            activity_text = activity_text.split("```json")[1].split("```")[0].strip()
        elif activity_text.startswith("```"):
            activity_text = activity_text.split("```")[1].split("```")[0].strip()
        
        # Try to parse the JSON
        try:
            activity = json.loads(activity_text)
            print(f"Successfully parsed JSON with keys: {list(activity.keys())}")
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
            except:
                print("Could not fix JSON")
                # Use fallback
                return get_romanized_fallback_activity(activity_type, target_language, native_language, level, topic)
        
        # Validate and complete the activity
        if activity_type in expected_fields:
            # Check for missing fields and add them with default values
            for field in expected_fields[activity_type]:
                if field not in activity:
                    print(f"Adding missing field: {field}")
                    # Determine field type and set default
                    if field in ["key_vocabulary", "key_phrases", "questions", "answers"]:
                        activity[field] = [f"Example {field} item" for _ in range(3)]
                    elif field == "hints":
                        activity[field] = [f"Hint in {native_language_name}" for _ in range(3)]
                    elif field == "translations":
                        activity[field] = {}
                    elif field == "romanization" and needs_romanization:
                        activity[field] = {
                            "key_vocabulary": ["romanized item 1", "romanized item 2", "romanized item 3"],
                            "key_phrases": ["romanized phrase 1", "romanized phrase 2", "romanized phrase 3"],
                            "questions": ["romanized question 1", "romanized question 2", "romanized question 3"]
                        }
                    elif field == "vocabulary" and activity_type == "reading":
                        activity[field] = [
                            {"word": "example", "definition": f"Definition in {native_language_name}", "example": f"Example in {language_name}"}
                        ]
                    else:
                        activity[field] = f"Example {field}"
                
                # Ensure arrays have at least 3 items
                if field in ["key_vocabulary", "key_phrases", "questions", "hints", "answers"] and isinstance(activity[field], list):
                    while len(activity[field]) < 3:
                        if field == "hints":
                            activity[field].append(f"Additional hint in {native_language_name}")
                        else:
                            activity[field].append(f"Additional {field.replace('_', ' ')} item")
            
            # If romanization is needed but wasn't generated correctly
            if needs_romanization and ("romanization" not in activity or not isinstance(activity["romanization"], dict)):
                print("Adding romanization field")
                activity["romanization"] = {}
                
                # Add romanization for each needed field
                for field in ["key_vocabulary", "key_phrases", "questions"]:
                    if field in activity and field not in activity.get("romanization", {}):
                        activity["romanization"][field] = [
                            f"Romanized {item[:10]}..." for item in activity[field]
                        ]
        
        return activity
        
    except Exception as e:
        import traceback
        print(f"Error generating activity: {e}")
        traceback.print_exc()
        # Use fallback activity on exception
        return get_romanized_fallback_activity(activity_type, target_language, native_language, level, topic)

def get_romanized_fallback_activity(activity_type, target_lang, native_lang, level, topic=""):
    """Create a bilingual fallback activity with romanization for non-Latin scripts."""
    language_name = SUPPORTED_LANGUAGES.get(target_lang, "this language")
    native_language_name = SUPPORTED_LANGUAGES.get(native_lang, "English")
    
    # Determine if target language needs romanization
    needs_romanization = target_lang in ["ja", "zh", "ko", "ru", "ar", "th", "he", "el", "uk", "bn", "hi"]
    
    if activity_type == "conversation":
        activity = {
            "title": f"Conversation Practice: {topic}" if topic else f"Basic {language_name} Conversation",
            "description": f"In this activity, you will practice basic conversation skills in {language_name}.",
            "scenario": f"Imagine you are meeting someone new and introducing yourself in {language_name}.",
            "key_vocabulary": ["hello", "goodbye", "thank you", "please", "help"],
            "key_phrases": ["How are you?", "My name is...", "I would like...", "Can you help me?"],
            "questions": ["What is your name?", "Where are you from?", "What do you like to do?"],
            "hints": [
                f"Try to use the new vocabulary you've learned.",
                f"If you don't know a word, you can ask how to say it in {language_name}.",
                f"Focus on pronunciation and simple sentence structures."
            ],
            "translations": {
                "key_vocabulary": ["hello (translation)", "goodbye (translation)", "thank you (translation)", "please (translation)", "help (translation)"],
                "key_phrases": ["How are you? (translation)", "My name is... (translation)", "I would like... (translation)", "Can you help me? (translation)"],
                "questions": ["What is your name? (translation)", "Where are you from? (translation)", "What do you like to do? (translation)"]
            }
        }
        
        # Add romanization if needed
        if needs_romanization:
            activity["romanization"] = {
                "key_vocabulary": ["hello (romanized)", "goodbye (romanized)", "thank you (romanized)", "please (romanized)", "help (romanized)"],
                "key_phrases": ["How are you? (romanized)", "My name is... (romanized)", "I would like... (romanized)", "Can you help me? (romanized)"],
                "questions": ["What is your name? (romanized)", "Where are you from? (romanized)", "What do you like to do? (romanized)"]
            }
            
        return activity
        
    elif activity_type == "fill-in-blanks":
        activity = {
            "title": f"Fill in the Blanks: {topic}" if topic else f"{language_name} Fill in the Blanks Exercise",
            "description": f"Practice your {language_name} vocabulary by filling in the missing words in the sentences.",
            "text": "Hello, my name is ____. I am from ____. I like to ____ in my free time. My favorite color is ____. I have ____ in my family.",
            "answers": ["name", "country", "activity", "color", "number"],
            "hints": [
                f"Read the entire text first to understand the context.",
                f"Think about what kind of information would make sense in each blank.",
                f"Use the vocabulary you've learned in previous lessons."
            ],
            "translations": {
                "text": "Translation of the fill-in-the-blanks text",
                "answers": ["name (translation)", "country (translation)", "activity (translation)", "color (translation)", "number (translation)"]
            }
        }
        
        # Add romanization if needed
        if needs_romanization:
            activity["romanization"] = {
                "text": "Romanized version of the text with blanks",
                "answers": ["name (romanized)", "country (romanized)", "activity (romanized)", "color (romanized)", "number (romanized)"]
            }
            
        return activity
        
    else:  # reading
        activity = {
            "title": f"Reading Practice: {topic}" if topic else f"{language_name} Reading Exercise",
            "description": f"Improve your reading comprehension skills in {language_name} with this short text.",
            "text": f"This is a simple reading passage in {language_name}. It contains basic vocabulary and grammar structures appropriate for {level} level learners. The topic is about {topic or 'everyday life'}.",
            "questions": [
                "What is the main topic of the text?",
                "What new vocabulary did you learn?",
                "Can you summarize the text in your own words?"
            ],
            "vocabulary": [
                {"word": "example1", "definition": "Definition of example1", "example": "Example usage of example1"},
                {"word": "example2", "definition": "Definition of example2", "example": "Example usage of example2"},
                {"word": "example3", "definition": "Definition of example3", "example": "Example usage of example3"}
            ],
            "translations": {
                "text": f"Translation of the reading passage to {native_language_name}.",
                "examples": ["Translation of example1", "Translation of example2", "Translation of example3"]
            }
        }
        
        # Add romanization if needed
        if needs_romanization:
            activity["romanization"] = {
                "text": "Romanized version of the reading passage",
                "vocabulary": [
                    {"word": "example1 (romanized)", "example": "Romanized version of example1 usage"},
                    {"word": "example2 (romanized)", "example": "Romanized version of example2 usage"},
                    {"word": "example3 (romanized)", "example": "Romanized version of example3 usage"}
                ]
            }
            
        return activity

def get_bilingual_fallback_activity(activity_type, target_lang, native_lang, level, topic=""):
    """Create a bilingual fallback activity with instructional content in native language."""
    language_name = SUPPORTED_LANGUAGES.get(target_lang, "this language")
    native_language_name = SUPPORTED_LANGUAGES.get(native_lang, "English")
    
    if activity_type == "conversation":
        return {
            "title": f"Conversation Practice: {topic}" if topic else f"Basic {language_name} Conversation",
            "description": f"In this activity, you will practice basic conversation skills in {language_name}.",
            "scenario": f"Imagine you are meeting someone new and introducing yourself in {language_name}.",
            "key_vocabulary": ["hello", "goodbye", "thank you", "please", "help"],
            "key_phrases": ["How are you?", "My name is...", "I would like...", "Can you help me?"],
            "questions": ["What is your name?", "Where are you from?", "What do you like to do?"],
            "hints": [
                f"Try to use the new vocabulary you've learned.",
                f"If you don't know a word, you can ask how to say it in {language_name}.",
                f"Focus on pronunciation and simple sentence structures."
            ],
            "translations": {
                "key_vocabulary": ["hello (translation)", "goodbye (translation)", "thank you (translation)", "please (translation)", "help (translation)"],
                "key_phrases": ["How are you? (translation)", "My name is... (translation)", "I would like... (translation)", "Can you help me? (translation)"],
                "questions": ["What is your name? (translation)", "Where are you from? (translation)", "What do you like to do? (translation)"]
            }
        }
    elif activity_type == "fill-in-blanks":
        return {
            "title": f"Fill in the Blanks: {topic}" if topic else f"{language_name} Fill in the Blanks Exercise",
            "description": f"Practice your {language_name} vocabulary by filling in the missing words in the sentences.",
            "text": "Hello, my name is ____. I am from ____. I like to ____ in my free time. My favorite color is ____. I have ____ in my family.",
            "answers": ["name", "country", "activity", "color", "number"],
            "hints": [
                f"Read the entire text first to understand the context.",
                f"Think about what kind of information would make sense in each blank.",
                f"Use the vocabulary you've learned in previous lessons."
            ],
            "translations": {
                "text": "Translation of the fill-in-the-blanks text",
                "answers": ["name (translation)", "country (translation)", "activity (translation)", "color (translation)", "number (translation)"]
            }
        }
    else:  # reading
        return {
            "title": f"Reading Practice: {topic}" if topic else f"{language_name} Reading Exercise",
            "description": f"Improve your reading comprehension skills in {language_name} with this short text.",
            "text": f"This is a simple reading passage in {language_name}. It contains basic vocabulary and grammar structures appropriate for {level} level learners. The topic is about {topic or 'everyday life'}.",
            "questions": [
                "What is the main topic of the text?",
                "What new vocabulary did you learn?",
                "Can you summarize the text in your own words?"
            ],
            "vocabulary": [
                {"word": "example1", "definition": "Definition of example1", "example": "Example usage of example1"},
                {"word": "example2", "definition": "Definition of example2", "example": "Example usage of example2"},
                {"word": "example3", "definition": "Definition of example3", "example": "Example usage of example3"}
            ],
            "translations": {
                "text": f"Translation of the reading passage to {native_language_name}.",
                "examples": ["Translation of example1", "Translation of example2", "Translation of example3"]
            }
        }


def get_fallback_activity(activity_type, language_code, level, topic=""):
    """Create a simple fallback activity in case of error."""
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

"""
Specialized handler for fill-in-the-blanks activities
Add this to your app.py file
"""

def generate_fill_in_blanks_activity(user_info, topic=None):
    """
    Generate a fill-in-the-blanks activity specifically designed for language learning.
    This is a simpler, more focused version that ensures all required fields are included.
    
    Args:
        user_info: Dictionary with user properties (username, target_language, etc.)
        topic: Optional topic for the activity
        
    Returns:
        Dictionary with complete fill-in-the-blanks activity
    """
    target_language = user_info.get("target_language", "en")
    native_language = user_info.get("native_language", "en")
    level = user_info.get("current_level", "Beginner")
    
    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
    native_language_name = SUPPORTED_LANGUAGES.get(native_language, "English")
    
    # Determine if the target language needs romanization
    needs_romanization = target_language in ["ja", "zh", "ko", "ru", "ar", "th", "he", "el", "uk", "bn", "hi"]
    
    # If no topic provided, select one appropriate for the level
    if not topic and level in CONVERSATION_TOPICS:
        topic = random.choice(CONVERSATION_TOPICS[level])
    elif not topic:
        topic = "General vocabulary"
    
    print(f"Generating fill-in-the-blanks activity in {language_name} (level: {level}) about: {topic}")
    
    # Create a specific prompt for fill-in-the-blanks
    prompt = f"""
Create a fill-in-the-blanks activity for {level} level students learning {language_name}.
Topic: {topic}

REQUIREMENTS:
1. Return a VALID JSON object with the following fields:
   - title: Activity title in {native_language_name}
   - description: Instructions in {native_language_name}
   - text: A paragraph or sentences in {language_name} with exactly 5 blanks marked as ____
   - answers: The 5 words that should fill the blanks (in correct order)
   - hints: At least 3 helpful hints in {native_language_name}
   - translations: translations of text and answers in {native_language_name}

2. IMPORTANT:
   - Make sure the text has EXACTLY 5 blank spaces marked with ____
   - Blanks should replace words appropriate for {level} level
   - The answers array MUST have exactly 5 items
   - Each answer MUST be a single word in {language_name}
   - The text MUST be completely in {language_name}
   - All instructions and hints MUST be in {native_language_name}

3. Example format:
{{
  "title": "Family Members",
  "description": "Fill in the blanks with the correct family member words.",
  "text": "My ____ is very kind. I have two ____. My ____ is a doctor. My ____ likes to cook. I love my ____.",
  "answers": ["mother", "brothers", "father", "sister", "family"],
  "hints": ["Think about your immediate family members", "One blank refers to siblings", "One blank refers to your whole family"],
  "translations": {{
    "text": "Translation of the full text in {native_language_name}",
    "answers": ["translation of mother", "translation of brothers", "translation of father", "translation of sister", "translation of family"]
  }}
}}

{f'''4. Since {language_name} uses a non-Latin script, also include:
"romanization": {{
  "text": "Romanized version of the text with blanks indicated",
  "answers": ["romanized version of answer1", "romanized version of answer2", "romanized version of answer3", "romanized version of answer4", "romanized version of answer5"]
}}''' if needs_romanization else ""}

Return ONLY the JSON object with no additional text or explanation.
"""

    try:
        # Generate activity with OpenRouter
        print("Calling OpenRouter API for fill-in-the-blanks activity")
        response = requests.post(
            "https://api.openrouter.ai/v1/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": f"You are a language learning assistant specialized in creating fill-in-the-blanks exercises for {language_name}."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1024
            }
        )
        response.raise_for_status()
        activity_text = response.json()["choices"][0]["message"]["content"].strip()
        
        # Clean up and extract JSON
        activity_text = activity_text.strip()
        
        # Handle various ways the model might format JSON
        if activity_text.startswith("```json"):
            activity_text = activity_text.split("```json")[1].split("```")[0].strip()
        elif activity_text.startswith("```"):
            activity_text = activity_text.split("```")[1].split("```")[0].strip()
        
        # Try to parse the JSON
        try:
            activity = json.loads(activity_text)
            print(f"Successfully parsed fill-in-the-blanks JSON with keys: {list(activity.keys())}")
            
            # Validate the activity has all required fields
            required_fields = ["title", "description", "text", "answers", "hints", "translations"]
            for field in required_fields:
                if field not in activity:
                    print(f"Missing required field: {field}")
                    activity[field] = get_default_value(field, native_language_name, language_name)
            
            # Validate that the text has blanks
            if "____" not in activity.get("text", ""):
                print("Generated text has no blanks, fixing...")
                text_words = activity["text"].split()
                if len(text_words) > 10:
                    # Add blanks at positions 2, 4, 6, 8, 10 if text is long enough
                    positions = [2, 4, 6, 8, 10]
                    blanked_words = []
                    for i, pos in enumerate(positions):
                        if pos < len(text_words):
                            blanked_words.append(text_words[pos])
                            text_words[pos] = "____"
                    activity["text"] = " ".join(text_words)
                    
                    # If answers array is empty or wrong length, use the blanked words
                    if len(activity.get("answers", [])) != 5 and len(blanked_words) > 0:
                        activity["answers"] = blanked_words
            
            # Ensure we have 5 answers
            while len(activity.get("answers", [])) < 5:
                activity["answers"].append(f"word{len(activity['answers']) + 1}")
            
            # Add romanization if needed and not present
            if needs_romanization and "romanization" not in activity:
                activity["romanization"] = {
                    "text": f"Romanized version of the text with blanks",
                    "answers": [f"romanized answer {i+1}" for i in range(5)]
                }
            
            return activity
            
        except json.JSONDecodeError as json_err:
            print(f"JSON parsing error: {json_err}")
            print(f"Problematic text: {activity_text[:100]}...")
            # Fall back to default activity
            return get_fill_in_blanks_fallback(target_language, native_language, level, topic)
    
    except Exception as e:
        import traceback
        print(f"Error generating fill-in-blanks activity: {e}")
        traceback.print_exc()
        return get_fill_in_blanks_fallback(target_language, native_language, level, topic)

def get_default_value(field, native_language_name, language_name):
    """Return default values for missing fields in fill-in-the-blanks activities."""
    defaults = {
        "title": f"Fill in the Blanks",
        "description": f"Complete the sentences by filling in the missing words.",
        "text": f"This is a ____ exercise to practice your ____ skills. You need to fill in the ____ with the correct ____. Good ____!",
        "answers": ["simple", "language", "blanks", "words", "luck"],
        "hints": [
            f"Read the entire text first to understand the context.",
            f"Look for clues in the surrounding words.",
            f"Think about what would make sense grammatically and semantically."
        ],
        "translations": {
            "text": f"Translation of the text with blanks",
            "answers": ["translation of answer1", "translation of answer2", "translation of answer3", "translation of answer4", "translation of answer5"]
        },
        "romanization": {
            "text": f"Romanized version of the text with blanks",
            "answers": ["romanized answer1", "romanized answer2", "romanized answer3", "romanized answer4", "romanized answer5"]
        }
    }
    return defaults.get(field, "Default value")

def get_fill_in_blanks_fallback(target_lang, native_lang, level, topic):
    """Get a fallback fill-in-the-blanks activity."""
    language_name = SUPPORTED_LANGUAGES.get(target_lang, "this language")
    native_language_name = SUPPORTED_LANGUAGES.get(native_lang, "English")
    needs_romanization = target_lang in ["ja", "zh", "ko", "ru", "ar", "th", "he", "el", "uk", "bn", "hi"]
    
    activity = {
        "title": f"Fill in the Blanks: {topic}" if topic else f"{language_name} Practice",
        "description": f"Complete the sentences by filling in the missing words to practice your {language_name} skills.",
        "text": f"This is a ____ exercise to practice your ____ skills. You need to fill in the ____ with the correct ____. Good ____!",
        "answers": ["simple", "language", "blanks", "words", "luck"],
        "hints": [
            f"Read the entire text first to understand the context.",
            f"Look for clues in the surrounding words.",
            f"Think about what would make sense grammatically and semantically."
        ],
        "translations": {
            "text": f"This is a simple exercise to practice your language skills. You need to fill in the blanks with the correct words. Good luck!",
            "answers": ["simple", "language", "blanks", "words", "luck"]
        }
    }
    
    if needs_romanization:
        activity["romanization"] = {
            "text": "Romanized version of the text with blanks indicated",
            "answers": ["romanized simple", "romanized language", "romanized blanks", "romanized words", "romanized luck"]
        }
    
    return activity

"""
Specific fix for reading comprehension activity generation
"""

def generate_reading_activity(user_info, topic=None):
    """
    Generate a reading comprehension activity with romanized pronunciation for non-Latin scripts.
    
    Args:
        user_info: Dictionary with user properties (username, target_language, etc.)
        topic: Optional topic for the activity
        
    Returns:
        Dictionary with reading activity content
    """
    target_language = user_info.get("target_language", "en")
    native_language = user_info.get("native_language", "en")
    level = user_info.get("current_level", "Beginner")
    
    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
    native_language_name = SUPPORTED_LANGUAGES.get(native_language, "English")
    
    # If no topic provided, select one appropriate for the level
    if not topic and level in CONVERSATION_TOPICS:
        topic = random.choice(CONVERSATION_TOPICS[level])
    elif not topic:  # Fallback if level has no topics
        topic = "General reading"
    
    print(f"Generating reading comprehension activity in {language_name} (level: {level}) about: {topic}")
    
    # Determine if the language uses a non-Latin script
    non_latin_scripts = ["ja", "zh", "ko", "ru", "ar", "he", "el", "hi", "bn", "th", "uk"]
    needs_romanization = target_language in non_latin_scripts
    
    # Create reading activity prompt with pronunciation request for non-Latin scripts
    romanization_instruction = ""
    if needs_romanization:
        romanization_instruction = f"""
IMPORTANT: For vocabulary items and text in {language_name}, provide romanization/pronunciation guide in parentheses after each word/phrase.
For example: 
- For Japanese: "こんにちは (konnichiwa)"
- For Chinese: "你好 (nǐ hǎo)"
- For Russian: "привет (privet)"
"""
    
    prompt = f"""
Create a reading comprehension activity for {level} level students learning {language_name}.
Topic: {topic}

REQUIREMENTS:
1. Your response MUST be a VALID JSON object
2. The title and description should be in {native_language_name} (user's native language)
3. The reading passage must be in {language_name} (the language being learned)
4. Include at least 4 comprehension questions in {native_language_name}
5. Include at least 5 key vocabulary items from the passage with definitions in {native_language_name}
6. Ensure the text is appropriate for {level} level students
7. Include a translation of the passage in {native_language_name}

{romanization_instruction}

Return the following JSON structure:
{{
  "title": "Title of the reading activity in {native_language_name}",
  "description": "Brief description of the activity in {native_language_name}",
  "text": "Reading passage in {language_name}. For {level} level.",
  "translation": "Translation of the reading passage in {native_language_name}",
  "questions": [
    "Question 1 in {native_language_name}?",
    "Question 2 in {native_language_name}?",
    "Question 3 in {native_language_name}?",
    "Question 4 in {native_language_name}?"
  ],
  "vocabulary": [
    {{
      "word": "vocabulary word 1 in {language_name}",
      "definition": "Definition in {native_language_name}",
      "example": "Example sentence using the word in {language_name}"
    }},
    // Include at least 5 vocabulary items
  ]
}}

Return ONLY the JSON object with no additional text or explanation.
"""
    
    # Generate activity with OpenRouter
    try:
        print("Calling OpenRouter API for reading activity generation")
        response = requests.post(
            "https://api.openrouter.ai/v1/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": f"You are a language learning specialist who creates reading comprehension activities. You focus on {language_name} for {level} level students."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1500  # Increased token count for longer reading passages
            }
        )
        response.raise_for_status()
        activity_text = response.json()["choices"][0]["message"]["content"].strip()
        
        # Parse and validate the activity
        activity = parse_and_validate_reading_activity(
            activity_text, 
            language_name, 
            native_language_name, 
            level,
            topic
        )
        
        return activity
        
    except Exception as e:
        import traceback
        print(f"Error generating reading activity: {e}")
        traceback.print_exc()
        # Use fallback activity on exception
        return get_reading_fallback_activity(target_language, native_language, level, topic)

def parse_and_validate_reading_activity(activity_text, language_name, native_language_name, level, topic):
    """Parse and validate the reading activity JSON, fixing any issues."""
    
    # Clean up and extract JSON
    activity_text = activity_text.strip()
    
    # Handle various ways the model might format JSON
    if activity_text.startswith("```json"):
        activity_text = activity_text.split("```json")[1].split("```")[0].strip()
    elif activity_text.startswith("```"):
        activity_text = activity_text.split("```")[1].split("```")[0].strip()
    
    # Try to parse the JSON
    try:
        activity = json.loads(activity_text)
    except json.JSONDecodeError as json_err:
        print(f"JSON parsing error: {json_err}")
        
        # Try to fix common JSON issues
        fixed_text = activity_text
        # Replace single quotes with double quotes if needed
        if "'" in fixed_text and '"' not in fixed_text:
            fixed_text = fixed_text.replace("'", '"')
        
        # Try parsing again
        try:
            activity = json.loads(fixed_text)
        except:
            # If still failing, use fallback
            return get_reading_fallback_activity(language_name, native_language_name, level, topic)
    
    # Validate required fields
    required_fields = ["title", "description", "text", "translation", "questions", "vocabulary"]
    for field in required_fields:
        if field not in activity:
            activity[field] = get_default_value(field, language_name, native_language_name, level, topic)
    
    # Ensure we have enough questions
    if isinstance(activity["questions"], list) and len(activity["questions"]) < 3:
        activity["questions"].extend([
            f"Question about {topic} in {native_language_name}?",
            f"Question about details in {native_language_name}?",
            f"Question about main idea in {native_language_name}?"
        ])
    
    # Ensure we have vocabulary items
    if not isinstance(activity["vocabulary"], list) or len(activity["vocabulary"]) < 3:
        activity["vocabulary"] = [
            {
                "word": f"Example word in {language_name}",
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            },
            {
                "word": f"Example word 2 in {language_name}",
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            },
            {
                "word": f"Example word 3 in {language_name}",
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            }
        ]
    
    # Ensure each vocabulary item has the required fields
    for i, vocab in enumerate(activity["vocabulary"]):
        if not isinstance(vocab, dict):
            activity["vocabulary"][i] = {
                "word": str(vocab),
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            }
            continue
            
        if "word" not in vocab:
            vocab["word"] = f"Example word in {language_name}"
        if "definition" not in vocab:
            vocab["definition"] = f"Definition in {native_language_name}"
        if "example" not in vocab:
            vocab["example"] = f"Example sentence in {language_name}"
    
    return activity

def get_default_value(field, language_name, native_language_name, level, topic):
    """Get default values for missing fields in the reading activity."""
    
    if field == "title":
        return f"Reading Practice: {topic} ({language_name})"
    elif field == "description":
        return f"Practice your {language_name} reading skills with this {level} level text about {topic}."
    elif field == "text":
        return f"This is a sample {level} level reading passage in {language_name} about {topic}."
    elif field == "translation":
        return f"This is a translation of the reading passage in {native_language_name}."
    elif field == "questions":
        return [
            f"What is the main topic of the text?",
            f"What new vocabulary did you learn?",
            f"Can you summarize the text in your own words?",
            f"What was the most interesting part for you?"
        ]
    elif field == "vocabulary":
        return [
            {
                "word": f"Example word in {language_name}",
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            },
            {
                "word": f"Example word 2 in {language_name}",
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            },
            {
                "word": f"Example word 3 in {language_name}",
                "definition": f"Definition in {native_language_name}",
                "example": f"Example sentence in {language_name}"
            }
        ]
    return ""

def get_reading_fallback_activity(target_lang, native_lang, level, topic=""):
    """Create a fallback reading activity."""
    language_name = target_lang if isinstance(target_lang, str) else "target language"
    native_language_name = native_lang if isinstance(native_lang, str) else "native language"
    
    fallback_text = "This is a simple reading passage for language learning practice."
    fallback_translation = "This is a translation of the reading passage."
    
    if language_name == "Japanese":
        fallback_text = "これは日本語の練習のための簡単な文章です。日本語を勉強することは楽しいです。毎日少しずつ勉強しましょう。 (Kore wa nihongo no renshū no tame no kantan na bunshō desu. Nihongo o benkyō suru koto wa tanoshii desu. Mainichi sukoshi zutsu benkyō shimashō.)"
        fallback_translation = "This is a simple text for practicing Japanese. Learning Japanese is fun. Let's study a little bit every day."
    elif language_name == "Spanish":
        fallback_text = "Este es un texto simple para practicar español. Aprender español es divertido. Estudiemos un poco todos los días."
        fallback_translation = "This is a simple text for practicing Spanish. Learning Spanish is fun. Let's study a little bit every day."
    
    return {
        "title": f"Reading Practice: {topic}" if topic else f"{language_name} Reading Practice",
        "description": f"Practice your {language_name} reading skills with this {level} level text.",
        "text": fallback_text,
        "translation": fallback_translation,
        "questions": [
            "What is the main topic of the text?",
            "What new vocabulary did you learn?",
            "Can you summarize the text in your own words?",
            "What was the most interesting part for you?"
        ],
        "vocabulary": [
            {
                "word": "Example word in " + language_name,
                "definition": "Definition in " + native_language_name,
                "example": "Example sentence in " + language_name
            },
            {
                "word": "Example word 2 in " + language_name,
                "definition": "Definition in " + native_language_name,
                "example": "Example sentence in " + language_name
            },
            {
                "word": "Example word 3 in " + language_name,
                "definition": "Definition in " + native_language_name,
                "example": "Example sentence in " + language_name
            }
        ]
    }
# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    """Render the main page."""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html', languages=SUPPORTED_LANGUAGES)

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = db_handler.authenticate_user(username, password)
        if user:
            session['user_id'] = user.id
            session['username'] = user.username
            session['target_language'] = user.target_language
            session['native_language'] = user.native_language
            session['current_level'] = user.current_level
            
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('dashboard'))
        
        return render_template('index.html', error="Invalid credentials", languages=SUPPORTED_LANGUAGES)
    
    return render_template('index.html', languages=SUPPORTED_LANGUAGES)

@app.route('/register', methods=['POST'])
def register():
    """Handle user registration."""
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')
    native_language = request.form.get('native_language')
    target_language = request.form.get('target_language')
    
    # Check if user already exists
    existing_user = db_handler.get_user(username=username) or db_handler.get_user(email=email)
    if existing_user:
        return render_template('index.html', 
                              register_error="Username or email already exists",
                              languages=SUPPORTED_LANGUAGES)
    
    # Create new user
    user = db_handler.create_user(
        username=username,
        email=email,
        password=password,
        native_language=native_language,
        target_language=target_language
    )
    
    # Log user in
    session['user_id'] = user.id
    session['username'] = user.username
    session['target_language'] = user.target_language
    session['native_language'] = user.native_language
    session['current_level'] = user.current_level
    
    return redirect(url_for('dashboard'))

@app.route('/logout')
def logout():
    """Handle user logout."""
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    """Render the user dashboard."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    if not user:
        # Clear the invalid session and redirect to login
        session.clear()
        return redirect(url_for('login', error="User not found. Please login again."))
    # Get user's learning statistics
    progress_report = progress_tracker.generate_progress_report(user_id)
    recommendations = progress_tracker.get_recommendations(user_id)
    
    # Get recent conversations
    recent_conversations = db_handler.get_user_conversations(user_id)
    
    # Get vocabulary to review
    vocab_to_review = db_handler.get_user_vocabulary(
        user_id=user_id,
        min_proficiency=0.3,
        max_proficiency=0.7,
        limit=10
    )
    
    # Generate recommendations for practice
    level_topics = CONVERSATION_TOPICS.get(user.current_level, [])
    recommended_topics = random.sample(level_topics, min(3, len(level_topics))) if level_topics else []
    
    return render_template('dashboard.html',
                          user=user,
                          progress=progress_report,
                          recommendations=recommendations,
                          recent_conversations=recent_conversations,
                          vocab_to_review=vocab_to_review,
                          recommended_topics=recommended_topics,
                          languages=SUPPORTED_LANGUAGES,
                          now=datetime.datetime.now())

@app.route('/conversation')
@login_required
def conversation():
    """Render the conversation page."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    # Get conversation ID from query params or create new
    conversation_id = request.args.get('id')
    topic = request.args.get('topic', '')
    
    if conversation_id:
        # Load existing conversation
        conversation, messages = db_handler.get_conversation(conversation_id)
        if not conversation or conversation.user_id != user_id:
            # Invalid or unauthorized access
            return redirect(url_for('conversation'))
    else:
        # Create a new conversation with specified or random topic
        if not topic:
            level_topics = CONVERSATION_TOPICS.get(user.current_level, [])
            topic = random.choice(level_topics) if level_topics else "General conversation"
        
        conversation = db_handler.create_conversation(
            user_id=user_id,
            topic=topic,
            language=user.target_language
        )
        
        # Add initial greeting message from AI
        initial_message = llm_handler.generate_response(
            user_info={
                "username": user.username,
                "target_language": user.target_language,
                "native_language": user.native_language,
                "current_level": user.current_level
            },
            conversation_history=[],
            session_goals={"topic": topic}
        )
        
        db_handler.add_message(
            conversation_id=conversation.id,
            is_user=False,
            content=initial_message
        )
        
        # Reload conversation with the initial message
        conversation, messages = db_handler.get_conversation(conversation.id)
    
    return render_template('conversation.html',
                          user=user,
                          conversation=conversation,
                          messages=messages,
                          topic=topic,
                          languages=SUPPORTED_LANGUAGES)

@app.route('/api/send_message', methods=['POST'])
@login_required
def send_message():
    """API endpoint to send a message in a conversation."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    data = request.json
    conversation_id = data.get('conversation_id')
    message_content = data.get('message', '').strip()
    
    if not conversation_id or not message_content:
        return jsonify({"error": "Missing conversation ID or message content"}), 400
    
    # Verify conversation belongs to user
    conversation, _ = db_handler.get_conversation(conversation_id)
    if not conversation or conversation.user_id != user_id:
        return jsonify({"error": "Invalid conversation"}), 403
    
    # Add user message to conversation
    user_message = db_handler.add_message(
        conversation_id=conversation_id,
        is_user=True,
        content=message_content
    )
    
    # Analyze user's message for language learning insights
    analysis = llm_handler.analyze_user_message(
        user_message=message_content,
        language=user.target_language,
        level=user.current_level
    )
    
    # Get conversation history
    _, messages = db_handler.get_conversation(conversation_id)
    conversation_history = [
        {"is_user": msg.is_user, "content": msg.content}
        for msg in messages
    ]
    
    # Generate AI response
    ai_response = llm_handler.generate_response(
        user_info={
            "username": user.username,
            "target_language": user.target_language,
            "native_language": user.native_language,
            "current_level": user.current_level
        },
        conversation_history=conversation_history,
        session_goals={"topic": conversation.topic}
    )
    
    # Add AI response to conversation
    ai_message = db_handler.add_message(
        conversation_id=conversation_id,
        is_user=False,
        content=ai_response
    )
    
    # Update user's vocabulary and progress based on analysis
    if "vocabulary" in analysis:
        for vocab_item in analysis.get("vocabulary", []):
            word = vocab_item.get("word", "")
            if word:
                # Update or add word to user's vocabulary
                existing_vocab = db_handler.get_user_vocabulary(
                    user_id=user_id,
                    min_proficiency=0,
                    max_proficiency=1,
                    limit=1000
                )
                
                existing_words = [v.get("word", "").lower() for v in existing_vocab]
                
                if word.lower() in existing_words:
                    # Update existing word proficiency
                    db_handler.update_word_proficiency(
                        user_id=user_id,
                        word=word,
                        language=user.target_language,
                        proficiency_delta=0.05  # Small increase for using the word
                    )
                else:
                    # Add new word
                    db_handler.add_word_to_user(
                        user_id=user_id,
                        word=word,
                        language=user.target_language,
                        proficiency=0.2  # Initial proficiency
                    )
    
    # Track conversation duration (simplified: assume 1 minute per exchange)
    db_handler.record_progress(
        user_id=user_id,
        conversation_duration=1,
        fluency_score=analysis.get("fluency", 0.5)
    )
    
    return jsonify({
        "user_message": {
            "id": user_message.id,
            "content": user_message.content,
            "timestamp": user_message.timestamp.isoformat()
        },
        "ai_message": {
            "id": ai_message.id,
            "content": ai_message.content,
            "timestamp": ai_message.timestamp.isoformat()
        },
        "analysis": analysis
    })

@app.route('/vocabulary')
@login_required
def vocabulary():
    """Render the vocabulary management page."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    # Get all user vocabulary
    all_vocabulary = db_handler.get_user_vocabulary(
        user_id=user_id,
        limit=1000
    )
    
    # Group by proficiency level
    beginner_vocab = [v for v in all_vocabulary if v.get("proficiency", 0) < 0.3]
    intermediate_vocab = [v for v in all_vocabulary if 0.3 <= v.get("proficiency", 0) < 0.7]
    advanced_vocab = [v for v in all_vocabulary if v.get("proficiency", 0) >= 0.7]
    
    return render_template('vocabulary.html',
                          user=user,
                          beginner_vocab=beginner_vocab,
                          intermediate_vocab=intermediate_vocab,
                          advanced_vocab=advanced_vocab,
                          total_count=len(all_vocabulary),
                          languages=SUPPORTED_LANGUAGES)

@app.route('/api/vocabulary_suggestions', methods=['GET'])
@login_required
def vocabulary_suggestions():
    """API endpoint to get vocabulary suggestions."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    topic = request.args.get('topic', '')
    count = int(request.args.get('count', 5))
    
    suggestions = llm_handler.suggest_vocabulary(
        user_info={
            "username": user.username,
            "target_language": user.target_language,
            "native_language": user.native_language,
            "current_level": user.current_level
        },
        topic=topic,
        count=count
    )
    
    return jsonify({"suggestions": suggestions})

@app.route('/api/add_vocabulary', methods=['POST'])
@login_required
def add_vocabulary():
    """API endpoint to add vocabulary to user's list."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    data = request.json
    word = data.get('word', '').strip()
    translation = data.get('translation', '').strip()
    
    if not word:
        return jsonify({"error": "Word cannot be empty"}), 400
    
    # Add or create vocabulary word
    vocab = db_handler.add_vocabulary(
        word=word,
        language=user.target_language,
        translation=translation
    )
    
    # Add to user's vocabulary
    success = db_handler.add_word_to_user(
        user_id=user_id,
        word=word,
        language=user.target_language
    )
    
    if success:
        return jsonify({"success": True, "message": "Word added to your vocabulary"})
    else:
        return jsonify({"success": False, "message": "Word already in your vocabulary"})

@app.route('/api/update_vocabulary_proficiency', methods=['POST'])
@login_required
def update_vocabulary_proficiency():
    """API endpoint to update vocabulary proficiency."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    data = request.json
    word = data.get('word', '').strip()
    proficiency_change = float(data.get('change', 0.1))
    
    success = db_handler.update_word_proficiency(
        user_id=user_id,
        word=word,
        language=user.target_language,
        proficiency_delta=proficiency_change
    )
    
    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"error": "Could not update proficiency"}), 400

@app.route('/api/translate', methods=['POST'])
@login_required
def translate_text():
    """API endpoint to translate text."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    data = request.json
    text = data.get('text', '').strip()
    source_lang = data.get('source_lang', user.target_language)
    target_lang = data.get('target_lang', user.native_language)
    
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    
    translation = llm_handler.translate_text(
        text=text,
        source_lang=source_lang,
        target_lang=target_lang
    )
    
    return jsonify({"translation": translation})

@app.route('/api/practice_activity', methods=['GET'])
@login_required
def get_practice_activity():
    """API endpoint to get a practice activity."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    activity_type = request.args.get('type', 'conversation')
    topic = request.args.get('topic', '')
    
    # Log the request
    print(f"Generating {activity_type} activity with topic: '{topic}' for language: {user.target_language}")
    
    try:
        # Use specialized generators for specific activity types
        if activity_type == "fill-in-blanks":
            activity = generate_fill_in_blanks_activity(
                user_info={
                    "username": user.username,
                    "target_language": user.target_language,
                    "native_language": user.native_language,
                    "current_level": user.current_level
                },
                topic=topic
            )
        elif activity_type == "reading":
            # Use the new reading-specific generator
            activity = generate_reading_activity(
                user_info={
                    "username": user.username,
                    "target_language": user.target_language,
                    "native_language": user.native_language,
                    "current_level": user.current_level
                },
                topic=topic
            )
        else:
            # Use general activity generator for other types
            activity = generate_activity(
                user_info={
                    "username": user.username,
                    "target_language": user.target_language,
                    "native_language": user.native_language,
                    "current_level": user.current_level
                },
                activity_type=activity_type,
                topic=topic
            )
        
        # Check if we got a valid activity back
        if not activity or (isinstance(activity, dict) and "error" in activity):
            print(f"Error from activity generator: {activity.get('error') if activity else 'No response'}")
            
            # Use appropriate fallback based on activity type
            if activity_type == "reading":
                fallback = get_reading_fallback_activity(
                    user.target_language, 
                    user.native_language,
                    user.current_level,
                    topic
                )
            else:
                fallback = get_fallback_activity(
                    activity_type=activity_type, 
                    language_code=user.target_language,
                    level=user.current_level,
                    topic=topic
                )
            
            print("Using fallback activity template")
            return jsonify(fallback)
        
        print(f"Successfully generated activity: {activity.get('title', 'Untitled Activity')}")
        return jsonify(activity)
        
    except Exception as e:
        import traceback
        print(f"Exception in activity generation: {e}")
        traceback.print_exc()
        
        # Use appropriate fallback on exception
        if activity_type == "reading":
            fallback = get_reading_fallback_activity(
                user.target_language, 
                user.native_language,
                user.current_level,
                topic
            )
        else:
            fallback = get_fallback_activity(
                activity_type=activity_type, 
                language_code=user.target_language,
                level=user.current_level,
                topic=topic
            )
        
        return jsonify(fallback)

@app.route('/progress')
@login_required
def view_progress():
    """Render the progress tracking page."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    # Generate progress report
    progress_report = progress_tracker.generate_progress_report(user_id)
    
    # Generate charts
    vocab_chart = progress_tracker.generate_progress_chart(user_id, "vocabulary")
    fluency_chart = progress_tracker.generate_progress_chart(user_id, "fluency")
    time_chart = progress_tracker.generate_progress_chart(user_id, "time")
    
    return render_template('progress.html',
                          user=user,
                          progress=progress_report,
                          vocab_chart=vocab_chart,
                          fluency_chart=fluency_chart,
                          time_chart=time_chart,
                          languages=SUPPORTED_LANGUAGES)

@app.route('/activities')
@login_required
def activities():
    """Render the language activities page."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    # Get topics appropriate for user's level
    level_topics = CONVERSATION_TOPICS.get(user.current_level, [])
    
    return render_template('activities.html',
                          user=user,
                          topics=level_topics,
                          languages=SUPPORTED_LANGUAGES)

@app.route('/settings')
@login_required
def settings():
    """Render the user settings page."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    return render_template('settings.html',
                          user=user,
                          languages=SUPPORTED_LANGUAGES)

@app.route('/update_settings', methods=['POST'])
@login_required
def update_settings():
    """Handle settings update requests."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    form_type = request.form.get('form_type', '')
    
    if form_type == 'language':
        # Update language settings
        native_language = request.form.get('native_language')
        target_language = request.form.get('target_language')
        
        # Basic validation
        if native_language in SUPPORTED_LANGUAGES and target_language in SUPPORTED_LANGUAGES:
            # Update user in database
            user.native_language = native_language
            user.target_language = target_language
            
            # Update session
            session['native_language'] = native_language
            session['target_language'] = target_language
            
            db_handler.session.commit()
    
    elif form_type == 'level':
        # Update proficiency level
        current_level = request.form.get('current_level')
        
        # Validate level
        valid_levels = ["Beginner", "Intermediate", "Advanced", "Fluent"]
        if current_level in valid_levels:
            # Update user in database
            user.current_level = current_level
            
            # Update session
            session['current_level'] = current_level
            
            db_handler.session.commit()
    
    elif form_type == 'account':
        # Update account information
        email = request.form.get('email')
        new_password = request.form.get('new_password')
        
        # Update email if provided
        if email and email != user.email:
            user.email = email
        
        # Update password if provided
        if new_password:
            import hashlib
            password_hash = hashlib.sha256(new_password.encode()).hexdigest()
            user.password_hash = password_hash
        
        db_handler.session.commit()
    
    # Redirect back to settings page with success message
    return redirect(url_for('settings', success=True))

"""
Routes for the matching activity to add to your app.py file
"""

import random

@app.route('/matching')
@login_required
def matching_activity():
    """Render the matching activity page."""
    user_id = session['user_id']
    user = db_handler.get_user(user_id=user_id)
    
    if not user:
        session.clear()
        return redirect(url_for('login', error="User not found. Please login again."))
    
    # Check if the user wants new words
    new_words = request.args.get('new', 'false') == 'true'
    
    # Get or generate matching activity
    matching_activity = generate_matching_activity(
        user_info={
            "username": user.username,
            "target_language": user.target_language,
            "native_language": user.native_language,
            "current_level": user.current_level
        },
        word_count=10,  # Number of word pairs to generate
        force_new=new_words
    )
    
    return render_template('matching.html',
                          user=user,
                          matching_activity=matching_activity,
                          languages=SUPPORTED_LANGUAGES)

def generate_matching_activity(user_info, word_count=10, force_new=False):
    """
    Generate a matching activity with words in the user's native language
    and their translations in the target language.
    
    Args:
        user_info: Dictionary with user properties
        word_count: Number of word pairs to generate
        force_new: Whether to force generating new words
        
    Returns:
        Dictionary with matching activity details
    """
    target_language = user_info.get("target_language", "en")
    native_language = user_info.get("native_language", "en")
    level = user_info.get("current_level", "Beginner")
    
    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
    native_language_name = SUPPORTED_LANGUAGES.get(native_language, "English")
    
    # Try to get words from the user's vocabulary if available
    user_id = session.get('user_id')
    if user_id and not force_new:
        user_vocab = db_handler.get_user_vocabulary(
            user_id=user_id,
            limit=word_count * 2  # Get more words than needed so we can randomly select
        )
        
        if len(user_vocab) >= word_count:
            # Randomly select words from user's vocabulary
            selected_vocab = random.sample(user_vocab, word_count)
            
            # Format as word pairs
            word_pairs = [
                {
                    "native": v.get("translation", ""),
                    "target": v.get("word", ""),
                    "pronunciation": get_pronunciation(v.get("word", ""), target_language)
                }
                for v in selected_vocab if v.get("translation") and v.get("word")
            ]
            
            # If we have enough valid pairs, use them
            if len(word_pairs) >= word_count / 2:
                return format_matching_activity(word_pairs, language_name, native_language_name, level)
    
    # If we don't have enough vocabulary or force_new is True, generate words using the LLM
    try:
        prompt = f"""
Generate {word_count} vocabulary word pairs for a {level} level student learning {language_name}.
Their native language is {native_language_name}.

Provide the following in a structured JSON format:
{{
  "word_pairs": [
    {{
      "native": "word in {native_language_name}",
      "target": "translation in {language_name}",
      "pronunciation": "pronunciation guide (only for non-Latin script languages)"
    }}
  ]
}}

For languages that don't use Latin script (like Japanese, Arabic, Russian, etc.), 
include a pronunciation guide in the "pronunciation" field.
For Latin script languages, leave the pronunciation field empty.

Make sure the words are appropriate for a {level} level student.

Output ONLY valid JSON without additional text.
"""
        
        # Generate word pairs with OpenRouter
        response = requests.post(
            "https://api.openrouter.ai/v1/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": f"You are a language learning vocabulary assistant specializing in {language_name} and {native_language_name}."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1024
            }
        )
        response.raise_for_status()
        result_text = response.json()["choices"][0]["message"]["content"].strip()
        
        # Extract JSON
        if result_text.startswith("```json"):
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif result_text.startswith("```"):
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        result = json.loads(result_text)
        word_pairs = result.get("word_pairs", [])
        
        # Ensure we have enough word pairs
        if len(word_pairs) < word_count:
            # Add some default pairs if needed
            default_pairs = [
                {"native": "hello", "target": get_translation("hello", "en", target_language)},
                {"native": "goodbye", "target": get_translation("goodbye", "en", target_language)},
                {"native": "thank you", "target": get_translation("thank you", "en", target_language)},
                {"native": "yes", "target": get_translation("yes", "en", target_language)},
                {"native": "no", "target": get_translation("no", "en", target_language)},
                {"native": "please", "target": get_translation("please", "en", target_language)},
                {"native": "excuse me", "target": get_translation("excuse me", "en", target_language)},
                {"native": "sorry", "target": get_translation("sorry", "en", target_language)},
                {"native": "water", "target": get_translation("water", "en", target_language)},
                {"native": "food", "target": get_translation("food", "en", target_language)}
            ]
            
            # Add missing pairs
            while len(word_pairs) < word_count and default_pairs:
                word_pairs.append(default_pairs.pop(0))
        
        return format_matching_activity(word_pairs, language_name, native_language_name, level)
        
    except Exception as e:
        print(f"Error generating matching activity: {e}")
        # Provide a fallback activity
        return get_fallback_matching_activity(target_language, native_language, level)

def format_matching_activity(word_pairs, language_name, native_language_name, level):
    """Format the matching activity with shuffled target words."""
    # Create a shuffled copy of word pairs for the target language column
    shuffled_pairs = []
    for i, pair in enumerate(word_pairs):
        shuffled_pairs.append({
            "target": pair["target"],
            "original_index": i
        })
    
    # Shuffle the target language words
    random.shuffle(shuffled_pairs)
    
    # Generate appropriate hints based on the languages
    hints = [
        f"Click on a word in your native language ({native_language_name}), then click on its translation in {language_name}.",
        "Words will be highlighted when correctly matched.",
        "Try to match all words correctly as quickly as possible."
    ]
    
    # Add a hint about non-Latin scripts if applicable
    non_latin_scripts = ["ja", "zh", "ko", "ru", "ar", "he", "el", "hi", "th"]
    if any(lang in non_latin_scripts for lang in [language_name.lower()]):
        hints.append("Pronunciation guides are provided in the review section to help you with non-Latin script words.")
    
    # Create activity structure
    activity = {
        "title": f"{language_name} Vocabulary Matching",
        "description": f"Match each word in {native_language_name} with its correct translation in {language_name}.",
        "word_pairs": word_pairs,
        "shuffled_pairs": shuffled_pairs,
        "hints": [
            f"Click on a word in your native language ({native_language_name}), then click on its translation in {language_name}.",
            "Words will be highlighted when correctly matched.",
            "Try to match all words correctly as quickly as possible."
        ],
        "level": level
    }
    
    return activity

def get_pronunciation(word, language_code):
    """Get pronunciation guide for non-Latin script languages."""
    # Only provide pronunciation for non-Latin script languages
    non_latin_scripts = ["ja", "zh", "ko", "ru", "ar", "he", "el", "hi", "th"]
    
    if language_code not in non_latin_scripts:
        return ""
    
    try:
        # We could use the LLM to generate a pronunciation guide,
        # but for simplicity, we'll just return an empty string here
        # In a full implementation, you would call the translation API
        # to get a romanized version of the word
        return ""
    except:
        return ""

def get_translation(word, source_lang, target_lang):
    """Translate a word from source language to target language."""
    try:
        translation = llm_handler.translate_text(word, source_lang, target_lang)
        return translation
    except:
        # Return the original word if translation fails
        return word

    activity = {
        "title": f"{language_name} Vocabulary Matching",
        "description": f"Match each word in {native_language_name} with its correct translation in {language_name}.",
        "word_pairs": word_pairs,
        "shuffled_pairs": shuffled_pairs,
        "hints": hints,
        "level": level
    }
    
    return activity

def get_fallback_matching_activity(target_lang, native_lang, level):
    """Create a fallback matching activity with basic vocabulary."""
    language_name = SUPPORTED_LANGUAGES.get(target_lang, "this language")
    native_language_name = SUPPORTED_LANGUAGES.get(native_lang, "your language")
    
    # Basic vocabulary pairs (these would be auto-translated in a real implementation)
    word_pairs = [
        {"native": "hello", "target": "hello in target language", "pronunciation": ""},
        {"native": "goodbye", "target": "goodbye in target language", "pronunciation": ""},
        {"native": "thank you", "target": "thank you in target language", "pronunciation": ""},
        {"native": "yes", "target": "yes in target language", "pronunciation": ""},
        {"native": "no", "target": "no in target language", "pronunciation": ""},
        {"native": "please", "target": "please in target language", "pronunciation": ""},
        {"native": "excuse me", "target": "excuse me in target language", "pronunciation": ""},
        {"native": "sorry", "target": "sorry in target language", "pronunciation": ""},
        {"native": "water", "target": "water in target language", "pronunciation": ""},
        {"native": "food", "target": "food in target language", "pronunciation": ""}
    ]
    
    # Create shuffled pairs
    shuffled_pairs = []
    for i, pair in enumerate(word_pairs):
        shuffled_pairs.append({
            "target": pair["target"],
            "original_index": i
        })
    
    # Shuffle the target language words
    random.shuffle(shuffled_pairs)
    
"""
Romanization API endpoint for Language Learning Companion
Add this route to your app.py file
"""

@app.route('/api/romanize', methods=['POST'])
@login_required
def romanize_text():
    """API endpoint to romanize text."""
    data = request.json
    text = data.get('text', '').strip()
    language = data.get('language', '')
    
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    
    try:
        # Use a simpler prompt format for more reliable romanization
        prompt = f"""
Romanize the following text written in {SUPPORTED_LANGUAGES.get(language, language)} 
to show how it should be pronounced by an English speaker.

Text: {text}

Provide only the romanized version with each original term in parentheses. 
For example:
- For Japanese "こんにちは", return "konnichiwa (こんにちは)"
- For Chinese "你好", return "nǐ hǎo (你好)"

Your response should contain only the romanized text.
"""
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a language romanization assistant."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 1024
            }
        )
        response.raise_for_status()
        romanized = response.json()["choices"][0]["message"]["content"].strip()
        
        return jsonify({"romanized": romanized})
        
    except Exception as e:
        print(f"Error romanizing text: {e}")
        return jsonify({"error": f"Romanization failed: {str(e)}"}), 500

@app.route('/api/speak', methods=['POST'])
@login_required
def text_to_speech():
    """API endpoint for text-to-speech conversion for all supported languages."""
    data = request.json
    text = data.get('text', '').strip()
    language = data.get('language', 'en')
    
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    
    try:
        # Import required libraries
        from gtts import gTTS
        import uuid
        import os
        
        # Map language code to gTTS format if needed
        # Most language codes are already compatible
        lang_map = {
            'zh': 'zh-CN',  # Default Chinese to Mandarin
            # Add any specific mappings needed
        }
        
        tts_lang = lang_map.get(language, language)
        
        # Generate a unique filename
        filename = f"speech_{uuid.uuid4()}.mp3"
        
        # Ensure audio directory exists
        audio_dir = os.path.join('static', 'audio')
        os.makedirs(audio_dir, exist_ok=True)
        
        filepath = os.path.join(audio_dir, filename)
        
        # Generate speech
        tts = gTTS(text=text, lang=tts_lang, slow=False)
        tts.save(filepath)
        
        # Return the URL to the audio file
        audio_url = url_for('static', filename=f'audio/{filename}')
        return jsonify({"audio_url": audio_url})
        
    except Exception as e:
        import traceback
        print(f"Error generating speech: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Speech synthesis failed: {str(e)}"}), 500

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error="Page not found"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('error.html', error="Server error"), 500

if __name__ == '__main__':
    # Run the app in debug mode
    app.run(debug=True)