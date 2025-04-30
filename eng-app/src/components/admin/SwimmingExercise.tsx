import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';

interface SwimmingExerciseProps {
  onAddSet: () => void;
  onUpdateSet: (index: number, field: 'time' | 'rest', value: string) => void;
  sets: Array<{ time: string; rest: string }>;
}

const SwimmingExercise: React.FC<SwimmingExerciseProps> = ({ 
  onAddSet, 
  onUpdateSet,
  sets = [{ time: '00:30:00', rest: '00:00' }] 
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [eachSide, setEachSide] = useState(false);
  const [tempo, setTempo] = useState('');

  return (
    <div className="mb-6 overflow-hidden border rounded-lg shadow dark:bg-gray-750 dark:border-gray-700">
      {/* Exercise Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 text-gray-500 bg-gray-200 rounded dark:bg-gray-600 dark:text-gray-300">
            🏊
          </div>
          <h3 className="font-medium dark:text-white">Swimming</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>
      
      {showNotes && (
        <div className="border-t dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="each-side-swimming"
                    checked={eachSide}
                    onChange={() => setEachSide(!eachSide)}
                    className="text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="each-side-swimming" className="text-sm text-gray-700 dark:text-gray-300">
                    Each Side
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Tempo</span>
                  <input 
                    type="text" 
                    className="w-20 px-2 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., 2:0:2"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="button"
                onClick={onAddSet}
                className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <FiPlus className="mr-1" /> Add Set
              </button>
            </div>
            
            <div className="overflow-hidden border rounded-md dark:border-gray-700">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Set</th>
                    <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Time</th>
                    <th className="px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Rest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sets.map((set, index) => (
                    <tr key={`set-${index}`} className="border-b dark:border-gray-700">
                      <td className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="px-4 py-2 text-center">
                        <input 
                          type="text" 
                          value={set.time}
                          onChange={(e) => onUpdateSet(index, 'time', e.target.value)}
                          className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input 
                          type="text" 
                          value={set.rest}
                          onChange={(e) => onUpdateSet(index, 'rest', e.target.value)}
                          className="w-full py-1 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none dark:text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Add note for this exercise
              </label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Add a note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwimmingExercise; 