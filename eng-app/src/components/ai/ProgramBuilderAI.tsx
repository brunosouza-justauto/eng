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
import { fetchAllExercises, findBestExerciseMatch } from '../../services/exerciseMatchingService';

interface ProgramBuilderAIProps {
  onProgramCreated: (programId: string) => void;
}

/**
 * Main component for the AI-powered program generation
 */
// String similarity calculation moved to exerciseMatchingService.ts

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
      content: `Please create a workout program for a ${data.gender}, ${data.age} years old, weighing ${data.weight}kg, ${data.height}cm tall with ${data.bodyFat}% body fat. Experience level: ${data.experience}. Goal: ${data.goal}. Training ${data.trainingDays}x per week for ${data.sessionDuration} minutes per session for ${data.weeks} weeks. Target muscle groups: ${data.targetMuscleGroups.join(', ')}. Equipment: ${data.availableEquipment.join(', ')}. Preferences: ${data.preferences}`,
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
          weeks: data.weeks,
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
      // STEP 1: Fetch all exercises from the database first to improve matching
      const allExercises = await fetchAllExercises();
      console.log(`Fetched ${allExercises.length} exercises for matching`);
      
      // First, insert the program template
      const { data: templateData, error: templateError } = await supabase
        .from('program_templates')
        .insert({
          name: generatedProgram.program_name,
          phase: generatedProgram.phase,
          weeks: generatedProgram.total_weeks,
          description: generatedProgram.description,
          fitness_level: generatedProgram.fitness_level,
          coach_id: 'c5e342a9-28a3-4fdb-9947-fe9e76c46b65',
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
        let order_in_program = 0;
        for (const workout of week.workouts) {
          // Create the workout
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .insert({
              program_template_id: templateId,
              name: workout.name,
              day_of_week: workout.day_number,
              week_number: week.week_number,
              description: workout.notes,
              order_in_program: order_in_program
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
            console.log('----------------');
            console.warn('PROCESSING EXERCISE:', exercise.name);
            console.info('Equipment:', exercise.equipment);
            console.info('Primary muscle group:', exercise.primary_muscle_group);
            
            // STEP 2: Use the two-step approach to match exercises
            // Find the best match from our pre-loaded exercise list
            const bestMatch = findBestExerciseMatch(
              exercise.name,
              exercise.primary_muscle_group,
              exercise.equipment,
              allExercises
            );
            
            console.error('Best match found:', bestMatch?.name || 'No match');
            console.log('----------------');
            
            // Use the matched exercise ID or create a new one if no match
            let exerciseId = bestMatch?.id || null;

            if (!exerciseId) {
              throw new Error('Failed to find exercise match');
              // Create the exercise if no match was found
              /*const { data: exerciseData, error: exerciseError } = await supabase
                .from('exercises')
                .insert({
                  name: exercise.name,
                  primary_muscle_group: exercise.primary_muscle_group,
                  target: exercise.primary_muscle_group,
                  equipment: exercise.equipment,
                  description: exercise.notes,
                  coach_id: 'c5e342a9-28a3-4fdb-9947-fe9e76c46b65',
                  type: 'General',
                  body_part: exercise.large_muscle_group,
                  is_public: false,
                  version: 1,
                  is_latest_version: true
                })
                .select('id')
                .single();
              
              if (exerciseError) throw exerciseError;
              
              if (!exerciseData?.id) {
                throw new Error('Failed to create exercise');
              }

              console.log('Created new exercise:', exerciseData.id);
              
              exerciseId = exerciseData.id;
              
              // Add the newly created exercise to our local cache for future matches
              allExercises.push({
                id: exerciseData.id,
                name: exercise.name,
                primary_muscle_group: exercise.primary_muscle_group,
                equipment: exercise.equipment,
                target: exercise.primary_muscle_group,
                body_part: exercise.large_muscle_group,
                description: exercise.notes
              });*/
            }
                        
            // Create the exercise instance
            const { data: exerciseInstanceData, error: exerciseError } = await supabase
              .from('exercise_instances')
              .insert({
                workout_id: workoutId,
                exercise_name: exercise.name,
                exercise_db_id: exerciseId,
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
            
            if (!exerciseInstanceData?.id) {
              throw new Error('Failed to create exercise instance');
            }
            
            const exerciseInstanceId = exerciseInstanceData.id;
            
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

          order_in_program++;
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
