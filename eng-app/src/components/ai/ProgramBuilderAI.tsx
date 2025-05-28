import React, { useState } from 'react';
import { FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import ChatHistory, { Message } from './ChatHistory';
import ChatInput from './ChatInput';
import ProgramBuilderForm, { AthleteFormData } from './ProgramBuilderForm';
import ProgramResult from './ProgramResult';
import { generateProgram, AIProgram, ProgramGenerationRequest } from '../../services/programBuilderService';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { SetType } from '../../types/adminTypes';

interface ProgramBuilderAIProps {
  onProgramCreated: (programId: string) => void;
}

/**
 * Main component for the AI-powered program generation
 */
/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
const calculateStringSimilarity = (str1: string, str2: string): number => {
  // If either string is empty, similarity is 0
  if (!str1.length || !str2.length) return 0;
  
  // If strings are identical, similarity is 1
  if (str1 === str2) return 1;
  
  // Create matrix for Levenshtein distance calculation
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Calculate Levenshtein distance
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Convert distance to similarity score (0 to 1)
  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
};

const ProgramBuilderAI: React.FC<ProgramBuilderAIProps> = ({ onProgramCreated }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      content: "Hello! I'm your AI workout program assistant. I can help you create personalized training programs for your athletes based on their profiles and goals. To get started, select an athlete below and adjust their information as needed.",
      isAI: true,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormMode, setIsFormMode] = useState(true);
  const [generatedProgram, setGeneratedProgram] = useState<AIProgram | null>(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  
  const profile = useSelector(selectProfile);

  // Toggle expansion of the chat interface
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle form submission to generate program
  const handleFormSubmit = async (data: AthleteFormData) => {
    setIsLoading(true);
    setIsFormMode(false);
    
    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      content: `Please create a workout program for a ${data.gender}, ${data.age} years old, weighing ${data.weight}kg, ${data.height}cm tall with ${data.bodyFat}% body fat. Experience level: ${data.experience}. Goal: ${data.goal}. Training ${data.trainingDays}x per week for ${data.sessionDuration} minutes per session. Target muscle groups: ${data.targetMuscleGroups.join(', ')}. Equipment: ${data.availableEquipment.join(', ')}. Preferences: ${data.preferences}`,
      isAI: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Create request for the API
      const request: ProgramGenerationRequest = {
        athleteData: {
          gender: data.gender,
          age: data.age,
          weight: data.weight,
          height: data.height,
          bodyFat: data.bodyFat,
          experience: data.experience,
          goal: data.goal,
          trainingDays: data.trainingDays,
          sessionDuration: data.sessionDuration,
          preferences: data.preferences,
          targetMuscleGroups: data.targetMuscleGroups,
          availableEquipment: data.availableEquipment,
          injuryConsiderations: data.injuryConsiderations
        }
      };

      // Generate program
      const result = await generateProgram(request);

      if (result.success && result.data) {
        // Add AI response to chat
        const aiResponse: Message = {
          id: uuidv4(),
          content: `I've created a "${result.data.phase}" program for your athlete at the "${result.data.fitness_level}" fitness level. It's a ${result.data.total_weeks}-week program with ${result.data.days_per_week} workouts per week. The program focuses on ${result.data.description.toLowerCase()} You can review the details below.`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        
        // Store the generated program
        setGeneratedProgram(result.data);
      } else {
        // Add error message to chat
        const errorMessage: Message = {
          id: uuidv4(),
          content: `Sorry, I encountered an error while generating the program: ${result.error || 'Unknown error'}. Please try again.`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error in program generation:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: `Sorry, something went wrong while generating the program. Please try again.`,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending a regular chat message
  const handleSendMessage = (content: string) => {
    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      content,
      isAI: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // For now, just respond with a simple message
    setIsLoading(true);
    
    setTimeout(() => {
      const aiResponse: Message = {
        id: uuidv4(),
        content: "I'm here to help you create workout programs based on athlete data. If you'd like to create a new program, please use the form above. If you have questions about how to use this feature, feel free to ask!",
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  // Function to save the generated program to the database
  const handleSaveProgram = async () => {
    if (!generatedProgram || !profile?.id) return;
    
    setIsSavingProgram(true);
    
    try {
      // First, insert the program template
      const { data: templateData, error: templateError } = await supabase
        .from('program_templates')
        .insert({
          name: generatedProgram.program_name,
          phase: generatedProgram.phase,
          weeks: generatedProgram.total_weeks,
          description: generatedProgram.description,
          fitness_level: generatedProgram.fitness_level,
          coach_id: profile.id,
          is_public: false,
          version: 1,
          is_latest_version: true
        })
        .select('id')
        .single();
      
      if (templateError) throw templateError;

      if (!templateData?.id) {
        throw new Error('Failed to create program template');
      }
      
      const templateId = templateData.id;
      
      // Create workouts for each week and day
      for (const week of generatedProgram.weeks) {
        for (const workout of week.workouts) {
          // Create the workout
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .insert({
              program_template_id: templateId,
              name: workout.name,
              day_of_week: workout.day_number,
              week_number: week.week_number,
              description: workout.notes
            })
            .select('id')
            .single();
          
          if (workoutError) throw workoutError;
          
          if (!workoutData?.id) {
            throw new Error('Failed to create workout');
          }
          
          const workoutId = workoutData.id;
          
          // Create exercise instances for this workout
          for (const [index, exercise] of workout.exercises.entries()) {
            // Look up potential exercise matches in the database
            // First, try to find a close match based on name
            const { data: potentialMatches } = await supabase
              .from('exercises')
              .select('id, name, primary_muscle_group, equipment, target')
              .or(`name.eq.${exercise.name}, name.eq.${exercise.equipment} ${exercise.name}, name.ilike.%${exercise.equipment} ${exercise.name}%,original_name.ilike.%${exercise.name}%`)
              .limit(20);
            
            // If no matches based on name, try by target muscle
            let exerciseMatches = potentialMatches || [];
            if (exerciseMatches.length === 0 && exercise.target_muscle) {
              const { data: muscleMatches } = await supabase
                .from('exercises')
                .select('id, name, primary_muscle_group, equipment, target')
                .or(`primary_muscle_group.ilike.%${exercise.target_muscle}%,target.ilike.%${exercise.target_muscle}%`)
                .limit(20);
              
              exerciseMatches = muscleMatches || [];
            }
            
            // Score each potential match to find the best one
            let bestMatch = null;
            let bestScore = 0;
            
            for (const match of exerciseMatches) {
              let score = 0;
              
              // Name similarity (most important)
              const nameSimilarity = calculateStringSimilarity(exercise.name.toLowerCase(), match.name.toLowerCase());
              score += nameSimilarity * 10; // Weight name similarity heavily
              
              // Equipment match
              if (match.equipment && exercise.equipment && 
                  match.equipment.toLowerCase().includes(exercise.equipment.toLowerCase())) {
                score += 3;
              }
              
              // Target muscle match
              if (match.primary_muscle_group && exercise.target_muscle && 
                  match.primary_muscle_group.toLowerCase().includes(exercise.target_muscle.toLowerCase())) {
                score += 5;
              } else if (match.target && exercise.target_muscle && 
                       match.target.toLowerCase().includes(exercise.target_muscle.toLowerCase())) {
                score += 4;
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = match;
              }
            }
            
            // Only use the match if it has a reasonable score
            const exerciseId = (bestScore >= 5) ? bestMatch?.id : null;
            
            // Create the exercise instance
            const { data: exerciseData, error: exerciseError } = await supabase
              .from('exercise_instances')
              .insert({
                workout_id: workoutId,
                exercise_name: exercise.name,
                exercise_db_id: exerciseId, // Use the found exercise ID if available
                order_in_workout: index + 1,
                notes: exercise.notes,
                tempo: exercise.tempo,
                rest_period_seconds: exercise.rest_seconds,
                sets: exercise.sets,
                reps: exercise.reps,
              })
              .select('id')
              .single();
            
            if (exerciseError) throw exerciseError;
            
            if (!exerciseData?.id) {
              throw new Error('Failed to create exercise instance');
            }
            
            const exerciseInstanceId = exerciseData.id;
            
            // Parse reps range (e.g., "8-12" or "5")
            let minReps = 0;
            let maxReps = 0;

            let exercise_type = exercise.set_type;
            let isRange = false;
            
            if (exercise.reps.includes('-')) {
              const [min, max] = exercise.reps.split('-').map(Number);
              minReps = min;
              maxReps = max;
              isRange = true;
            } else {
              minReps = maxReps = parseInt(exercise.reps);
            }
            
            // Create sets for this exercise
            const sets = [];
            for (let i = 1; i <= exercise.sets; i++) {

              let reps = maxReps;

              if (isRange && i === exercise.sets) {
                exercise_type = SetType.FAILURE;
                reps = minReps;
              }

              sets.push({
                exercise_instance_id: exerciseInstanceId,
                type: exercise_type,
                set_order: i,
                reps: reps,
                rest_seconds: exercise.rest_seconds,
              });
            }
            
            // Insert all sets at once
            const { error: setsError } = await supabase
              .from('exercise_sets')
              .insert(sets);
            
            if (setsError) throw setsError;
          }
        }
      }
      
      // Add success message to chat
      const successMessage: Message = {
        id: uuidv4(),
        content: `Great! I've successfully created the program "${generatedProgram.program_name}" in your database. You can now view and edit it in the program builder.`,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Reset the form and program
      setGeneratedProgram(null);
      setIsFormMode(true);
      
      // Notify parent component about the new program
      onProgramCreated(templateId);
      
    } catch (error) {
      console.error('Error saving program:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: `Sorry, I encountered an error while saving the program: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSavingProgram(false);
    }
  };

  // Reset to form mode
  const handleCreateNewProgram = () => {
    setGeneratedProgram(null);
    setIsFormMode(true);
  };

  return (
    <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between bg-indigo-600 p-4 cursor-pointer"
        onClick={toggleExpansion}
      >
        <div className="flex items-center">
          <FiMessageSquare className="text-white mr-2" />
          <h2 className="text-lg font-medium text-white">AI Program Builder Assistant</h2>
        </div>
        <div className="flex items-center">
          <button 
            onClick={(e) => { 
              e.stopPropagation();
              handleCreateNewProgram();
            }}
            className="mr-4 text-sm bg-white text-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-50"
          >
            New Program
          </button>
          {isExpanded ? (
            <FiChevronUp className="text-white" />
          ) : (
            <FiChevronDown className="text-white" />
          )}
        </div>
      </div>
      
      {/* Main content */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-800">
          {/* Form or Result display */}
          <div className="p-4">
            {isFormMode ? (
              <ProgramBuilderForm 
                onSubmit={handleFormSubmit}
                isSubmitting={isLoading}
              />
            ) : generatedProgram ? (
              <ProgramResult 
                program={generatedProgram}
                onSaveProgram={handleSaveProgram}
                isSaving={isSavingProgram}
              />
            ) : null}
          </div>
          
          {/* Chat interface */}
          <div className="h-64 flex flex-col border-t border-gray-200 dark:border-gray-700">
            <ChatHistory messages={messages} isLoading={isLoading} />
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={isLoading || isSavingProgram}
              placeholder="Ask a question about program design..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramBuilderAI;
