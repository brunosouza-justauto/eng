import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format, parseISO } from 'date-fns';
import { FiArrowLeft, FiDownload, FiArrowUp, FiArrowDown, FiMinus, FiZoomIn } from 'react-icons/fi';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import html2canvas from 'html2canvas';

// Types for check-in data (same as in AthleteCheckInsPage)
interface CheckInData {
  id: string;
  user_id: string;
  check_in_date: string;
  photos: string[] | null;
  video_url: string | null;
  diet_adherence: string | null;
  training_adherence: string | null;
  steps_adherence: string | null;
  notes: string | null;
  coach_feedback: string | null;
  created_at: string;
  updated_at: string;
  body_metrics: { 
    weight_kg: number | null;
    body_fat_percentage: number | null;
    waist_cm: number | null;
    hip_cm: number | null;
    left_arm_cm: number | null;
    right_arm_cm: number | null;
    chest_cm: number | null;
    left_thigh_cm: number | null;
    right_thigh_cm: number | null;
  } | null;
  wellness_metrics: { 
    sleep_hours: number | null;
    sleep_quality: number | null;
    stress_level: number | null;
    fatigue_level: number | null;
    motivation_level: number | null;
    digestion: string | null;
    menstrual_cycle_notes: string | null;
  } | null;
}

interface AthleteData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Component for displaying measurements comparison
const MetricComparisonRow: React.FC<{
  label: string;
  value1: number | null;
  value2: number | null;
  unit: string;
  isBodyFat?: boolean;
}> = ({ label, value1, value2, unit, isBodyFat = false }) => {
  if (value1 === null && value2 === null) return null;
  
  // Calculate difference
  const diff = (value1 !== null && value2 !== null) 
    ? value1 - value2 
    : null;
  
  // Determine if change is good (for body fat, decrease is good; for other measurements, increase is good)
  const isPositiveChange = isBodyFat 
    ? diff !== null && diff < 0
    : diff !== null && diff > 0;
  
  return (
    <div className="grid grid-cols-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
      <div className="font-medium">{label}</div>
      <div className="text-center">{value1 !== null ? `${value1} ${unit}` : '-'}</div>
      <div className="text-center">{value2 !== null ? `${value2} ${unit}` : '-'}</div>
      <div className="text-center font-medium flex items-center justify-center gap-1">
        {diff === null ? (
          <span className="text-gray-500">-</span>
        ) : diff === 0 ? (
          <span className="flex items-center">
            <FiMinus className="mr-1 text-gray-500" />
            <span>0.0 {unit}</span>
          </span>
        ) : (
          <span className="flex items-center">
            {diff > 0 ? (
              <FiArrowUp className={`mr-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`} />
            ) : (
              <FiArrowDown className={`mr-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`} />
            )}
            <span>{Math.abs(diff).toFixed(1)} {unit}</span>
          </span>
        )}
      </div>
    </div>
  );
};

