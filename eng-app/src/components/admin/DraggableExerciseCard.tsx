import React from 'react';
import { useDrag } from 'react-dnd';

// Define item types for drag and drop
export const ItemTypes = {
    SEARCH_EXERCISE: 'search-exercise',
    WORKOUT_EXERCISE: 'workout-exercise',
    EXERCISE: 'exercise'
};

// Define LocalExercise type
interface LocalExercise {
    id: string;
    name: string;
    category: string;
    primaryMuscle: string;
    secondaryMuscles: string[];
    image?: string;
}

interface DraggableExerciseCardProps {
    exercise: LocalExercise;
    onClick: () => void;
}

// Component for draggable exercise cards
const DraggableExerciseCard: React.FC<DraggableExerciseCardProps> = ({ exercise, onClick }) => {
    // Extract the drag logic to its own component
    const [{ isDragging }, dragRef] = useDrag({
        type: ItemTypes.SEARCH_EXERCISE,
        item: { type: ItemTypes.SEARCH_EXERCISE, exercise },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    // Format category display to handle potential long category names
    const formatCategory = (category: string) => {
        return category.length > 15 ? `${category.substring(0, 12)}...` : category;
    };

    return (
        <div
            ref={dragRef}
            className={`flex items-center p-3 mb-2 bg-white border rounded-md cursor-pointer dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isDragging ? 'opacity-50' : 'opacity-100'
            }`}
            style={{ cursor: 'grab' }}
            title={`${exercise.name} (${exercise.category})`}
            onClick={onClick}
        >
            {exercise.image ? (
                <div className="w-20 h-20 mr-4 overflow-hidden bg-gray-100 rounded-md dark:bg-gray-700">
                    <img 
                        src={exercise.image} 
                        alt={exercise.name} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                            // If image fails to load, show a fallback
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=No+Image';
                        }}
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center w-20 h-20 mr-4 text-sm text-gray-500 bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-400">
                    No Image
                </div>
            )}
            <div className="flex-grow min-w-0">
                <h4 className="text-base font-medium truncate dark:text-white" title={exercise.name}>
                    {exercise.name}
                </h4>
                <div className="flex flex-wrap items-center mt-2 gap-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {formatCategory(exercise.category)}
                    </span>
                    {exercise.primaryMuscle && exercise.primaryMuscle !== exercise.category && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:bg-opacity-40 dark:text-indigo-300">
                            {exercise.primaryMuscle}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DraggableExerciseCard; 