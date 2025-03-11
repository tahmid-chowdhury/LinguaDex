import datetime
from typing import Dict, List, Any, Optional, Tuple
import json
import io
import base64
# Add these lines at the top of models/progress_tracker.py
import matplotlib
matplotlib.use('Agg')  # Use non-interactive Agg backend
import matplotlib.pyplot as plt

from database.db_handler import DatabaseHandler
from config import WORDS_PER_LEVEL

class ProgressTracker:
    def __init__(self, db_handler: DatabaseHandler):
        """Initialize the progress tracker with a database handler."""
        self.db = db_handler
    
    def track_conversation(self, 
                         user_id: int, 
                         conversation_id: int, 
                         duration_minutes: int,
                         messages: List[Dict[str, Any]],
                         analysis_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Track progress from a conversation session.
        
        Args:
            user_id: User ID
            conversation_id: Conversation ID
            duration_minutes: Conversation duration in minutes
            messages: List of message dictionaries
            analysis_results: List of message analysis results
            
        Returns:
            Dictionary with progress statistics
        """
        # Calculate progress statistics
        user_messages = [msg for msg in messages if msg.get("is_user", False)]
        
        total_words_used = sum(len(msg.get("content", "").split()) for msg in user_messages)
        unique_words_used = len(set(" ".join([msg.get("content", "") for msg in user_messages]).lower().split()))
        
        # Extract errors and vocabulary from analysis results
        all_errors = []
        all_vocabulary = []
        avg_fluency = 0.0
        
        for analysis in analysis_results:
            if "errors" in analysis:
                all_errors.extend(analysis.get("errors", []))
            
            if "vocabulary" in analysis:
                all_vocabulary.extend(analysis.get("vocabulary", []))
            
            if "fluency" in analysis:
                avg_fluency += analysis.get("fluency", 0)
        
        # Calculate average fluency if we have analysis results
        if analysis_results:
            avg_fluency /= len(analysis_results)
        
        # Count number of unique errors
        unique_errors = {json.dumps(error): error for error in all_errors}
        errors_count = len(unique_errors)
        
        # Add vocabulary words to user's dictionary
        added_vocab_count = 0
        for vocab_item in all_vocabulary:
            word = vocab_item.get("word", "")
            if word:
                # Determine proficiency from analysis if available
                proficiency = vocab_item.get("mastery", 0.1)
                success = self.db.add_word_to_user(
                    user_id=user_id, 
                    word=word,
                    language=self.db.get_user(user_id=user_id).target_language,
                    proficiency=proficiency
                )
                if success:
                    added_vocab_count += 1
        
        # Record progress in database
        self.db.record_progress(
            user_id=user_id,
            vocab_count=added_vocab_count,
            conversation_duration=duration_minutes,
            mistakes_made=errors_count,
            mistakes_corrected=0,  # Would need separate tracking of corrections
            fluency_score=avg_fluency
        )
        
        # Update user level based on vocabulary count
        level_changed = self.db.update_user_level(user_id)
        
        # Compile statistics
        stats = {
            "session_duration_minutes": duration_minutes,
            "total_words_used": total_words_used,
            "unique_words_used": unique_words_used,
            "new_vocabulary_added": added_vocab_count,
            "errors_made": errors_count,
            "average_fluency": avg_fluency,
            "level_changed": level_changed,
            "current_level": self.db.get_user(user_id=user_id).current_level
        }
        
        return stats
    
    def get_recommendations(self, user_id: int) -> Dict[str, Any]:
        """
        Get personalized learning recommendations.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with recommendations
        """
        user = self.db.get_user(user_id=user_id)
        if not user:
            return {"error": "User not found"}
        
        # Get user's vocabulary words with low proficiency for practice
        weak_vocabulary = self.db.get_user_vocabulary(
            user_id=user_id,
            max_proficiency=0.5,
            limit=10
        )
        
        # Get user's progress history
        progress_history = self.db.get_user_progress(user_id=user_id, days=30)
        
        # Calculate average fluency trend
        fluency_trend = [record.fluency_score for record in progress_history if record.fluency_score > 0]
        fluency_improving = len(fluency_trend) >= 2 and fluency_trend[-1] > fluency_trend[0]
        
        # Check vocabulary acquisition rate
        vocab_counts = [record.vocabulary_count for record in progress_history]
        vocab_rate = sum(vocab_counts) / len(vocab_counts) if vocab_counts else 0
        
        # Determine target vocabulary count for current level
        level_vocab_goals = WORDS_PER_LEVEL
        current_level = user.current_level
        current_vocab_count = sum([record.vocabulary_count for record in progress_history])
        next_level = next((level for level, count in level_vocab_goals.items() 
                           if level_vocab_goals.get(current_level, 0) < count), None)
        
        vocab_to_next_level = level_vocab_goals.get(next_level, 0) - current_vocab_count if next_level else 0
        
        # Generate recommendations
        recommendations = {
            "practice_vocabulary": [item.get("word") for item in weak_vocabulary],
            "focus_areas": [],
            "next_level_progress": {
                "current_level": current_level,
                "next_level": next_level,
                "vocabulary_needed": vocab_to_next_level,
                "estimated_days": round(vocab_to_next_level / (vocab_rate + 0.01)) if vocab_rate > 0 else "unknown"
            }
        }
        
        # Add focus areas based on analysis
        if not fluency_improving:
            recommendations["focus_areas"].append("Conversation practice to improve fluency")
        
        if vocab_rate < 5:
            recommendations["focus_areas"].append("Vocabulary acquisition - try to learn more new words")
        
        return recommendations
    
    def generate_progress_report(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """
        Generate a comprehensive progress report.
        
        Args:
            user_id: User ID
            days: Number of days to include in the report
            
        Returns:
            Dictionary with progress report
        """
        user = self.db.get_user(user_id=user_id)
        if not user:
            return {"error": "User not found"}
        
        # Get progress history
        progress_history = self.db.get_user_progress(user_id=user_id, days=days)
        
        # Group by date
        progress_by_date = {}
        for record in progress_history:
            date_str = record.date.strftime("%Y-%m-%d")
            if date_str not in progress_by_date:
                progress_by_date[date_str] = {
                    "vocabulary_count": 0,
                    "conversation_duration": 0,
                    "mistakes_made": 0,
                    "mistakes_corrected": 0,
                    "fluency_score": 0
                }
            
            progress_by_date[date_str]["vocabulary_count"] += record.vocabulary_count
            progress_by_date[date_str]["conversation_duration"] += record.conversation_duration
            progress_by_date[date_str]["mistakes_made"] += record.mistakes_made
            progress_by_date[date_str]["mistakes_corrected"] += record.mistakes_corrected
            
            # Average fluency scores
            if record.fluency_score > 0:
                if progress_by_date[date_str]["fluency_score"] > 0:
                    progress_by_date[date_str]["fluency_score"] = (
                        progress_by_date[date_str]["fluency_score"] + record.fluency_score
                    ) / 2
                else:
                    progress_by_date[date_str]["fluency_score"] = record.fluency_score
        
        # Calculate totals and averages
        total_vocab = sum(data["vocabulary_count"] for data in progress_by_date.values())
        total_duration = sum(data["conversation_duration"] for data in progress_by_date.values())
        avg_fluency = sum(data["fluency_score"] for data in progress_by_date.values()) / len(progress_by_date) if progress_by_date else 0
        
        # Get vocabulary proficiency distribution
        all_vocab = self.db.get_user_vocabulary(user_id=user_id, limit=1000)
        proficiency_distribution = {
            "low": len([v for v in all_vocab if v.get("proficiency", 0) < 0.3]),
            "medium": len([v for v in all_vocab if 0.3 <= v.get("proficiency", 0) < 0.7]),
            "high": len([v for v in all_vocab if v.get("proficiency", 0) >= 0.7])
        }
        
        # Calculate level progress
        current_level = user.current_level
        next_level = next((level for level, count in WORDS_PER_LEVEL.items() 
                         if WORDS_PER_LEVEL.get(current_level, 0) < count), None)
        
        level_progress = 0
        if next_level:
            current_threshold = WORDS_PER_LEVEL.get(current_level, 0)
            next_threshold = WORDS_PER_LEVEL.get(next_level, 0)
            progress_range = next_threshold - current_threshold
            
            # Calculate progress percentage to next level
            if progress_range > 0:
                level_progress = min(100, max(0, 
                    ((total_vocab - current_threshold) / progress_range) * 100
                ))
        
        # Compile report
        report = {
            "user_info": {
                "username": user.username,
                "target_language": user.target_language,
                "current_level": current_level,
                "next_level": next_level,
                "level_progress_percent": level_progress
            },
            "summary": {
                "period_days": days,
                "active_days": len(progress_by_date),
                "total_vocabulary_learned": total_vocab,
                "total_conversation_minutes": total_duration,
                "average_fluency_score": avg_fluency
            },
            "vocabulary": {
                "total_words": len(all_vocab),
                "proficiency_distribution": proficiency_distribution
            },
            "daily_progress": [
                {
                    "date": date,
                    "vocabulary_added": data["vocabulary_count"],
                    "minutes_practiced": data["conversation_duration"],
                    "fluency_score": data["fluency_score"]
                }
                for date, data in progress_by_date.items()
            ]
        }
        
        return report
    
    def generate_progress_chart(self, user_id: int, chart_type: str = "vocabulary", days: int = 30) -> Optional[str]:
        """
        Generate a progress chart as a base64-encoded image.
        
        Args:
            user_id: User ID
            chart_type: Type of chart (vocabulary, fluency, time)
            days: Number of days to include
            
        Returns:
            Base64-encoded image string or None if error
        """
        try:
            # Get progress history
            progress_history = self.db.get_user_progress(user_id=user_id, days=days)
            
            # Group by date
            progress_by_date = {}
            for record in progress_history:
                date_str = record.date.strftime("%Y-%m-%d")
                if date_str not in progress_by_date:
                    progress_by_date[date_str] = {
                        "vocabulary_count": 0,
                        "conversation_duration": 0,
                        "fluency_score": 0
                    }
                
                progress_by_date[date_str]["vocabulary_count"] += record.vocabulary_count
                progress_by_date[date_str]["conversation_duration"] += record.conversation_duration
                
                # Average fluency scores
                if record.fluency_score > 0:
                    if progress_by_date[date_str]["fluency_score"] > 0:
                        progress_by_date[date_str]["fluency_score"] = (
                            progress_by_date[date_str]["fluency_score"] + record.fluency_score
                        ) / 2
                    else:
                        progress_by_date[date_str]["fluency_score"] = record.fluency_score
            
            # Sort dates
            dates = sorted(progress_by_date.keys())
            
            if not dates:
                return None
            
            # Set up the plot
            plt.figure(figsize=(10, 6))
            
            if chart_type == "vocabulary":
                # Cumulative vocabulary over time
                cumulative_vocab = 0
                vocab_data = []
                for date in dates:
                    cumulative_vocab += progress_by_date[date]["vocabulary_count"]
                    vocab_data.append(cumulative_vocab)
                
                plt.plot(dates, vocab_data, marker='o', linewidth=2)
                plt.title('Vocabulary Growth Over Time')
                plt.ylabel('Total Words Learned')
                
            elif chart_type == "fluency":
                # Fluency scores over time
                fluency_data = [progress_by_date[date]["fluency_score"] for date in dates]
                plt.plot(dates, fluency_data, marker='o', linewidth=2, color='green')
                plt.title('Fluency Score Progression')
                plt.ylabel('Fluency Score (0-1)')
                
            elif chart_type == "time":
                # Time spent learning each day
                time_data = [progress_by_date[date]["conversation_duration"] for date in dates]
                plt.bar(dates, time_data, color='orange')
                plt.title('Daily Practice Time')
                plt.ylabel('Minutes Spent Learning')
            
            plt.xlabel('Date')
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Save plot to a bytes buffer
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            
            # Convert to base64
            img_str = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            return img_str
            
        except Exception as e:
            print(f"Error generating progress chart: {e}")
            return None