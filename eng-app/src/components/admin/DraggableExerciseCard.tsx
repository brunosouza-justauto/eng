import React from 'react';
import { useDrag } from 'react-dnd';
import { FiVideo } from 'react-icons/fi';

// Define ItemTypes
const ItemTypes = {
    SEARCH_EXERCISE: 'search_exercise',
    WORKOUT_EXERCISE: 'workout_exercise',
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

// Component for draggable exercise cards
const DraggableExerciseCard: React.FC<{ 
    exercise: LocalExercise; 
    onClick: () => void;
}> = ({ exercise, onClick }) => {
    // Extract the drag logic to its own component
    const [{ isDragging }, dragRef] = useDrag({
        type: ItemTypes.SEARCH_EXERCISE,
        item: exercise,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <div
            ref={dragRef}
            className="cursor-move"
            onClick={onClick}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <div className="overflow-hidden transition-shadow duration-200 border rounded-lg shadow-sm cursor-pointer hover:shadow-md dark:bg-gray-750 dark:border-gray-700">
                {/* Exercise Image */}
                <div className="relative flex items-center justify-center h-24 bg-gray-200 dark:bg-gray-700">
                    {exercise.image ? (
                        <img 
                            src={exercise.image} 
                            alt={exercise.name} 
                            className="object-cover w-full h-full"
                            onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            }}
                        />
                    ) : (
                        <FiVideo className="text-xl text-gray-400 dark:text-gray-500" />
                    )}
                    <div className="absolute bottom-1 right-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`}>
                            {exercise.category}
                        </span>
                    </div>
                </div>
                
                {/* Exercise Details */}
                <div className="p-2">
                    <h3 className="text-sm font-medium truncate dark:text-white">{exercise.name}</h3>
                    <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                        {exercise.primaryMuscle}
                        {exercise.secondaryMuscles.length > 0 && `, ${exercise.secondaryMuscles[0]}`}
                        {exercise.secondaryMuscles.length > 1 && '...'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DraggableExerciseCard;
export { ItemTypes }; 