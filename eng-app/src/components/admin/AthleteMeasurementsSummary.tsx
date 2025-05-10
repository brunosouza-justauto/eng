import React, { useMemo } from 'react';
import { BodyMeasurement } from '../../services/measurementService';
import { format } from 'date-fns';

interface AthleteMeasurementsSummaryProps {
  measurements: BodyMeasurement[];
  className?: string;
}

const AthleteMeasurementsSummary: React.FC<AthleteMeasurementsSummaryProps> = ({
  measurements,
  className = ''
}) => {
  const summary = useMemo(() => {
    if (!measurements || measurements.length === 0) {
      return null;
    }

    // Sort measurements by date (newest to oldest)
    const sorted = [...measurements].sort((a, b) => 
      new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
    );

    const latest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    
    // Calculate changes
    const weightChange = latest.weight_kg && oldest.weight_kg
      ? latest.weight_kg - oldest.weight_kg
      : null;
      
    const bfChange = latest.body_fat_percentage && oldest.body_fat_percentage
      ? latest.body_fat_percentage - oldest.body_fat_percentage
      : null;
      
    const leanMassChange = latest.lean_body_mass_kg && oldest.lean_body_mass_kg
      ? latest.lean_body_mass_kg - oldest.lean_body_mass_kg
      : null;
      
    const fatMassChange = latest.fat_mass_kg && oldest.fat_mass_kg
      ? latest.fat_mass_kg - oldest.fat_mass_kg
      : null;
      
    // Calculate time period
    const latestDate = new Date(latest.measurement_date);
    const oldestDate = new Date(oldest.measurement_date);
    const daysDiff = Math.floor((latestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      latest,
      oldest,
      weightChange,
      bfChange,
      leanMassChange,
      fatMassChange,
      daysDiff,
      weeksDiff: Math.floor(daysDiff / 7),
      monthsDiff: Math.floor(daysDiff / 30)
    };
  }, [measurements]);

  if (!summary) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Progress Summary</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Changes from {format(new Date(summary.oldest.measurement_date), 'MMM d, yyyy')} to {format(new Date(summary.latest.measurement_date), 'MMM d, yyyy')}
          {summary.daysDiff > 0 && ` (${summary.daysDiff} days)`}
        </p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Weight Change */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Weight</div>
            <div className="mt-1 flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.latest.weight_kg?.toFixed(1)} kg
              </div>
              {summary.weightChange !== null && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                  summary.weightChange > 0 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                    : summary.weightChange < 0 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {summary.weightChange > 0 ? '+' : ''}
                  {summary.weightChange.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          {/* Body Fat Change */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Body Fat</div>
            <div className="mt-1 flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.latest.body_fat_percentage?.toFixed(1)}%
              </div>
              {summary.bfChange !== null && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                  summary.bfChange > 0 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                    : summary.bfChange < 0 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {summary.bfChange > 0 ? '+' : ''}
                  {summary.bfChange.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          {/* Lean Mass Change */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Lean Mass</div>
            <div className="mt-1 flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.latest.lean_body_mass_kg?.toFixed(1)} kg
              </div>
              {summary.leanMassChange !== null && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                  summary.leanMassChange > 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                    : summary.leanMassChange < 0 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {summary.leanMassChange > 0 ? '+' : ''}
                  {summary.leanMassChange.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          {/* Fat Mass Change */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Fat Mass</div>
            <div className="mt-1 flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.latest.fat_mass_kg?.toFixed(1)} kg
              </div>
              {summary.fatMassChange !== null && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                  summary.fatMassChange > 0 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                    : summary.fatMassChange < 0 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {summary.fatMassChange > 0 ? '+' : ''}
                  {summary.fatMassChange.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AthleteMeasurementsSummary; 