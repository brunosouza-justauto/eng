/**
 * Dynamic motivational messages based on time of day and progress
 */

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const greetings: Record<TimeOfDay, string[]> = {
  morning: [
    "Rise and grind!",
    "New day, new gains!",
    "Morning champion!",
    "Early bird gets the gains!",
    "Let's start strong!",
  ],
  afternoon: [
    "Keep pushing!",
    "Halfway through, stay strong!",
    "Afternoon warrior!",
    "Don't stop now!",
    "Momentum is building!",
  ],
  evening: [
    "Evening hustle!",
    "Finish strong tonight!",
    "Last push of the day!",
    "Champions train at night too!",
    "Close out the day right!",
  ],
  night: [
    "Night owl grinding!",
    "Rest well, train hard!",
    "Recovery time soon!",
    "Great work today!",
    "Sleep tight, grow right!",
  ],
};

const progressMessages = {
  notStarted: [
    "Time to get moving!",
    "Your goals are waiting!",
    "Let's make it happen!",
    "No zero days!",
    "Start small, finish big!",
  ],
  started: [
    "Great start! Keep going!",
    "You're on your way!",
    "Building momentum!",
    "One step at a time!",
    "Progress in motion!",
  ],
  halfway: [
    "Halfway there!",
    "You're crushing it!",
    "Don't stop now!",
    "The hard part is done!",
    "Keep that energy up!",
  ],
  almostThere: [
    "Almost there! Push through!",
    "So close to greatness!",
    "Final stretch!",
    "Victory is near!",
    "One more push!",
  ],
  complete: [
    "You're unstoppable!",
    "All goals crushed!",
    "Champion status!",
    "Perfect day achieved!",
    "Beast mode: COMPLETE!",
  ],
};

const streakMessages: Record<string, string[]> = {
  '0': [
    "Start your streak today!",
    "Day 1 starts now!",
    "Build that habit!",
  ],
  '1-3': [
    "Building momentum!",
    "Keep it going!",
    "Consistency is key!",
  ],
  '4-6': [
    "Almost a full week!",
    "You're getting stronger!",
    "Habits forming!",
  ],
  '7-13': [
    "One week strong!",
    "Weekly warrior!",
    "Dedication paying off!",
  ],
  '14-29': [
    "Two weeks of power!",
    "Unstoppable force!",
    "True commitment!",
  ],
  '30+': [
    "Monthly master!",
    "Elite dedication!",
    "Living the lifestyle!",
  ],
};

// Use a seeded selection based on a key to ensure stable messages within a session
const getSeededItem = <T>(arr: T[], seed: number): T => {
  const index = Math.abs(seed) % arr.length;
  return arr[index];
};

// Get a simple hash from a string for seeding
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

// Generate a daily seed that changes once per day
const getDailySeed = (): number => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

export const getGreeting = (name: string): string => {
  const timeOfDay = getTimeOfDay();
  const seed = getDailySeed() + simpleHash('greeting');
  const greeting = getSeededItem(greetings[timeOfDay], seed);
  return `${greeting.replace('!', `, ${name}!`)}`;
};

/**
 * Get a motivational message based on progress
 * @param progressPercent Current progress percentage
 * @param variant Use 'primary' for header, 'secondary' for Daily Score section
 */
export const getMotivationalMessage = (progressPercent: number, variant: 'primary' | 'secondary' = 'primary'): string => {
  let messages: string[];

  if (progressPercent >= 100) {
    messages = progressMessages.complete;
  } else if (progressPercent >= 75) {
    messages = progressMessages.almostThere;
  } else if (progressPercent >= 50) {
    messages = progressMessages.halfway;
  } else if (progressPercent > 0) {
    messages = progressMessages.started;
  } else {
    messages = progressMessages.notStarted;
  }

  // Use different seeds for primary and secondary to ensure different messages
  const baseSeed = getDailySeed() + Math.floor(progressPercent / 25);
  const variantOffset = variant === 'primary' ? 0 : 3;

  return getSeededItem(messages, baseSeed + variantOffset);
};

/**
 * Get a streak message
 * @param streak Current streak count
 * @param variant Use different variant to avoid collision with other messages
 */
export const getStreakMessage = (streak: number, variant: 'primary' | 'secondary' = 'primary'): string => {
  let key: string;

  if (streak === 0) {
    key = '0';
  } else if (streak <= 3) {
    key = '1-3';
  } else if (streak <= 6) {
    key = '4-6';
  } else if (streak <= 13) {
    key = '7-13';
  } else if (streak <= 29) {
    key = '14-29';
  } else {
    key = '30+';
  }

  const messages = streakMessages[key];
  const baseSeed = getDailySeed() + streak;
  const variantOffset = variant === 'primary' ? 0 : 2;

  return getSeededItem(messages, baseSeed + variantOffset);
};

export const getTaskEncouragement = (taskName: string, isComplete: boolean, progress: number): string => {
  if (isComplete) {
    const completeMessages = [
      `${taskName} done!`,
      `${taskName} crushed!`,
      `${taskName} complete!`,
    ];
    const seed = getDailySeed() + simpleHash(taskName);
    return getSeededItem(completeMessages, seed);
  }

  if (progress === 0) {
    return `Start your ${taskName.toLowerCase()}!`;
  } else if (progress < 50) {
    return `Keep logging ${taskName.toLowerCase()}!`;
  } else {
    return `Almost done with ${taskName.toLowerCase()}!`;
  }
};