// Component for photos side by side with annotations
const PhotoComparison: React.FC<{
  photos1: string[] | null;
  photos2: string[] | null;
  date1: string;
  date2: string;
}> = ({ photos1, photos2, date1, date2 }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [imageUrls1, setImageUrls1] = useState<string[]>([]);
  const [imageUrls2, setImageUrls2] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      
      try {
        // Fetch URLs for the first check-in
        if (photos1 && photos1.length > 0) {
          const urls1 = await Promise.all(
            photos1.map(async (path) => {
              const { data, error } = await supabase.storage
                .from('progress-media')
                .createSignedUrl(path, 3600);
              
              if (error) throw error;
              return data.signedUrl;
            })
          );
          setImageUrls1(urls1);
        }
        
        // Fetch URLs for the second check-in
        if (photos2 && photos2.length > 0) {
          const urls2 = await Promise.all(
            photos2.map(async (path) => {
              const { data, error } = await supabase.storage
                .from('progress-media')
                .createSignedUrl(path, 3600);
              
              if (error) throw error;
              return data.signedUrl;
            })
          );
          setImageUrls2(urls2);
        }
      } catch (err) {
        console.error('Error fetching photo URLs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPhotos();
  }, [photos1, photos2]);
  
  // Determine the number of photo pairs to display
  const maxPhotos = Math.max(
    photos1 ? photos1.length : 0,
    photos2 ? photos2.length : 0
  );
  
  // Function to export the comparison as an image
  const exportAsImage = async () => {
    const element = document.getElementById('photo-collage');
    if (!element) return;
    
    try {
      // Add a temporary class for export styling
      element.classList.add('exporting');
      
      // Create a higher quality canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#2a3142', // Dark navy background to match the app theme
        useCORS: true,
        scale: 3, // Higher resolution for better quality
        logging: false,
        allowTaint: true,
        imageTimeout: 15000, // Longer timeout for image loading
        foreignObjectRendering: false // Better compatibility
      });
      
      // Remove the temporary class
      element.classList.remove('exporting');
      
      // Add text at the bottom of the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Add a gradient at the bottom for the text background
        const gradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        
        // Add text for the transformation period
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const progressText = `Progress: ${format(parseISO(date1), 'MMM d, yyyy')} to ${format(parseISO(date2), 'MMM d, yyyy')}`;
        ctx.fillText(progressText, canvas.width / 2, canvas.height - 15);
      }
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `progress-comparison-${format(parseISO(date1), 'yyyyMMdd')}-vs-${format(parseISO(date2), 'yyyyMMdd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('Failed to export the comparison as an image');
    }
  };

  // Handle fullscreen view
  const openFullscreen = (imageUrl: string) => {
    setFullscreenImage(imageUrl);
  };

  // Handle photo navigation
  const navigatePhotos = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPhotoIndex(prev => 
        prev === 0 ? maxPhotos - 1 : prev - 1
      );
    } else {
      setSelectedPhotoIndex(prev => 
        prev === maxPhotos - 1 ? 0 : prev + 1
      );
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }
  
  if (maxPhotos === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No photos available for comparison
      </div>
    );
  }

  return (
    <div id="photo-comparison" className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        {/* Photo navigation controls */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigatePhotos('prev')}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            disabled={maxPhotos <= 1}
            aria-label="Previous photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="text-sm font-medium">
            Photo {selectedPhotoIndex + 1} of {maxPhotos}
          </div>
          <button 
            onClick={() => navigatePhotos('next')}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            disabled={maxPhotos <= 1}
            aria-label="Next photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Export button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={exportAsImage}
          className="flex items-center"
        >
          <FiDownload className="mr-1.5" />
          Export as Image
        </Button>
      </div>

      {/* Thumbnails */}
      <div className="flex space-x-2 overflow-x-auto pb-2 mb-2">
        {Array.from({ length: maxPhotos }).map((_, index) => (
          <button
            key={index}
            onClick={() => setSelectedPhotoIndex(index)}
            className={`min-w-12 w-12 h-12 rounded-md overflow-hidden border-2 flex-shrink-0 ${
              selectedPhotoIndex === index
                ? 'border-indigo-500 shadow-md'
                : 'border-gray-300 dark:border-gray-700'
            } hover:border-indigo-300 transition-all duration-200`}
          >
            {imageUrls1[index] ? (
              <img
                src={imageUrls1[index]}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : imageUrls2[index] ? (
              <img
                src={imageUrls2[index]}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                {index + 1}
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Main photo comparison - tighter layout for better comparison */}
      <div className="flex justify-center w-full">
        <div id="photo-collage" className="flex flex-col md:flex-row md:space-x-3 space-y-4 md:space-y-0 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-w-2xl mx-auto">
          <div className="flex-1 flex flex-col max-w-sm">
            <div className="text-center font-medium mb-1 bg-white dark:bg-gray-700 px-4 py-2 rounded-t-lg">
              {format(parseISO(date1), 'MMM d, yyyy')} <span className="text-gray-500 text-sm">(Before)</span>
            </div>
            <div className="bg-white dark:bg-gray-700 w-full aspect-[3/4] md:h-[400px] flex items-center justify-center rounded-b-lg overflow-hidden relative group py-2">
              {imageUrls1[selectedPhotoIndex] ? (
                <>
                  <img
                    src={imageUrls1[selectedPhotoIndex]}
                    alt={`Check-in 1 photo ${selectedPhotoIndex + 1}`}
                    className="max-w-full max-h-full object-contain cursor-pointer rounded-lg"
                    onClick={() => openFullscreen(imageUrls1[selectedPhotoIndex])}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      className="absolute top-2 right-2 bg-white bg-opacity-25 rounded-full p-2 text-white hover:bg-opacity-50 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFullscreen(imageUrls1[selectedPhotoIndex]);
                      }}
                    >
                      <FiZoomIn />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-sm p-4 text-center">
                  No photo available for this angle
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col max-w-sm">
            <div className="text-center font-medium mb-1 bg-white dark:bg-gray-700 px-4 py-2 rounded-t-lg">
              {format(parseISO(date2), 'MMM d, yyyy')} <span className="text-gray-500 text-sm">(After)</span>
            </div>
            <div className="bg-white dark:bg-gray-700 w-full aspect-[3/4] md:h-[400px] flex items-center justify-center rounded-b-lg overflow-hidden relative group py-2">
              {imageUrls2[selectedPhotoIndex] ? (
                <>
                  <img
                    src={imageUrls2[selectedPhotoIndex]}
                    alt={`Check-in 2 photo ${selectedPhotoIndex + 1}`}
                    className="max-w-full max-h-full object-contain cursor-pointer rounded-lg"
                    onClick={() => openFullscreen(imageUrls2[selectedPhotoIndex])}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      className="absolute top-2 right-2 bg-white bg-opacity-25 rounded-full p-2 text-white hover:bg-opacity-50 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFullscreen(imageUrls2[selectedPhotoIndex]);
                      }}
                    >
                      <FiZoomIn />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-sm p-4 text-center">
                  No photo available for this angle
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen modal - positioned outside the main div to ensure proper z-index */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
          style={{ position: 'fixed', zIndex: 9999 }}
        >
          <div className="relative max-w-full max-h-full overflow-hidden">
            <img 
              src={fullscreenImage} 
              alt="Fullscreen view" 
              className="max-w-full max-h-[90vh] object-contain shadow-xl"
            />
            <button 
              className="absolute top-4 right-4 bg-white bg-opacity-25 rounded-full p-2 text-white hover:bg-opacity-50 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(null);
              }}
              aria-label="Close fullscreen view"
              style={{ cursor: 'pointer' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AthleteCheckInsComparePage: React.FC = () => {
  const { id, checkInId1, checkInId2 } = useParams<{ 
    id: string;
    checkInId1: string;
    checkInId2: string;
  }>();
  
  // Using athleteId variable name for consistency with the rest of the code
  const athleteId = id;
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [checkIn1, setCheckIn1] = useState<CheckInData | null>(null);
  const [checkIn2, setCheckIn2] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!athleteId) {
          setError('Missing athlete ID parameter');
          return;
        }
        
        if (!checkInId1 || !checkInId2) {
          setError('Missing one or both check-in ID parameters');
          return;
        }
        
        if (checkInId1 === checkInId2) {
          setError('Cannot compare a check-in with itself. Please select two different check-ins.');
          return;
        }
        
        // Fetch athlete data
        const { data: athleteData, error: athleteError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, user_id')
          .eq('id', athleteId)
          .single();
          
        if (athleteError) throw athleteError;
        setAthlete(athleteData);
        
        // Fetch first check-in
        const { data: checkInData1, error: checkInError1 } = await supabase
          .from('check_ins')
          .select(`
            id,
            user_id,
            check_in_date,
            photos,
            video_url,
            diet_adherence,
            training_adherence,
            steps_adherence,
            notes,
            coach_feedback,
            created_at,
            updated_at,
            body_metrics:body_metrics(
              weight_kg, 
              body_fat_percentage,
              waist_cm,
              hip_cm,
              left_arm_cm,
              right_arm_cm,
              chest_cm,
              left_thigh_cm,
              right_thigh_cm
            ),
            wellness_metrics:wellness_metrics(
              sleep_hours,
              sleep_quality,
              stress_level,
              fatigue_level,
              motivation_level,
              digestion,
              menstrual_cycle_notes
            )
          `)
          .eq('id', checkInId1)
          .single();
          
        if (checkInError1) throw checkInError1;
        
        // Fetch second check-in
        const { data: checkInData2, error: checkInError2 } = await supabase
          .from('check_ins')
          .select(`
            id,
            user_id,
            check_in_date,
            photos,
            video_url,
            diet_adherence,
            training_adherence,
            steps_adherence,
            notes,
            coach_feedback,
            created_at,
            updated_at,
            body_metrics:body_metrics(
              weight_kg, 
              body_fat_percentage,
              waist_cm,
              hip_cm,
              left_arm_cm,
              right_arm_cm,
              chest_cm,
              left_thigh_cm,
              right_thigh_cm
            ),
            wellness_metrics:wellness_metrics(
              sleep_hours,
              sleep_quality,
              stress_level,
              fatigue_level,
              motivation_level,
              digestion,
              menstrual_cycle_notes
            )
          `)
          .eq('id', checkInId2)
          .single();
          
        if (checkInError2) throw checkInError2;
        
        // Transform the data to match our interface
        const transformedCheckIn1 = {
          ...checkInData1,
          body_metrics: Array.isArray(checkInData1.body_metrics) && checkInData1.body_metrics.length > 0 
            ? checkInData1.body_metrics[0] 
            : checkInData1.body_metrics || null,
          wellness_metrics: Array.isArray(checkInData1.wellness_metrics) && checkInData1.wellness_metrics.length > 0 
            ? checkInData1.wellness_metrics[0] 
            : checkInData1.wellness_metrics || null
        } as CheckInData;
        
        const transformedCheckIn2 = {
          ...checkInData2,
          body_metrics: Array.isArray(checkInData2.body_metrics) && checkInData2.body_metrics.length > 0 
            ? checkInData2.body_metrics[0] 
            : checkInData2.body_metrics || null,
          wellness_metrics: Array.isArray(checkInData2.wellness_metrics) && checkInData2.wellness_metrics.length > 0 
            ? checkInData2.wellness_metrics[0] 
            : checkInData2.wellness_metrics || null
        } as CheckInData;
        
        // Sort by date (oldest first, newest second)
        if (parseISO(transformedCheckIn1.check_in_date) > parseISO(transformedCheckIn2.check_in_date)) {
          setCheckIn1(transformedCheckIn2); // Older check-in (goes on left)
          setCheckIn2(transformedCheckIn1); // Newer check-in (goes on right)
        } else {
          setCheckIn1(transformedCheckIn1); // Older check-in (goes on left)
          setCheckIn2(transformedCheckIn2); // Newer check-in (goes on right)
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load check-in data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [athleteId, checkInId1, checkInId2]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4">
        <PageHeader title="Error" />
        <Card>
          <div className="p-4 text-red-500">{error}</div>
          <div className="px-4 pb-4">
            <Button
              onClick={() => athleteId ? navigate(`/admin/athletes/${athleteId}/check-ins`) : navigate('/admin/athletes')}
              variant="secondary"
              className="flex items-center"
            >
              <FiArrowLeft className="mr-1.5" />
              Back to Check-ins
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  if (!athlete || !checkIn1 || !checkIn2) {
    return (
      <div className="p-4">
        <PageHeader title="Data Not Found" />
        <Card>
          <div className="p-4">The requested check-in data could not be found.</div>
        </Card>
      </div>
    );
  }
  
  // Calculate time between check-ins
  const date1 = parseISO(checkIn1.check_in_date);
  const date2 = parseISO(checkIn2.check_in_date);
  const diffInDays = Math.abs(Math.round((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)));
  
  return (
    <div className="p-4">
      <PageHeader 
        title={`${athlete.first_name} ${athlete.last_name}'s Check-in Comparison`} 
        subtitle={`Compare progress between ${format(date1, 'MMM dd, yyyy')} and ${format(date2, 'MMM dd, yyyy')} (${diffInDays} days)`}
      />
      
      <div className="mb-6">
        <Button
          onClick={() => navigate(`/admin/athletes/${athleteId}/check-ins`)}
          variant="secondary"
          className="flex items-center"
        >
          <FiArrowLeft className="mr-1.5" />
          Back to Check-ins
        </Button>
      </div>
      
      <div className="grid gap-4 mb-6">
        {/* Photos Comparison */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Progress Photos</h2>
            <PhotoComparison 
              photos1={checkIn1.photos} 
              photos2={checkIn2.photos}
              date1={checkIn1.check_in_date}
              date2={checkIn2.check_in_date}
            />
          </div>
        </Card>
        
        {/* Body Metrics Comparison */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Body Measurements</h2>
            
            {(checkIn1.body_metrics || checkIn2.body_metrics) ? (
              <div>
                <div className="grid grid-cols-4 py-2 border-b-2 border-gray-300 dark:border-gray-600 font-medium text-sm">
                  <div>Measurement</div>
                  <div className="text-center">{format(date1, 'MMM dd, yyyy')}</div>
                  <div className="text-center">{format(date2, 'MMM dd, yyyy')}</div>
                  <div className="text-center">Change</div>
                </div>
                
                <MetricComparisonRow 
                  label="Weight" 
                  value1={checkIn1.body_metrics?.weight_kg || null} 
                  value2={checkIn2.body_metrics?.weight_kg || null}
                  unit="kg"
                />
                
                <MetricComparisonRow 
                  label="Body Fat %" 
                  value1={checkIn1.body_metrics?.body_fat_percentage || null} 
                  value2={checkIn2.body_metrics?.body_fat_percentage || null}
                  unit="%"
                  isBodyFat={true}
                />
                
                <MetricComparisonRow 
                  label="Waist" 
                  value1={checkIn1.body_metrics?.waist_cm || null} 
                  value2={checkIn2.body_metrics?.waist_cm || null}
                  unit="cm"
                />
                
                <MetricComparisonRow 
                  label="Hip" 
                  value1={checkIn1.body_metrics?.hip_cm || null} 
                  value2={checkIn2.body_metrics?.hip_cm || null}
                  unit="cm"
                />
                
                <MetricComparisonRow 
                  label="Chest" 
                  value1={checkIn1.body_metrics?.chest_cm || null} 
                  value2={checkIn2.body_metrics?.chest_cm || null}
                  unit="cm"
                />
                
                <MetricComparisonRow 
                  label="Left Arm" 
                  value1={checkIn1.body_metrics?.left_arm_cm || null} 
                  value2={checkIn2.body_metrics?.left_arm_cm || null}
                  unit="cm"
                />
                
                <MetricComparisonRow 
                  label="Right Arm" 
                  value1={checkIn1.body_metrics?.right_arm_cm || null} 
                  value2={checkIn2.body_metrics?.right_arm_cm || null}
                  unit="cm"
                />
                
                <MetricComparisonRow 
                  label="Left Thigh" 
                  value1={checkIn1.body_metrics?.left_thigh_cm || null} 
                  value2={checkIn2.body_metrics?.left_thigh_cm || null}
                  unit="cm"
                />
                
                <MetricComparisonRow 
                  label="Right Thigh" 
                  value1={checkIn1.body_metrics?.right_thigh_cm || null} 
                  value2={checkIn2.body_metrics?.right_thigh_cm || null}
                  unit="cm"
                />
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No measurement data available for comparison
              </div>
            )}
          </div>
        </Card>
        
        {/* Wellness Metrics Comparison */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Wellness Metrics</h2>
            
            {(checkIn1.wellness_metrics || checkIn2.wellness_metrics) ? (
              <div>
                <div className="grid grid-cols-4 py-2 border-b-2 border-gray-300 dark:border-gray-600 font-medium text-sm">
                  <div>Metric</div>
                  <div className="text-center">{format(date1, 'MMM dd, yyyy')}</div>
                  <div className="text-center">{format(date2, 'MMM dd, yyyy')}</div>
                  <div className="text-center">Change</div>
                </div>
                
                <MetricComparisonRow 
                  label="Sleep Hours" 
                  value1={checkIn1.wellness_metrics?.sleep_hours || null} 
                  value2={checkIn2.wellness_metrics?.sleep_hours || null}
                  unit="hrs"
                />
                
                <MetricComparisonRow 
                  label="Sleep Quality" 
                  value1={checkIn1.wellness_metrics?.sleep_quality || null} 
                  value2={checkIn2.wellness_metrics?.sleep_quality || null}
                  unit="/10"
                />
                
                <MetricComparisonRow 
                  label="Stress Level" 
                  value1={checkIn1.wellness_metrics?.stress_level || null} 
                  value2={checkIn2.wellness_metrics?.stress_level || null}
                  unit="/10"
                />
                
                <MetricComparisonRow 
                  label="Fatigue Level" 
                  value1={checkIn1.wellness_metrics?.fatigue_level || null} 
                  value2={checkIn2.wellness_metrics?.fatigue_level || null}
                  unit="/10"
                />
                
                <MetricComparisonRow 
                  label="Motivation Level" 
                  value1={checkIn1.wellness_metrics?.motivation_level || null} 
                  value2={checkIn2.wellness_metrics?.motivation_level || null}
                  unit="/10"
                />
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No wellness data available for comparison
              </div>
            )}
          </div>
        </Card>
        
        {/* Adherence Comparison */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Adherence & Notes</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">{format(date1, 'MMM dd, yyyy')}</h3>
                
                <div className="space-y-3">
                  {checkIn1.diet_adherence && (
                    <div>
                      <div className="text-sm font-medium">Diet Adherence</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn1.diet_adherence}</div>
                    </div>
                  )}
                  
                  {checkIn1.training_adherence && (
                    <div>
                      <div className="text-sm font-medium">Training Adherence</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn1.training_adherence}</div>
                    </div>
                  )}
                  
                  {checkIn1.notes && (
                    <div>
                      <div className="text-sm font-medium">Notes</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn1.notes}</div>
                    </div>
                  )}
                  
                  {checkIn1.coach_feedback && (
                    <div>
                      <div className="text-sm font-medium">Coach Feedback</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn1.coach_feedback}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">{format(date2, 'MMM dd, yyyy')}</h3>
                
                <div className="space-y-3">
                  {checkIn2.diet_adherence && (
                    <div>
                      <div className="text-sm font-medium">Diet Adherence</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn2.diet_adherence}</div>
                    </div>
                  )}
                  
                  {checkIn2.training_adherence && (
                    <div>
                      <div className="text-sm font-medium">Training Adherence</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn2.training_adherence}</div>
                    </div>
                  )}
                  
                  {checkIn2.notes && (
                    <div>
                      <div className="text-sm font-medium">Notes</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn2.notes}</div>
                    </div>
                  )}
                  
                  {checkIn2.coach_feedback && (
                    <div>
                      <div className="text-sm font-medium">Coach Feedback</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{checkIn2.coach_feedback}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AthleteCheckInsComparePage;
