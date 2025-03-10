from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

# Association table for many-to-many relationship between users and vocabulary words
user_vocabulary = Table(
    'user_vocabulary',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('vocabulary_id', Integer, ForeignKey('vocabulary.id')),
    Column('proficiency', Float, default=0.0),  # 0.0 to 1.0 representing mastery
    Column('last_reviewed', DateTime, default=datetime.datetime.utcnow)
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    native_language = Column(String(5), nullable=False)  # Language code (e.g., "en", "es")
    target_language = Column(String(5), nullable=False)  # Language code
    current_level = Column(String(20), default="Beginner")
    joined_date = Column(DateTime, default=datetime.datetime.utcnow)
    last_active = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    vocabulary = relationship("Vocabulary", secondary=user_vocabulary, back_populates="users")
    conversations = relationship("Conversation", back_populates="user")
    progress_records = relationship("ProgressRecord", back_populates="user")

class Vocabulary(Base):
    __tablename__ = 'vocabulary'
    
    id = Column(Integer, primary_key=True)
    word = Column(String(100), nullable=False)
    language = Column(String(5), nullable=False)  # Language code
    translation = Column(String(100))  # Translation to English or user's native language
    difficulty_level = Column(String(20))  # Beginner, Intermediate, Advanced, etc.
    part_of_speech = Column(String(20))  # Noun, Verb, Adjective, etc.
    example_sentence = Column(Text)
    
    # Relationships
    users = relationship("User", secondary=user_vocabulary, back_populates="vocabulary")

class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    topic = Column(String(100))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    language = Column(String(5), nullable=False)  # Language code
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'))
    is_user = Column(Boolean, default=True)  # True if user message, False if AI message
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

class ProgressRecord(Base):
    __tablename__ = 'progress_records'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    vocabulary_count = Column(Integer, default=0)  # Total vocabulary words known
    conversation_duration = Column(Integer, default=0)  # Time spent in conversation (minutes)
    mistakes_made = Column(Integer, default=0)  # Number of grammar/vocabulary mistakes
    mistakes_corrected = Column(Integer, default=0)  # Number of corrections accepted
    fluency_score = Column(Float, default=0.0)  # AI-evaluated fluency (0.0 to 1.0)
    
    # Relationships
    user = relationship("User", back_populates="progress_records")