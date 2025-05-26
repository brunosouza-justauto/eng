import React, { useMemo, useRef, useEffect } from 'react';
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
import { format, parseISO } from 'date-fns';
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
  hideTitle?: boolean;
}

const AthleteMeasurementsChart: React.FC<AthleteMeasurementsChartProps> = ({ 
  measurements,
  className = '',
  hideTitle = false
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  
  // Cleanup chart instance on unmount or data change
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [measurements]);
  // Sort measurements by date (oldest to newest)
  const sortedMeasurements = useMemo(() => {
    if (!measurements || measurements.length === 0) return [];
    return [...measurements]
      .filter(m => m.measurement_date) // Filter out any entries without dates
      .sort((a, b) => {
        // Safely parse dates
        const dateA = a.measurement_date ? new Date(a.measurement_date).getTime() : 0;
        const dateB = b.measurement_date ? new Date(b.measurement_date).getTime() : 0;
        return dateA - dateB;
      });
  }, [measurements]);

  // Extract data for chart
  const chartData = useMemo(() => {
    // Create properly formatted data points for chart.js
    const dataPoints = sortedMeasurements.map(m => ({
      x: m.measurement_date ? parseISO(m.measurement_date) : new Date(),
      y_weight: m.weight_kg || 0,
      y_bf: m.body_fat_percentage || 0,
      y_lean: m.lean_body_mass_kg || 0,
      y_fat: m.fat_mass_kg || 0
    }));

    return {
      datasets: [
        {
          label: 'Weight (kg)',
          data: dataPoints.map(p => ({ x: p.x, y: p.y_weight })),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Body Fat %',
          data: dataPoints.map(p => ({ x: p.x, y: p.y_bf })),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y1',
        },
        {
          label: 'Lean Mass (kg)',
          data: dataPoints.map(p => ({ x: p.x, y: p.y_lean })),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
          hidden: true, // Hidden by default, user can toggle
        },
        {
          label: 'Fat Mass (kg)',
          data: dataPoints.map(p => ({ x: p.x, y: p.y_fat })),
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
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          displayFormats: {
            day: 'MMM d',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        ticks: {
          source: 'auto',
          autoSkip: true,
          maxRotation: 45,
          minRotation: 0
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
        display: !hideTitle,
        text: 'Body Composition Trends',
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            try {
              const date = new Date(tooltipItems[0].parsed.x);
              return format(date, 'MMMM d, yyyy');
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
              return 'Unknown date';
            }
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
    <div className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {!hideTitle && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Body Composition Trends</h3>
        </div>
      )}
      <div className="p-4" style={{ height: '400px' }}>
        <Line 
          options={options} 
          data={chartData} 
          ref={(reference) => {
            if (reference) {
              chartRef.current = reference;
            }
          }}
        />
      </div>
    </div>
  );
};

export default AthleteMeasurementsChart; 