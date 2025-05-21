import React from 'react';
import { AthleteSupplementWithDetails, SupplementCategory } from '../../types/supplements';
import SupplementCard from './SupplementCard';

interface SupplementCategoryListProps {
  category: SupplementCategory;
  supplements: AthleteSupplementWithDetails[];
  compact?: boolean;
}

const SupplementCategoryList: React.FC<SupplementCategoryListProps> = ({ 
  category, 
  supplements,
  compact = false
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
        {category}
      </h3>
      <div className="space-y-3">
        {supplements.slice(0, compact ? 3 : supplements.length).map(supplement => (
          <SupplementCard
            key={supplement.id}
            supplement={supplement}
            compact={compact}
          />
        ))}
        
        {compact && supplements.length > 3 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 pl-4">
            +{supplements.length - 3} more supplements
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplementCategoryList; 