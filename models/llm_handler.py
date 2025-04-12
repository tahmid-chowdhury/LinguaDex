import os
import json
import time
import random
from typing import List, Dict, Any, Tuple, Optional
import requests

# For open-source models
try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
except ImportError:
    # Not required if using API-based models
    pass

from config import (
    LLM_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_MODEL,
    HUGGINGFACE_MODEL, MAX_CONVERSATION_HISTORY,
    CONVERSATION_TOPICS, LEARNING_LEVELS, SUPPORTED_LANGUAGES
)

class LLMHandler:
    def __init__(self):
        """Initialize the LLM handler with the appropriate model."""
        self.provider = LLM_PROVIDER
        self.model_name = None
        self.model = None
        self.tokenizer = None
        
        if self.provider == "openrouter":
            # Initialize OpenRouter settings
            self.api_key = OPENROUTER_API_KEY
            self.model_name = OPENROUTER_MODEL
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": "https://linguadex.app",
                "X-Title": "LinguaDex Language Learning App"
            }
        
        elif self.provider == "huggingface":
            # Initialize Hugging Face model
            self.model_name = HUGGINGFACE_MODEL
            if torch.cuda.is_available():
                self.device = "cuda"
            else:
                self.device = "cpu"
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None
            )
            
            # Create generation pipeline
            self.pipeline = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
    
    def _format_conversation_prompt(self, 
                                   user_info: Dict[str, Any],
                                   conversation_history: List[Dict[str, Any]],
                                   session_goals: Dict[str, Any] = None) -> Tuple[str, str]:
        """
        Format the conversation history and user information into a prompt.
        
        Args:
            user_info: Dictionary containing user information
            conversation_history: List of conversation messages
            session_goals: Optional goals for the current session
            
        Returns:
            Tuple of (full prompt, system prompt)
        """
        target_language = user_info.get("target_language", "en")
        language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
        
        native_language = user_info.get("native_language", "en")
        native_language_name = SUPPORTED_LANGUAGES.get(native_language, "English")
        
        level = user_info.get("current_level", "Beginner")
        
        # Prepare level-specific instructions
        sentence_complexity = "short and simple"
        grammar_focus = "Focus on present tense and basic questions"
        
        if level == "Intermediate":
            sentence_complexity = "moderately complex"
            grammar_focus = "Introduce past tenses and conditionals"
        elif level == "Advanced":
            sentence_complexity = "varied and natural"
            grammar_focus = "Use a full range of tenses and grammatical structures"
        elif level == "Fluent":
            sentence_complexity = "sophisticated and nuanced"
            grammar_focus = "Include idiomatic expressions and cultural nuances"
            
        # Create the system prompt
        system_prompt = f"""
You are a helpful, encouraging language learning assistant specializing in teaching {language_name}. 
You MUST communicate with the user primarily in {language_name}, regardless of what language they write to you in.
The user is a {level} level student whose native language is {native_language_name}.

Your goals:
1. Converse naturally in {language_name}, keeping vocabulary and grammar appropriate for their {level} level
2. Gently correct errors without interrupting the flow of conversation
3. Introduce new vocabulary and grammar concepts gradually
4. Provide explanations in {native_language_name} when necessary, but ALWAYS RETURN TO SPEAKING {language_name}
5. Be patient, encouraging, and adapt to the user's learning pace
6. Track vocabulary and grammar points the user struggles with

For {level} level:
- Use mostly common, everyday vocabulary
- Keep sentences {sentence_complexity}
- {grammar_focus}

When correcting errors:
- For minor errors, model the correct usage in your response without explicitly pointing it out
- For significant errors, provide the correction in [brackets] after the user's message
- Offer brief explanations for corrections in {native_language_name} when appropriate
- Keep error correction proportional (correct 1-2 errors at most)

IMPORTANT: Your responses MUST be primarily in {language_name}, with small portions in {native_language_name} only when needed for clarification.
If the user seems stuck or struggling, you may briefly switch to {native_language_name} to help, but then return to {language_name}.
"""

        # Add session goals if provided
        if session_goals:
            topic = session_goals.get("topic", "")
            target_vocab = session_goals.get("target_vocabulary", [])
            grammar_focus = session_goals.get("grammar_focus", "")
            
            vocab_text = ', '.join(target_vocab) if target_vocab else 'General vocabulary building'
            grammar_text = grammar_focus or 'No specific focus, maintain appropriate level'
            
            session_prompt = f"""
Current session focus:
- Topic: {topic}
- Target vocabulary: {vocab_text}
- Grammar focus: {grammar_text}
"""
            system_prompt += session_prompt
        
        # Format conversation history
        conversation_prompt = ""
        
        # Only include the most recent conversation turns
        recent_history = conversation_history[-MAX_CONVERSATION_HISTORY:] if len(conversation_history) > MAX_CONVERSATION_HISTORY else conversation_history
        
        for message in recent_history:
            role = "User" if message.get("is_user", True) else "Assistant"
            content = message.get("content", "")
            conversation_prompt += f"{role}: {content}\n\n"
        
        # Combine everything
        full_prompt = f"{system_prompt}\n\n{conversation_prompt}Assistant: "
        
        return full_prompt, system_prompt
    
    def _call_openrouter(self, prompt: str, system_prompt: str, temperature: float = 0.7) -> str:
        """Call the OpenRouter API."""
        try:
            payload = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "max_tokens": 1024
            }
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Error calling OpenRouter API: {e}")
            return "I'm sorry, I'm having trouble generating a response right now. Let's try again."
    
    def _call_huggingface(self, prompt: str, temperature: float = 0.7) -> str:
        """Call the Hugging Face model."""
        try:
            # Set generation parameters
            max_new_tokens = 512
            top_p = 0.9
            repetition_penalty = 1.1
            
            # Generate text
            outputs = self.pipeline(
                prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                repetition_penalty=repetition_penalty,
                do_sample=True,
                eos_token_id=self.tokenizer.eos_token_id
            )
            
            # Extract the generated text
            generated_text = outputs[0]['generated_text']
            
            # Remove the prompt from the beginning
            response = generated_text[len(prompt):].strip()
            
            # Clean up the response (remove additional turns)
            if "User:" in response:
                response = response.split("User:")[0].strip()
            
            return response
        except Exception as e:
            print(f"Error calling Hugging Face model: {e}")
            return "I'm sorry, I'm having trouble generating a response right now. Let's try again."
    
    def generate_response(self, 
                         user_info: Dict[str, Any],
                         conversation_history: List[Dict[str, Any]],
                         session_goals: Dict[str, Any] = None,
                         temperature: float = 0.7) -> str:
        """
        Generate a response based on the conversation history and user information.
        
        Args:
            user_info: Dictionary containing user information
            conversation_history: List of conversation messages
            session_goals: Optional goals for the current session
            temperature: Generation temperature (higher = more creative)
            
        Returns:
            Generated response string
        """
        prompt, system_prompt = self._format_conversation_prompt(user_info, conversation_history, session_goals)
        
        if self.provider == "openrouter":
            return self._call_openrouter(prompt, system_prompt, temperature)
        elif self.provider == "huggingface":
            return self._call_huggingface(prompt, temperature)
        else:
            return "Provider not supported. Please configure a valid LLM provider."
    
    def analyze_user_message(self, 
                            user_message: str, 
                            language: str, 
                            level: str) -> Dict[str, Any]:
        """
        Analyze a user message for language learning insights.
        
        Args:
            user_message: The message to analyze
            language: The target language code
            level: The user's current level
            
        Returns:
            Dictionary with analysis results
        """
        # Create analysis prompt
        language_name = SUPPORTED_LANGUAGES.get(language, "English")
        
        prompt = f"""
Analyze the following message from a {level} level {language_name} language learner.
Message: "{user_message}"

Provide the following in a structured JSON format:
1. Errors: List of grammar or vocabulary errors with corrections
2. Vocabulary: List of words/phrases used and their difficulty level
3. Grammar: Assessment of grammatical structures used
4. Fluency: Rating from 0.0 to 1.0
5. Suggestions: Recommended vocabulary or grammar to introduce next

JSON Format:
{{
  "errors": [
    {{"original": "error text", "correction": "corrected text", "explanation": "brief explanation"}}
  ],
  "vocabulary": [
    {{"word": "word used", "level": "Beginner/Intermediate/Advanced", "mastery": 0.0-1.0}}
  ],
  "grammar": {{"structures": ["structures used"], "complexity": 0.0-1.0, "appropriate_for_level": true/false}},
  "fluency": 0.0-1.0,
  "suggestions": [
    {{"type": "vocabulary/grammar", "item": "suggested item", "example": "example usage"}}
  ]
}}

Output ONLY valid JSON without additional text.
"""
        
        try:
            # Generate analysis with OpenRouter
            if self.provider == "openrouter":
                payload = {
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": "You are a language learning analysis assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1024
                }
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                analysis_text = response.json()["choices"][0]["message"]["content"].strip()
            elif self.provider == "huggingface":
                full_prompt = f"You are a language learning analysis assistant.\nUser: {prompt}\nAssistant:"
                analysis_text = self._call_huggingface(full_prompt, temperature=0.3)
            else:
                return {"error": "Provider not supported"}
            
            # Extract JSON from response
            analysis_text = analysis_text.strip()
            if analysis_text.startswith("```json"):
                analysis_text = analysis_text.split("```json")[1].split("```")[0].strip()
            elif analysis_text.startswith("```"):
                analysis_text = analysis_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            analysis = json.loads(analysis_text)
            return analysis
        
        except Exception as e:
            print(f"Error analyzing user message: {e}")
            # Return minimal analysis on error
            return {
                "errors": [],
                "vocabulary": [],
                "grammar": {"structures": [], "complexity": 0.5, "appropriate_for_level": True},
                "fluency": 0.5,
                "suggestions": []
            }
    
    def suggest_vocabulary(self, 
                          user_info: Dict[str, Any], 
                          topic: str = None,
                          count: int = 5) -> List[Dict[str, Any]]:
        """
        Suggest new vocabulary words for the user to learn.
        
        Args:
            user_info: Dictionary containing user information
            topic: Optional topic for vocabulary suggestions
            count: Number of vocabulary items to suggest
            
        Returns:
            List of vocabulary suggestions
        """
        target_language = user_info.get("target_language", "en")
        native_language = user_info.get("native_language", "en")
        level = user_info.get("current_level", "Beginner")
        
        language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
        native_language_name = SUPPORTED_LANGUAGES.get(native_language, "English")
        
        # Create suggestion prompt
        prompt = f"""
Generate {count} vocabulary suggestions for a {level} level {language_name} language learner.
Native language: {native_language_name}
{f"Topic: {topic}" if topic else "General vocabulary appropriate for their level"}

Provide the following in a structured JSON format:
{{
  "vocabulary": [
    {{
      "word": "word in {language_name}",
      "translation": "translation in {native_language_name}",
      "part_of_speech": "noun/verb/adjective/etc.",
      "example_sentence": "example sentence in {language_name}",
      "example_translation": "translation of example sentence",
      "difficulty": "easy/medium/hard for {level} level"
    }}
  ]
}}

Output ONLY valid JSON without additional text.
"""
        
        try:
            # Generate suggestions with OpenRouter
            if self.provider == "openrouter":
                payload = {
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": "You are a language learning vocabulary assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.5,
                    "max_tokens": 1024
                }
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                suggestions_text = response.json()["choices"][0]["message"]["content"].strip()
            elif self.provider == "huggingface":
                full_prompt = f"You are a language learning vocabulary assistant.\nUser: {prompt}\nAssistant:"
                suggestions_text = self._call_huggingface(full_prompt, temperature=0.5)
            else:
                return []
            
            # Extract JSON from response
            suggestions_text = suggestions_text.strip()
            if suggestions_text.startswith("```json"):
                suggestions_text = suggestions_text.split("```json")[1].split("```")[0].strip()
            elif suggestions_text.startswith("```"):
                suggestions_text = suggestions_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            suggestions = json.loads(suggestions_text)
            return suggestions.get("vocabulary", [])
        
        except Exception as e:
            print(f"Error suggesting vocabulary: {e}")
            return []
    
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text between languages.
        
        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            
        Returns:
            Translated text
        """
        # Get language names from codes
        source_lang_name = SUPPORTED_LANGUAGES.get(source_lang, "English")
        target_lang_name = SUPPORTED_LANGUAGES.get(target_lang, "English")
        
        # Create translation prompt
        prompt = f"""
Translate the following text from {source_lang_name} to {target_lang_name}:

"{text}"

Provide ONLY the translation without any additional text.
"""
        
        try:
            # Generate translation with OpenRouter
            if self.provider == "openrouter":
                payload = {
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": "You are a helpful translation assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1024
                }
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                translation = response.json()["choices"][0]["message"]["content"].strip()
            elif self.provider == "huggingface":
                full_prompt = f"You are a helpful translation assistant.\nUser: {prompt}\nAssistant:"
                translation = self._call_huggingface(full_prompt, temperature=0.3)
            else:
                return f"Translation failed: Provider {self.provider} not supported"
            
            # Clean up translation (remove quotes if added by model)
            translation = translation.strip('"')
            
            return translation
        
        except Exception as e:
            print(f"Error translating text: {e}")
            return f"Translation failed: {str(e)}"