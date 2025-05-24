/**
 * Utility functions for timer-related operations
 */

/**
 * Plays a countdown beep sound using Web Audio API
 */
export const playCountdownBeep = (): void => {
  try {
    // Create a beep sound using Web Audio API
    const AudioContext: typeof window.AudioContext = 
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    
    // Create audio context
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound
    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.3; // Lower volume for countdown
    
    // Play beep
    oscillator.start();
    
    // Stop after short duration
    setTimeout(() => {
      oscillator.stop();
    }, 200); // Short beep for countdown
  } catch (err) {
    console.error('Failed to play countdown beep:', err);
  }
};

/**
 * Plays a completion alert sound (higher pitched than the countdown beep)
 */
export const playAlertSound = (): void => {
  try {
    // Create a beep sound using Web Audio API
    const AudioContext: typeof window.AudioContext = 
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    
    // Create audio context
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound - higher pitch for alert
    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // A5 note - higher pitch
    gainNode.gain.value = 0.4; // Slightly louder
    
    // Play alert
    oscillator.start();
    
    // Play longer alert with fade out
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    // Stop after longer duration
    setTimeout(() => {
      oscillator.stop();
    }, 600); // Longer beep for alert
  } catch (err) {
    console.error('Failed to play alert sound:', err);
  }
};

/**
 * Formats seconds into a readable time string
 * 
 * @param seconds Number of seconds to format
 * @returns Formatted time string (MM:SS or HH:MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats rest time in a concise format (M:SS)
 * 
 * @param seconds Number of seconds to format
 * @returns Formatted rest time string
 */
export const formatRestTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
