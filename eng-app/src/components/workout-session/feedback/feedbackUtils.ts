import { 
  ExerciseFeedback, 
  FeedbackRecommendation
} from '../../../types/workoutTypes';

/**
 * Generates exercise recommendations based on previous feedback
 * 
 * @param feedback Previous exercise feedback
 * @returns Feedback recommendation or null if no recommendation can be generated
 */
export const generateRecommendation = (
  feedback: ExerciseFeedback
): FeedbackRecommendation[] | null => {
  if (!feedback) return null;

  const { pain_level, workload_level, pump_level } = feedback;

  if (!pain_level && !workload_level && !pump_level) return null;

  const recommendations: FeedbackRecommendation[] = [];

  // Pain takes priority - if pain is high, recommend changing the exercise
  if (pain_level && pain_level >= 4) {
    recommendations.push({
      type: 'pain',
      message: `Based on your previous feedback, this exercise caused significant pain. Consider a different exercise or consult your coach.`,
      action: 'change_exercise'
    });
  }
  
  // Workload level recommendations
  if (workload_level) {
    if (workload_level <= 2) {
      recommendations.push({
        type: 'workload',
        message: `Last time, this exercise felt too easy. Consider increasing the weight to challenge yourself more.`,
        action: 'increase_weight'
      });
    }
    
    if (workload_level && workload_level > 4) {
      recommendations.push({
        type: 'workload',
        message: `Last time, this exercise felt too difficult. Consider decreasing the weight to maintain proper form.`,
        action: 'decrease_weight'
      });
    }
  }
  
  // Pump level recommendations
  if (pump_level && pump_level <= 2) {
    recommendations.push({
      type: 'pump',
      message: `You didn't feel much pump with this exercise last time. Consider increasing the number of reps or adjusting the tempo.`,
      action: 'adjust_reps'
    });
  }
  
  return recommendations;
};
