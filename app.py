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

# Add these new API endpoints for the React frontend
import json
from flask import jsonify, make_response

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API endpoint for user login from React frontend."""
    if not request.is_json:
        return jsonify({"error": "Missing JSON data"}), 400
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    user = db_handler.authenticate_user(username, password)
    if user:
        # Create a token (You might want to use a proper JWT library in production)
        token = generate_token(user.id, user.username)
        
        # Return user data and token
        return jsonify({
            "user": {
                "username": user.username,
                "email": user.email,
                "nativeLanguage": user.native_language,
                "targetLanguage": user.target_language,
                "currentLevel": user.current_level
            },
            "token": token
        })
    
    return jsonify({"error": "Invalid username or password"}), 401

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    """API endpoint for user registration from React frontend."""
    if not request.is_json:
        return jsonify({"error": "Missing JSON data"}), 400
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    native_language = data.get('native_language')
    target_language = data.get('target_language')
    
    if not all([username, password, email, native_language, target_language]):
        return jsonify({"error": "All fields are required"}), 400
    
    # Check if username already exists
    if db_handler.get_user_by_username(username):
        return jsonify({"error": "Username already exists"}), 409
    
    # Create new user
    user = db_handler.create_user(username, password, email, native_language, target_language)
    if user:
        # Create a token
        token = generate_token(user.id, user.username)
        
        # Return user data and token
        return jsonify({
            "user": {
                "username": user.username,
                "email": user.email,
                "nativeLanguage": user.native_language,
                "targetLanguage": user.target_language,
                "currentLevel": user.current_level
            },
            "token": token
        }), 201
    
    return jsonify({"error": "Failed to create user"}), 500

@app.route('/api/auth/verify-token', methods=['GET'])
def api_verify_token():
    """API endpoint to verify authentication token."""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"authenticated": False, "error": "No token provided"}), 401
    
    token = auth_header.split(' ')[1]
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({"authenticated": False, "error": "Invalid token"}), 401
    
    user = db_handler.get_user_by_id(user_id)
    
    if not user:
        return jsonify({"authenticated": False, "error": "User not found"}), 401
    
    return jsonify({
        "authenticated": True,
        "user": {
            "username": user.username,
            "email": user.email,
            "nativeLanguage": user.native_language,
            "targetLanguage": user.target_language,
            "currentLevel": user.current_level
        }
    })

# Helper functions for token management
import time
import hashlib

def generate_token(user_id, username):
    """Generate a simple token for user authentication."""
    # In production, use a proper JWT library
    timestamp = str(int(time.time()))
    token_data = f"{user_id}:{username}:{timestamp}:{app.secret_key}"
    token = hashlib.sha256(token_data.encode()).hexdigest()
    
    # Store token in a database or cache with expiration time
    # For simplicity, we'll use a global dictionary (not suitable for production)
    if not hasattr(app, 'tokens'):
        app.tokens = {}
    
    # Token expires in 7 days
    expiry = int(time.time()) + (7 * 24 * 60 * 60)
    app.tokens[token] = {'user_id': user_id, 'expiry': expiry}
    
    return token

def verify_token(token):
    """Verify a token and return the user_id if valid."""
    if not hasattr(app, 'tokens'):
        return None
    
    token_data = app.tokens.get(token)
    if not token_data:
        return None
    
    # Check if token is expired
    if token_data['expiry'] < int(time.time()):
        del app.tokens[token]
        return None
    
    return token_data['user_id']

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