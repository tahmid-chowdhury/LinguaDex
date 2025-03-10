from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import datetime
import hashlib
import os

from database.schema import Base, User, Vocabulary, Conversation, Message, ProgressRecord, user_vocabulary
from config import DATABASE_URL, WORDS_PER_LEVEL

# Create database engine
engine = create_engine(DATABASE_URL)
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

def init_db():
    """Initialize the database, creating all tables."""
    Base.metadata.create_all(engine)

def get_session():
    """Get a new database session."""
    return Session()

class DatabaseHandler:
    def __init__(self):
        self.session = get_session()
    
    def close(self):
        """Close the database session."""
        self.session.close()
    
    # User operations
    def create_user(self, username, email, password, native_language, target_language):
        """Create a new user."""
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            native_language=native_language,
            target_language=target_language
        )
        self.session.add(user)
        self.session.commit()
        return user
    
    def get_user(self, user_id=None, username=None, email=None):
        """Get a user by ID, username, or email."""
        if user_id:
            return self.session.query(User).filter_by(id=user_id).first()
        elif username:
            return self.session.query(User).filter_by(username=username).first()
        elif email:
            return self.session.query(User).filter_by(email=email).first()
        return None
    
    def authenticate_user(self, username, password):
        """Authenticate a user."""
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        user = self.session.query(User).filter_by(username=username, password_hash=password_hash).first()
        if user:
            user.last_active = datetime.datetime.utcnow()
            self.session.commit()
        return user
    
    def update_user_level(self, user_id):
        """Update user's level based on vocabulary count."""
        user = self.get_user(user_id=user_id)
        if not user:
            return False
        
        # Count user's vocabulary words
        vocab_count = self.session.query(func.count(user_vocabulary.c.vocabulary_id)).filter(
            user_vocabulary.c.user_id == user_id
        ).scalar()
        
        # Determine appropriate level
        new_level = "Beginner"
        for level, threshold in WORDS_PER_LEVEL.items():
            if vocab_count >= threshold:
                new_level = level
            else:
                break
        
        # Update if changed
        if user.current_level != new_level:
            user.current_level = new_level
            self.session.commit()
            return True
        return False
    
    # Vocabulary operations
    def add_vocabulary(self, word, language, translation=None, difficulty_level=None, 
                       part_of_speech=None, example_sentence=None):
        """Add a new vocabulary word to the database."""
        vocab = self.session.query(Vocabulary).filter_by(word=word, language=language).first()
        if not vocab:
            vocab = Vocabulary(
                word=word,
                language=language,
                translation=translation,
                difficulty_level=difficulty_level,
                part_of_speech=part_of_speech,
                example_sentence=example_sentence
            )
            self.session.add(vocab)
            self.session.commit()
        return vocab
    
    def add_word_to_user(self, user_id, word, language, proficiency=0.1):
        """Add a word to a user's vocabulary list."""
        user = self.get_user(user_id=user_id)
        if not user:
            return False
        
        # Get or create the vocabulary word
        vocab = self.session.query(Vocabulary).filter_by(word=word, language=language).first()
        if not vocab:
            vocab = self.add_vocabulary(word, language)
        
        # Check if user already has this word
        existing = self.session.query(user_vocabulary).filter_by(
            user_id=user_id, vocabulary_id=vocab.id
        ).first()
        
        if not existing:
            # Add association with proficiency
            stmt = user_vocabulary.insert().values(
                user_id=user_id,
                vocabulary_id=vocab.id,
                proficiency=proficiency,
                last_reviewed=datetime.datetime.utcnow()
            )
            self.session.execute(stmt)
            self.session.commit()
            return True
        return False
    
    def update_word_proficiency(self, user_id, word, language, proficiency_delta):
        """Update a user's proficiency with a word."""
        user = self.get_user(user_id=user_id)
        vocab = self.session.query(Vocabulary).filter_by(word=word, language=language).first()
        
        if not user or not vocab:
            return False
        
        # Get the current association
        stmt = user_vocabulary.select().where(
            (user_vocabulary.c.user_id == user_id) & 
            (user_vocabulary.c.vocabulary_id == vocab.id)
        )
        result = self.session.execute(stmt).first()
        
        if result:
            # Calculate new proficiency (bounded between 0 and 1)
            new_proficiency = min(1.0, max(0.0, result.proficiency + proficiency_delta))
            
            # Update the association
            update_stmt = user_vocabulary.update().where(
                (user_vocabulary.c.user_id == user_id) & 
                (user_vocabulary.c.vocabulary_id == vocab.id)
            ).values(
                proficiency=new_proficiency,
                last_reviewed=datetime.datetime.utcnow()
            )
            self.session.execute(update_stmt)
            self.session.commit()
            return True
        return False
    
    def get_user_vocabulary(self, user_id, min_proficiency=None, max_proficiency=None, limit=100):
        """Get a user's vocabulary words, optionally filtered by proficiency level."""
        query = self.session.query(
            Vocabulary, user_vocabulary.c.proficiency, user_vocabulary.c.last_reviewed
        ).join(
            user_vocabulary, Vocabulary.id == user_vocabulary.c.vocabulary_id
        ).filter(
            user_vocabulary.c.user_id == user_id
        )
        
        if min_proficiency is not None:
            query = query.filter(user_vocabulary.c.proficiency >= min_proficiency)
        
        if max_proficiency is not None:
            query = query.filter(user_vocabulary.c.proficiency <= max_proficiency)
        
        # Order by last reviewed (oldest first) and limit
        result = query.order_by(user_vocabulary.c.last_reviewed).limit(limit).all()
        
        return [
            {
                "word": item[0].word,
                "language": item[0].language,
                "translation": item[0].translation,
                "difficulty_level": item[0].difficulty_level,
                "part_of_speech": item[0].part_of_speech,
                "example_sentence": item[0].example_sentence,
                "proficiency": item[1],
                "last_reviewed": item[2]
            }
            for item in result
        ]
    
    # Conversation operations
    def create_conversation(self, user_id, topic, language):
        """Create a new conversation."""
        conversation = Conversation(
            user_id=user_id,
            topic=topic,
            language=language
        )
        self.session.add(conversation)
        self.session.commit()
        return conversation
    
    def add_message(self, conversation_id, is_user, content):
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            is_user=is_user,
            content=content
        )
        self.session.add(message)
        self.session.commit()
        return message
    
    def get_conversation(self, conversation_id):
        """Get a conversation by ID, including all messages."""
        conversation = self.session.query(Conversation).filter_by(id=conversation_id).first()
        if conversation:
            messages = self.session.query(Message).filter_by(
                conversation_id=conversation_id
            ).order_by(Message.timestamp).all()
            return conversation, messages
        return None, []
    
    def get_user_conversations(self, user_id, limit=10):
        """Get a user's recent conversations."""
        conversations = self.session.query(Conversation).filter_by(
            user_id=user_id
        ).order_by(Conversation.timestamp.desc()).limit(limit).all()
        return conversations
    
    # Progress tracking
    def record_progress(self, user_id, vocab_count=0, conversation_duration=0, 
                       mistakes_made=0, mistakes_corrected=0, fluency_score=None):
        """Record a user's progress for a session."""
        # Get the latest progress record for today
        today = datetime.datetime.utcnow().date()
        existing = self.session.query(ProgressRecord).filter(
            ProgressRecord.user_id == user_id,
            func.date(ProgressRecord.date) == today
        ).first()
        
        if existing:
            # Update existing record
            existing.vocabulary_count += vocab_count
            existing.conversation_duration += conversation_duration
            existing.mistakes_made += mistakes_made
            existing.mistakes_corrected += mistakes_corrected
            if fluency_score is not None:
                # Average the fluency score
                if existing.fluency_score > 0:
                    existing.fluency_score = (existing.fluency_score + fluency_score) / 2
                else:
                    existing.fluency_score = fluency_score
            self.session.commit()
            return existing
        else:
            # Create new record
            progress = ProgressRecord(
                user_id=user_id,
                vocabulary_count=vocab_count,
                conversation_duration=conversation_duration,
                mistakes_made=mistakes_made,
                mistakes_corrected=mistakes_corrected,
                fluency_score=fluency_score or 0.0
            )
            self.session.add(progress)
            self.session.commit()
            return progress
    
    def get_user_progress(self, user_id, days=30):
        """Get a user's progress over a period of time."""
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
        progress = self.session.query(ProgressRecord).filter(
            ProgressRecord.user_id == user_id,
            ProgressRecord.date >= cutoff_date
        ).order_by(ProgressRecord.date).all()
        return progress