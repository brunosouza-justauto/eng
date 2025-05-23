import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FoodItem } from '../../types/mealPlanning';
import FoodItemManager from './FoodItemManager';
import CustomFoodItemForm from './CustomFoodItemForm';

interface FoodItemRouteHandlerProps {
  onSelectFoodItem?: (foodItem: FoodItem) => void;
  returnTo?: string;
}

const FoodItemRouteHandler: React.FC<FoodItemRouteHandlerProps> = ({
  onSelectFoodItem,
  returnTo
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'browse' | 'create'>('browse');
  
  const handleFoodItemSelect = (foodItem: FoodItem) => {
    if (onSelectFoodItem) {
      onSelectFoodItem(foodItem);
    }
    
    if (returnTo) {
      navigate(returnTo);
    }
  };
  
  const handleClose = () => {
    if (returnTo) {
      navigate(returnTo);
    }
  };
  
  const handleCustomFoodSave = (foodItem: FoodItem) => {
    if (onSelectFoodItem) {
      onSelectFoodItem(foodItem);
    }
    
    // Return to browse mode or redirect back
    if (returnTo) {
      navigate(returnTo);
    } else {
      setMode('browse');
    }
  };
  
  return (
    <div className="container mx-auto">
      {mode === 'browse' ? (
        <FoodItemManager
          onSelectFoodItem={handleFoodItemSelect}
          onAddCustom={() => setMode('create')}
          onClose={handleClose}
        />
      ) : (
        <CustomFoodItemForm
          onSave={handleCustomFoodSave}
          onCancel={() => setMode('browse')}
        />
      )}
    </div>
  );
};

export default FoodItemRouteHandler; 