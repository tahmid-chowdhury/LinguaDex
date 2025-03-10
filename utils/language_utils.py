import re
import json
from typing import List, Dict, Any, Tuple, Set

# Try to import NLP libraries, but handle if not available
try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    # Download necessary NLTK data
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

class LanguageUtils:
    def __init__(self):
        """Initialize language utilities with available NLP tools."""
        self.nlp_models = {}
        self.stopwords = {}
        
        # Initialize NLTK if available
        if NLTK_AVAILABLE:
            # Map of available NLTK stopwords for different languages
            nltk_languages = {
                'en': 'english',
                'es': 'spanish',
                'fr': 'french',
                'de': 'german',
                'it': 'italian',
                'pt': 'portuguese',
                'ru': 'russian',
                'nl': 'dutch',
                'fi': 'finnish',
                'hu': 'hungarian',
                'no': 'norwegian',
                'ro': 'romanian',
                'sv': 'swedish',
                'tr': 'turkish',
                'da': 'danish',
                'pl': 'polish',
                'ar': 'arabic',
                'id': 'indonesian'
                # Some languages may not have stopwords in NLTK
            }
            
            # Initialize available stopwords
            for lang_code, nltk_name in nltk_languages.items():
                try:
                    self.stopwords[lang_code] = set(stopwords.words(nltk_name))
                except:
                    # If language not available in NLTK, continue without it
                    pass
        
        # Initialize spaCy if available
        if SPACY_AVAILABLE:
            # Models will be loaded on demand to save memory
            pass
    
    def get_spacy_model(self, language_code: str):
        """Get (or load) a spaCy model for a specific language."""
        if not SPACY_AVAILABLE:
            return None
        
        if language_code not in self.nlp_models:
            try:
                # Map language codes to spaCy model names
                model_name = {
                    'en': 'en_core_web_sm',
                    'es': 'es_core_news_sm',
                    'fr': 'fr_core_news_sm',
                    'de': 'de_core_news_sm',
                    'it': 'it_core_news_sm',
                    'pt': 'pt_core_news_sm',
                    'ja': 'ja_core_news_sm',
                    'zh': 'zh_core_web_sm',
                    'nl': 'nl_core_news_sm',
                    'ru': 'ru_core_news_sm',
                    'el': 'el_core_news_sm',
                    'pl': 'pl_core_news_sm',
                    'ro': 'ro_core_news_sm',
                    'lt': 'lt_core_news_sm',
                    'nb': 'nb_core_news_sm',  # Norwegian
                    'da': 'da_core_news_sm',
                    'fi': 'fi_core_news_sm',
                    'sv': 'sv_core_news_sm',
                    'uk': 'uk_core_news_sm',
                    'ca': 'ca_core_news_sm',
                    'hr': 'hr_core_news_sm',
                    'fa': 'fa_core_news_sm',
                    # Not all languages have spaCy models
                }.get(language_code)
                
                if model_name:
                    self.nlp_models[language_code] = spacy.load(model_name)
                else:
                    return None
            except:
                # Model not installed or not available
                return None
        
        return self.nlp_models.get(language_code)
    
    def tokenize_text(self, text: str, language_code: str = 'en') -> List[str]:
        """
        Tokenize text into words.
        
        Args:
            text: Text to tokenize
            language_code: Language code (e.g., 'en', 'es')
            
        Returns:
            List of token strings
        """
        if not text:
            return []
        
        # Try to use spaCy first if available
        nlp = self.get_spacy_model(language_code)
        if nlp:
            doc = nlp(text)
            return [token.text for token in doc]
        
        # Fall back to NLTK if available
        if NLTK_AVAILABLE:
            return word_tokenize(text)
        
        # Most basic fallback: split on whitespace and punctuation
        return re.findall(r'\b\w+\b', text)
    
    def extract_vocabulary(self, text: str, language_code: str = 'en') -> List[str]:
        """
        Extract meaningful vocabulary words from text.
        
        Args:
            text: Text to process
            language_code: Language code (e.g., 'en', 'es')
            
        Returns:
            List of vocabulary words
        """
        # Tokenize the text
        tokens = self.tokenize_text(text, language_code)
        
        # Filter out stopwords and non-alphabetic tokens
        stopword_set = self.stopwords.get(language_code, set())
        vocab = [token.lower() for token in tokens if token.isalpha() and token.lower() not in stopword_set]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_vocab = [word for word in vocab if not (word in seen or seen.add(word))]
        
        return unique_vocab
    
    def detect_language(self, text: str) -> str:
        """
        Attempt to detect the language of the text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Language code or 'unknown'
        """
        if not text or len(text.strip()) < 10:
            return 'unknown'
        
        # Try to use spaCy for language detection if available models
        if SPACY_AVAILABLE:
            # Test each available model
            max_score = 0
            detected_lang = 'unknown'
            
            for lang_code in self.nlp_models:
                nlp = self.nlp_models[lang_code]
                doc = nlp(text[:min(len(text), 100)])  # Limit text length for efficiency
                
                # Count tokens that the model recognizes (not marked as unknown)
                recognized = sum(1 for token in doc if not token.is_oov)
                score = recognized / max(1, len(doc))
                
                if score > max_score:
                    max_score = score
                    detected_lang = lang_code
            
            if max_score > 0.5:  # Threshold for confident detection
                return detected_lang
        
        # Add fallbacks or other language detection methods if needed
        
        return 'unknown'
    
    def calculate_text_complexity(self, text: str, language_code: str = 'en') -> Dict[str, Any]:
        """
        Calculate various complexity metrics for a text.
        
        Args:
            text: Text to analyze
            language_code: Language code
            
        Returns:
            Dictionary with complexity metrics
        """
        if not text:
            return {
                "avg_word_length": 0,
                "avg_sentence_length": 0,
                "unique_words_ratio": 0,
                "estimated_level": "Unknown"
            }
        
        # Tokenize text
        tokens = self.tokenize_text(text, language_code)
        if not tokens:
            return {
                "avg_word_length": 0,
                "avg_sentence_length": 0,
                "unique_words_ratio": 0,
                "estimated_level": "Unknown"
            }
        
        # Count sentences (roughly, by splitting on sentence-ending punctuation)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s for s in sentences if s.strip()]
        
        # Calculate metrics
        avg_word_length = sum(len(token) for token in tokens) / len(tokens)
        avg_sentence_length = len(tokens) / max(1, len(sentences))
        unique_words_ratio = len(set(token.lower() for token in tokens)) / len(tokens)
        
        # Estimate level based on metrics
        complexity_score = (
            (avg_word_length - 3) * 0.3 +  # Words longer than 3 letters add complexity
            (avg_sentence_length / 10) * 0.4 +  # Longer sentences add complexity
            unique_words_ratio * 0.3  # More diverse vocabulary adds complexity
        )
        
        # Map complexity score to levels
        if complexity_score < 0.4:
            level = "Beginner"
        elif complexity_score < 0.6:
            level = "Intermediate"
        elif complexity_score < 0.8:
            level = "Advanced"
        else:
            level = "Fluent"
        
        return {
            "avg_word_length": round(avg_word_length, 2),
            "avg_sentence_length": round(avg_sentence_length, 2),
            "unique_words_ratio": round(unique_words_ratio, 2),
            "complexity_score": round(complexity_score, 2),
            "estimated_level": level
        }
    
    def detect_grammar_errors(self, text: str, language_code: str = 'en') -> List[Dict[str, Any]]:
        """
        Attempt to detect grammar errors in text. Note that this is a basic implementation.
        More sophisticated grammar checking would require dedicated tools or APIs.
        
        Args:
            text: Text to analyze
            language_code: Language code
            
        Returns:
            List of detected errors with descriptions
        """
        errors = []
        
        # Use spaCy for basic grammar checking if available
        nlp = self.get_spacy_model(language_code)
        if nlp:
            doc = nlp(text)
            
            # Grammar error detection is language-specific
            if language_code == 'en':
                # Subject-verb agreement in English
                for i, token in enumerate(doc):
                    if i > 0 and token.pos_ == "VERB":
                        # Very basic check - just an example
                        if doc[i-1].text.lower() in ['i', 'you', 'we', 'they'] and token.text.endswith('s'):
                            errors.append({
                                "type": "subject-verb agreement",
                                "position": (token.idx, token.idx + len(token.text)),
                                "description": f"Possible subject-verb agreement error with '{doc[i-1].text} {token.text}'"
                            })
            
            # Add more language-specific grammar checks for other languages as needed
        
        return errors
    
    def generate_language_exercises(self, vocabulary: List[str], language_code: str = 'en', 
                                  exercise_type: str = 'fill-in-blanks') -> Dict[str, Any]:
        """
        Generate language exercises based on vocabulary words.
        
        Args:
            vocabulary: List of vocabulary words
            language_code: Language code
            exercise_type: Type of exercise to generate
            
        Returns:
            Dictionary with exercise content
        """
        if not vocabulary:
            return {"error": "No vocabulary provided"}
        
        if exercise_type == 'fill-in-blanks':
            # Create a simple fill-in-the-blanks exercise
            blanks = []
            for word in vocabulary[:5]:  # Limit to 5 words for simplicity
                # Create a sentence with the word blanked out
                blanks.append({
                    "word": word,
                    "sentence": f"Please use the correct word in this ____ to complete the sentence.",
                    "options": [word] + [f"distractor_{i}" for i in range(3)]  # Simplified; would need real distractors
                })
            
            return {
                "type": "fill-in-blanks",
                "instructions": "Fill in the blanks with the correct word from the options provided.",
                "items": blanks
            }
        
        elif exercise_type == 'matching':
            # Create a word-definition matching exercise
            items = []
            for i, word in enumerate(vocabulary[:8]):  # Limit to 8 words
                items.append({
                    "word": word,
                    "definition": f"Definition for {word} would go here."  # Simplified
                })
            
            return {
                "type": "matching",
                "instructions": "Match each word with its correct definition.",
                "items": items
            }
        
        elif exercise_type == 'multiple_choice':
            # Create multiple choice questions
            questions = []
            for word in vocabulary[:5]:
                questions.append({
                    "question": f"What is the correct meaning of '{word}'?",
                    "options": [f"Definition of {word}", "Incorrect option 1", "Incorrect option 2", "Incorrect option 3"],
                    "correct_index": 0
                })
            
            return {
                "type": "multiple_choice",
                "instructions": "Choose the correct definition for each word.",
                "questions": questions
            }
        
        return {"error": f"Exercise type '{exercise_type}' not supported"}