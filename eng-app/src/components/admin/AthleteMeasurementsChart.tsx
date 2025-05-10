import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { BodyMeasurement } from '../../services/measurementService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface AthleteMeasurementsChartProps {
  measurements: BodyMeasurement[];
  className?: string;
}

const AthleteMeasurementsChart: React.FC<AthleteMeasurementsChartProps> = ({ 
  measurements,
  className = '' 
}) => {
  // Sort measurements by date (oldest to newest)
  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort((a, b) => 
      new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
    );
  }, [measurements]);

  // Extract data for chart
  const chartData = useMemo(() => {
    const dates = sortedMeasurements.map(m => m.measurement_date);
    const weights = sortedMeasurements.map(m => m.weight_kg || 0);
    const bodyFatPercentages = sortedMeasurements.map(m => m.body_fat_percentage || 0);
    const leanMass = sortedMeasurements.map(m => m.lean_body_mass_kg || 0);
    const fatMass = sortedMeasurements.map(m => m.fat_mass_kg || 0);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Weight (kg)',
          data: weights,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Body Fat %',
          data: bodyFatPercentages,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y1',
        },
        {
          label: 'Lean Mass (kg)',
          data: leanMass,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
          hidden: true, // Hidden by default, user can toggle
        },
        {
          label: 'Fat Mass (kg)',
          data: fatMass,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
          yAxisID: 'y',
          hidden: true, // Hidden by default, user can toggle
        }
      ]
    };
  }, [sortedMeasurements]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM d, yyyy',
          displayFormats: {
            day: 'MMM d'
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Weight (kg)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Body Fat %'
        },
        min: 0,
        max: 40, // Adjust this based on your data range
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Body Composition Trends',
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            const date = new Date(tooltipItems[0].parsed.x);
            return date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          }
        }
      }
    },
  };

  // If no measurements or less than 2 measurements, show message
  if (!measurements || measurements.length < 2) {
    return (
      <div className={`p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          At least two measurements are needed to display a chart. 
          Add more measurements to see progress over time.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Body Composition Trends</h3>
      </div>
      <div className="p-4">
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
};

export default AthleteMeasurementsChart; 