from flask import Flask, request, jsonify, render_template, session, redirect, url_for
import os
import datetime
import json
import random
from functools import wraps

# Import our modules
from database.db_handler import DatabaseHandler, init_db
from models.llm_handler import LLMHandler
from models.progress_tracker import ProgressTracker
from utils.language_utils import LanguageUtils
from config import SUPPORTED_LANGUAGES, CONVERSATION_TOPICS, OPENAI_MODEL

# Import OpenAI for activity generation
import openai

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "language-learning-companion-secret")

# Display startup message
print("=== Learning Language Companion Application Starting ===")
print(f"OpenAI API Key available: {'Yes' if os.getenv('OPENAI_API_KEY') else 'No'}")
print("=============================================")

# Initialize our components
db_handler = DatabaseHandler()
llm_handler = LLMHandler()
language_utils = LanguageUtils()
progress_tracker = ProgressTracker(db_handler)

# Initialize database
init_db()

# Activity generation functions
def generate_activity(user_info, activity_type="conversation", topic=None):
    """Generate a language learning activity using OpenAI API."""
    target_language = user_info.get("target_language", "en")
    level = user_info.get("current_level", "Beginner")
    
    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
    
    # If no topic provided, select one appropriate for the level
    if not topic and level in CONVERSATION_TOPICS:
        topic = random.choice(CONVERSATION_TOPICS[level])
    
    print(f"Generating {activity_type} activity in {language_name} (level: {level}) about: {topic}")
    
    # Create activity prompt
    prompt = f"""
Create a {activity_type} language learning activity for a {level} level student learning {language_name}.
Topic: {topic or "General conversation practice"}

IMPORTANT: Format your response STRICTLY as a JSON object, following the structure below.

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

Return ONLY the JSON object with no additional text.
"""
    
    try:
        # Generate activity with OpenAI
        response = openai.ChatCompletion.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a language learning activity generator."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1024
        )
        activity_text = response.choices[0].message.content.strip()
        
        # Clean up and extract JSON from response
        activity_text = activity_text.strip()
        
        # Handle various ways the model might format JSON
        if activity_text.startswith("```json"):
            activity_text = activity_text.split("```json")[1].split("```")[0].strip()
        elif activity_text.startswith("```"):
            activity_text = activity_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON with error handling
        try:
            activity = json.loads(activity_text)
            return activity
        except json.JSONDecodeError:
            # Try to fix common JSON issues
            fixed_text = activity_text.replace("'", '"')
            try:
                activity = json.loads(fixed_text)
                return activity
            except:
                return {"error": "Could not parse activity JSON"}
    
    except Exception as e:
        print(f"Error generating activity: {e}")
        return {"error": f"Could not generate {activity_type} activity: {str(e)}"}


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
        # Get activity using generator function
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
            
            # Use fallback activity
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
        
        # Use fallback activity on exception
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