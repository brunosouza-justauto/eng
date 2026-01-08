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
    "Rise and grind! 💪",
    "New day, new gains!",
    "Morning champion!",
    "Early bird gets the gains!",
    "Let's start strong!",
  ],
  afternoon: [
    "Keep pushing! 🔥",
    "Halfway through, stay strong!",
    "Afternoon warrior!",
    "Don't stop now!",
    "Momentum is building!",
  ],
  evening: [
    "Evening hustle! 💪",
    "Finish strong tonight!",
    "Last push of the day!",
    "Champions train at night too!",
    "Close out the day right!",
  ],
  night: [
    "Night owl grinding! 🌙",
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
    "Halfway there! 🔥",
    "You're crushing it!",
    "Don't stop now!",
    "The hard part is done!",
    "Keep that energy up!",
  ],
  almostThere: [
    "Almost there! Push through!",
    "So close to greatness!",
    "Final stretch! 💪",
    "Victory is near!",
    "One more push!",
  ],
  complete: [
    "You're unstoppable! 🏆",
    "All goals crushed!",
    "Champion status! 👑",
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
    "One week strong! 🔥",
    "Weekly warrior!",
    "Dedication paying off!",
  ],
  '14-29': [
    "Two weeks of power!",
    "Unstoppable force!",
    "True commitment!",
  ],
  '30+': [
    "Monthly master! 🏆",
    "Elite dedication!",
    "Living the lifestyle!",
  ],
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const getGreeting = (name: string): string => {
  const timeOfDay = getTimeOfDay();
  const greeting = getRandomItem(greetings[timeOfDay]);
  return `${greeting.replace('!', `, ${name}!`)}`;
};

export const getMotivationalMessage = (progressPercent: number): string => {
  if (progressPercent >= 100) {
    return getRandomItem(progressMessages.complete);
  } else if (progressPercent >= 75) {
    return getRandomItem(progressMessages.almostThere);
  } else if (progressPercent >= 50) {
    return getRandomItem(progressMessages.halfway);
  } else if (progressPercent > 0) {
    return getRandomItem(progressMessages.started);
  }
  return getRandomItem(progressMessages.notStarted);
};

export const getStreakMessage = (streak: number): string => {
  if (streak === 0) {
    return getRandomItem(streakMessages['0']);
  } else if (streak <= 3) {
    return getRandomItem(streakMessages['1-3']);
  } else if (streak <= 6) {
    return getRandomItem(streakMessages['4-6']);
  } else if (streak <= 13) {
    return getRandomItem(streakMessages['7-13']);
  } else if (streak <= 29) {
    return getRandomItem(streakMessages['14-29']);
  }
  return getRandomItem(streakMessages['30+']);
};

export const getTaskEncouragement = (taskName: string, isComplete: boolean, progress: number): string => {
  if (isComplete) {
    const completeMessages = [
      `${taskName} done! ✓`,
      `${taskName} crushed!`,
      `${taskName} complete!`,
    ];
    return getRandomItem(completeMessages);
  }

  if (progress === 0) {
    return `Start your ${taskName.toLowerCase()}!`;
  } else if (progress < 50) {
    return `Keep logging ${taskName.toLowerCase()}!`;
  } else {
    return `Almost done with ${taskName.toLowerCase()}!`;
  }
};
