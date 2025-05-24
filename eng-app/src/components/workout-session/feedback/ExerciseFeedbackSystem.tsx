import React, { useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import ExerciseFeedbackForm from './ExerciseFeedbackForm';
import { generateRecommendation } from './feedbackUtils';
import { 
  ExerciseFeedback, 
  FeedbackRecommendation, 
  WorkoutData, 
} from '../../../types/workoutTypes';

interface ExerciseFeedbackSystemProps {
  workoutSessionId: string | null;
  workoutId: string;
  userId: string;
  workout: WorkoutData | null;
  showingFeedbackForm: string | null;
  setShowingFeedbackForm: (exerciseId: string | null) => void;
  setExerciseFeedback: (feedback: Record<string, ExerciseFeedback>) => void;
  setFeedbackRecommendations: (recommendations: Record<string, FeedbackRecommendation[]>) => void;
  onFeedbackSubmitted: (message: string) => void;
}

const ExerciseFeedbackSystem: React.FC<ExerciseFeedbackSystemProps> = ({
  workoutSessionId,
  workoutId,
  userId,
  workout,
  showingFeedbackForm,
  setShowingFeedbackForm,
  setExerciseFeedback,
  setFeedbackRecommendations,
  onFeedbackSubmitted
}) => {
  // Function to save feedback for an exercise
  const saveFeedback = async (feedback: ExerciseFeedback) => {
    try {
      const { data, error } = await supabase
        .from('exercise_feedback')
        .insert(feedback)
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Update the local state with the saved feedback
        const updatedFeedback: Record<string, ExerciseFeedback> = {};
        updatedFeedback[feedback.exercise_instance_id] = data[0];
        setExerciseFeedback(updatedFeedback);
        
        // Hide the feedback form
        setShowingFeedbackForm(null);
        
        // Show confirmation message
        onFeedbackSubmitted('Thank you for your feedback!');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      onFeedbackSubmitted('Error saving feedback. Please try again.');
    }
  };

  const loadCurrentSessionFeedback = async (currentSessionId: string | null) => {
    const feedbackObj: Record<string, ExerciseFeedback> = {};

    console.log('Current session ID:', currentSessionId);
      
    try {
      if (currentSessionId) {
        const { data: currentFeedback, error: currentFeedbackError } = await supabase
          .from('exercise_feedback')
          .select('*')
          .eq('workout_session_id', currentSessionId);
        
        if (currentFeedbackError) throw currentFeedbackError;
        
        if (currentFeedback && currentFeedback.length > 0) {
          // Add current session feedback to our collection
          for (const feedback of currentFeedback) {
            feedbackObj[feedback.exercise_instance_id] = feedback;
          }
        }
      }
      
      setExerciseFeedback(feedbackObj);
    } catch (error) {
      console.error('Error loading current session feedback:', error);
    }
  };

  // Function to load previously saved exercise feedback from prior completed sessions
  const loadExerciseFeedback = async (currentSessionId: string | null, workout: WorkoutData | null) => {
    if (!userId || !workoutId || !workout) return;
    
    try {
      console.log('Loading exercise feedback from previous completed sessions...');
      
      // First, find previous completed sessions for this workout
      const { data: previousSessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('workout_id', workoutId)
        .not('end_time', 'is', null) // Only get completed sessions
        .order('end_time', { ascending: false }) // Most recent first
        .limit(1); // Get only the most recent session
      
      if (sessionsError) throw sessionsError;
      
      if (!previousSessions || previousSessions.length === 0) {
        console.log('No previous completed sessions found');
        return;
      }
      
      console.log(`Found previous completed sessions`);
      
      // Now process feedback for each exercise in the current workout
      const processedExercises = new Set<string>(); // Track which exercises we've already processed
      const feedbackObj: Record<string, ExerciseFeedback> = {};

      const recommendationsObj: Record<string, FeedbackRecommendation[]> = {};
      
      // For each exercise in the current workout
      for (const exercise of workout?.exercise_instances || []) {
        // Skip if we've already processed this exercise
        if (processedExercises.has(exercise.id)) continue;
        
        // Get the most recent feedback for this exercise from any previous session
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('exercise_feedback')
          .select('*')
          .in('workout_session_id', previousSessions.map(s => s.id)) // From any previous completed session
          .eq('exercise_instance_id', exercise.id)
          .order('created_at', { ascending: false }) // Most recent first
          .limit(1);
        
        if (feedbackError) {
          console.error(`Error fetching feedback for exercise ${exercise.id}:`, feedbackError);
          continue;
        }
        
        if (feedbackData && feedbackData.length > 0) {
          const feedback = feedbackData[0];
          console.log(`Found previous feedback for exercise ${exercise.exercise_name}:`, feedback);
          
          // Store the feedback
          feedbackObj[exercise.id] = feedback;
          
          // Generate recommendation based on the feedback
          const recommendation = generateRecommendation(feedback);
          if (recommendation) {
            console.log(`Generated recommendation for ${exercise.exercise_name}:`, recommendation);
            // Create the recommendations object
            recommendationsObj[exercise.id] = recommendation;
          }
          
          // Mark exercise as processed
          processedExercises.add(exercise.id);
        }
      }
      
      // Now check if there's feedback for the current session too

      
      // Update state with all feedback
      setFeedbackRecommendations(recommendationsObj);
      
    } catch (error) {
      console.error('Error loading exercise feedback:', error);
    }
  };

  // Load feedback when component mounts or when workout/session changes
  useEffect(() => {
    console.log('Loading exercise feedback...');

    if (workout && (workoutId || workoutSessionId)) {
      loadExerciseFeedback(workoutSessionId, workout);
    }

    if (workoutSessionId) {
      loadCurrentSessionFeedback(workoutSessionId);
    }
  }, [workoutId, workoutSessionId]);

  // Render the feedback form for a specific exercise
  const renderFeedbackForm = () => {
    if (!showingFeedbackForm || !workoutSessionId) return null;

    return (
      <ExerciseFeedbackForm
        exerciseInstanceId={showingFeedbackForm}
        workoutSessionId={workoutSessionId}
        onSubmit={saveFeedback}
        onCancel={() => setShowingFeedbackForm(null)}
      />
    );
  };

  return (
    <>
      {renderFeedbackForm()}
    </>
  );
};

export default ExerciseFeedbackSystem;
