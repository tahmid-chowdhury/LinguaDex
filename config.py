import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# LLM Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # Options: "openai", "huggingface"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Updated to use gpt-4o-mini
HUGGINGFACE_MODEL = os.getenv("HUGGINGFACE_MODEL", "EleutherAI/gpt-neo-1.3B")

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///language_learning.db")

# Supported Languages (alphabetically ordered)
SUPPORTED_LANGUAGES = {
    "ar": "Arabic",
    "bn": "Bengali",
    "zh": "Chinese",
    "cs": "Czech",
    "da": "Danish",
    "nl": "Dutch",
    "en": "English",
    "fi": "Finnish",
    "fr": "French",
    "de": "German",
    "el": "Greek",
    "he": "Hebrew",
    "hi": "Hindi",
    "hu": "Hungarian",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "ms": "Malay",
    "no": "Norwegian",
    "pl": "Polish",
    "pt": "Portuguese",
    "ro": "Romanian",
    "ru": "Russian",
    "es": "Spanish",
    "sv": "Swedish",
    "th": "Thai",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "vi": "Vietnamese"
}

# Learning Levels
LEARNING_LEVELS = ["Beginner", "Intermediate", "Advanced", "Fluent"]

# Conversation Topics by Level
CONVERSATION_TOPICS = {
    "Beginner": [
        "Greetings and Introductions",
        "Family and Friends",
        "Numbers and Counting",
        "Food and Drink",
        "Daily Routine",
        "Weather",
        "Colors and Shapes",
        "Shopping",
        "Time and Date",
        "Hobbies"
    ],
    "Intermediate": [
        "Travel and Transportation",
        "Work and Career",
        "Hobbies and Interests",
        "Weather and Seasons",
        "Shopping and Money",
        "Health and Fitness",
        "Education",
        "Technology",
        "Environment",
        "Media and Entertainment"
    ],
    "Advanced": [
        "Current Events",
        "Politics and Society",
        "Arts and Culture",
        "Technology and Innovation",
        "Environment and Sustainability",
        "Business and Economics",
        "Science and Research",
        "Literature and Poetry",
        "Philosophy",
        "History"
    ],
    "Fluent": [
        "Philosophy and Ethics",
        "Academic Discussions",
        "Professional Topics",
        "Idioms and Colloquialisms",
        "Complex Narratives",
        "Debates and Persuasion",
        "Cultural Nuances",
        "Humor and Wordplay",
        "Specialized Terminology",
        "Abstract Concepts"
        "Advanced Grammar"
    ]
}

# Progress Thresholds
WORDS_PER_LEVEL = {
    "Beginner": 500,
    "Intermediate": 2000,
    "Advanced": 5000,
    "Fluent": 10000
}

# Session Configuration
MAX_CONVERSATION_HISTORY = 10  # Number of exchanges to maintain in context
FEEDBACK_FREQUENCY = 5  # How often to give detailed feedback (every N exchanges)