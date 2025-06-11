import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BFCalculationMethod, BodyMeasurement, calculateBodyComposition, calculateBMR, calculateJacksonPollock3, calculateJacksonPollock4, calculateJacksonPollock7, calculateDurninWomersley, calculateNavyTape, calculateParrillo, saveMeasurement } from '../../services/measurementService';
import { selectProfile } from '../../store/slices/authSlice';
import Button from '../ui/Button';
import { FiHelpCircle, FiX } from 'react-icons/fi';

interface AthleteBodyMeasurementFormProps {
  athleteId: string;
  athleteData: {
    gender: 'male' | 'female';
    age: number;
    height_cm: number;
  };
  existingMeasurement?: BodyMeasurement;
  onSaved: () => void;
}

const AthleteBodyMeasurementForm: React.FC<AthleteBodyMeasurementFormProps> = ({
  athleteId,
  athleteData,
  existingMeasurement,
  onSaved
}) => {
  const profile = useSelector(selectProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState<string>('');
  const [calculationMethod, setCalculationMethod] = useState<BFCalculationMethod>(BFCalculationMethod.JACKSON_POLLOCK_7);
  
  // Circumference measurements
  const [waist, setWaist] = useState<string>('');
  const [neck, setNeck] = useState<string>('');
  const [hips, setHips] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [abdominal, setAbdominal] = useState<string>('');
  const [thigh, setThigh] = useState<string>('');
  
  // Skinfold measurements
  const [tricep, setTricep] = useState<string>('');
  const [subscapular, setSubscapular] = useState<string>('');
  const [suprailiac, setSuprailiac] = useState<string>('');
  const [midaxillary, setMidaxillary] = useState<string>('');
  const [bicep, setBicep] = useState<string>('');
  const [lowerBack, setLowerBack] = useState<string>('');
  const [calf, setCalf] = useState<string>('');
  
  // Calculated values
  const [bodyFatPercentage, setBodyFatPercentage] = useState<string>('');
  const [bodyFatOverride, setBodyFatOverride] = useState<string>('');
  const [leanMass, setLeanMass] = useState<string>('');
  const [fatMass, setFatMass] = useState<string>('');
  const [bmr, setBmr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpImage, setHelpImage] = useState<string>('');
  const [helpTitle, setHelpTitle] = useState<string>('');

  // Load existing measurement data if available
  useEffect(() => {
    if (existingMeasurement) {
      setDate(existingMeasurement.measurement_date);
      setWeight(existingMeasurement.weight_kg?.toString() || '');
      setCalculationMethod(existingMeasurement.calculation_method || BFCalculationMethod.JACKSON_POLLOCK_7);
      
      // Circumference
      setWaist(existingMeasurement.waist_cm?.toString() || '');
      setNeck(existingMeasurement.neck_cm?.toString() || '');
      setHips(existingMeasurement.hips_cm?.toString() || '');
      
      // Skinfold
      setChest(existingMeasurement.chest_mm?.toString() || '');
      setAbdominal(existingMeasurement.abdominal_mm?.toString() || '');
      setThigh(existingMeasurement.thigh_mm?.toString() || '');
      setTricep(existingMeasurement.tricep_mm?.toString() || '');
      setSubscapular(existingMeasurement.subscapular_mm?.toString() || '');
      setSuprailiac(existingMeasurement.suprailiac_mm?.toString() || '');
      setMidaxillary(existingMeasurement.midaxillary_mm?.toString() || '');
      setBicep(existingMeasurement.bicep_mm?.toString() || '');
      setLowerBack(existingMeasurement.lower_back_mm?.toString() || '');
      setCalf(existingMeasurement.calf_mm?.toString() || '');
      
      // Results
      setBodyFatPercentage(existingMeasurement.body_fat_percentage?.toString() || '');
      setBodyFatOverride(existingMeasurement.body_fat_override?.toString() || '');
      setLeanMass(existingMeasurement.lean_body_mass_kg?.toString() || '');
      setFatMass(existingMeasurement.fat_mass_kg?.toString() || '');
      setBmr(existingMeasurement.basal_metabolic_rate?.toString() || '');
      setNotes(existingMeasurement.notes || '');
    }
  }, [existingMeasurement]);

  // Calculate body fat percentage based on selected method
  const calculateBodyFat = () => {
    const { gender, age, height_cm } = athleteData;
    const weightKg = parseFloat(weight);
    
    if (!weight || isNaN(weightKg)) {
      setError('Weight is required for calculation');
      return;
    }
    
    let bf = 0;
    
    try {
      switch (calculationMethod) {
        case BFCalculationMethod.JACKSON_POLLOCK_3:
          if (gender === 'male') {
            if (!chest || !abdominal || !thigh) {
              setError('For males, chest, abdominal, and thigh skinfold measurements (in mm) are required for Jackson-Pollock 3-site formula');
              return;
            }
            bf = calculateJacksonPollock3(
              gender, 
              age, 
              parseFloat(chest), 
              parseFloat(abdominal), 
              parseFloat(thigh)
            );
          } else { // female
            if (!tricep || !suprailiac || !thigh) {
              setError('For females, tricep, suprailiac, and thigh skinfold measurements (in mm) are required for Jackson-Pollock 3-site formula');
              return;
            }
            bf = calculateJacksonPollock3(
              gender, 
              age, 
              0, // chest (not used for females)
              0, // abdominal (not used for females)
              parseFloat(thigh),
              parseFloat(tricep),
              parseFloat(suprailiac)
            );
          }
          break;
          
        case BFCalculationMethod.JACKSON_POLLOCK_4:
          if (!abdominal || !suprailiac || !tricep || !thigh) {
            setError('Abdominal, suprailiac, tricep, and thigh skinfold measurements (in mm) are required for Jackson-Pollock 4-site formula');
            return;
          }
          bf = calculateJacksonPollock4(
            gender, 
            age, 
            parseFloat(abdominal), 
            parseFloat(suprailiac), 
            parseFloat(tricep), 
            parseFloat(thigh)
          );
          break;
          
        case BFCalculationMethod.JACKSON_POLLOCK_7:
          if (!chest || !midaxillary || !tricep || !subscapular || !abdominal || !suprailiac || !thigh) {
            setError('All 7 site skinfold measurements (in mm) are required for Jackson-Pollock 7-site formula');
            return;
          }
          bf = calculateJacksonPollock7(
            gender, 
            age, 
            parseFloat(chest), 
            parseFloat(midaxillary), 
            parseFloat(tricep), 
            parseFloat(subscapular), 
            parseFloat(abdominal), 
            parseFloat(suprailiac), 
            parseFloat(thigh)
          );
          break;
          
        case BFCalculationMethod.DURNIN_WOMERSLEY:
          if (!bicep || !tricep || !subscapular || !suprailiac) {
            setError('Bicep, tricep, subscapular, and suprailiac skinfold measurements (in mm) are required for Durnin-Womersley formula');
            return;
          }
          bf = calculateDurninWomersley(
            gender, 
            age, 
            parseFloat(bicep), 
            parseFloat(tricep), 
            parseFloat(subscapular), 
            parseFloat(suprailiac)
          );
          break;
          
        case BFCalculationMethod.PARRILLO:
          if (!chest || !abdominal || !thigh || !bicep || !tricep || !subscapular || !suprailiac || !lowerBack || !calf) {
            setError('All 9 site skinfold measurements (in mm) are required for Parrillo formula');
            return;
          }
          bf = calculateParrillo(
            gender, 
            parseFloat(chest), 
            parseFloat(abdominal), 
            parseFloat(thigh), 
            parseFloat(bicep), 
            parseFloat(tricep), 
            parseFloat(subscapular), 
            parseFloat(suprailiac), 
            parseFloat(lowerBack), 
            parseFloat(calf)
          );
          break;
          
        case BFCalculationMethod.NAVY_TAPE:
          if (!neck || !waist) {
            setError('Neck and waist circumference measurements (in cm) are required for all genders.');
            return;
          }
          if (gender === 'female' && !hips) {
            setError('For females, hip circumference measurements (in cm) are also required for Navy Tape method.');
            return;
          }
          bf = calculateNavyTape(
            gender, 
            height_cm, 
            parseFloat(neck), 
            parseFloat(waist), 
            gender === 'female' ? parseFloat(hips) : undefined
          );
          break;
          
        default:
          setError('Invalid calculation method');
          return;
      }
      
      setBodyFatPercentage(bf.toString());
      
      // Calculate body composition
      const composition = calculateBodyComposition(weightKg, bf);
      setLeanMass(composition.leanMassKg.toString());
      setFatMass(composition.fatMassKg.toString());
      
      // Calculate BMR
      const calculatedBmr = calculateBMR(gender, weightKg, height_cm, age);
      setBmr(calculatedBmr.toString());
      
      setError(null);
    } catch (err) {
      console.error('Calculation error:', err);
      setError('Error in calculation. Please check your inputs.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!date || !weight) {
        throw new Error('Date and weight are required');
      }
      
      // Prepare the measurement data
      const measurementData: BodyMeasurement = {
        id: existingMeasurement?.id,
        user_id: athleteId,
        measurement_date: date,
        weight_kg: weight ? parseFloat(weight) : undefined,
        weight_change_kg: existingMeasurement?.weight_kg 
          ? parseFloat(weight) - existingMeasurement.weight_kg 
          : undefined,
        
        // Circumference measurements
        waist_cm: waist ? parseFloat(waist) : undefined,
        neck_cm: neck ? parseFloat(neck) : undefined,
        hips_cm: hips ? parseFloat(hips) : undefined,
        
        // Skinfold measurements
        chest_mm: chest ? parseFloat(chest) : undefined,
        abdominal_mm: abdominal ? parseFloat(abdominal) : undefined,
        thigh_mm: thigh ? parseFloat(thigh) : undefined,
        tricep_mm: tricep ? parseFloat(tricep) : undefined,
        subscapular_mm: subscapular ? parseFloat(subscapular) : undefined,
        suprailiac_mm: suprailiac ? parseFloat(suprailiac) : undefined,
        midaxillary_mm: midaxillary ? parseFloat(midaxillary) : undefined,
        bicep_mm: bicep ? parseFloat(bicep) : undefined,
        lower_back_mm: lowerBack ? parseFloat(lowerBack) : undefined,
        calf_mm: calf ? parseFloat(calf) : undefined,
        
        // Body composition
        body_fat_percentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : undefined,
        body_fat_override: bodyFatOverride ? parseFloat(bodyFatOverride) : undefined,
        lean_body_mass_kg: leanMass ? parseFloat(leanMass) : undefined,
        fat_mass_kg: fatMass ? parseFloat(fatMass) : undefined,
        basal_metabolic_rate: bmr ? parseFloat(bmr) : undefined,
        
        calculation_method: calculationMethod,
        notes,
        created_by: profile?.user_id
      };
      
      // Use the body_fat_override if provided
      if (bodyFatOverride) {
        measurementData.body_fat_percentage = parseFloat(bodyFatOverride);
        
        // Recalculate body composition with the override
        if (weight) {
          const composition = calculateBodyComposition(
            parseFloat(weight), 
            parseFloat(bodyFatOverride)
          );
          measurementData.lean_body_mass_kg = composition.leanMassKg;
          measurementData.fat_mass_kg = composition.fatMassKg;
        }
      }
      
      // Save the measurement
      const { error: saveError } = await saveMeasurement(measurementData);
      
      if (saveError) {
        throw saveError;
      }
      
      // Call the onSaved callback
      onSaved();
      
    } catch (err: Error | unknown) {
      console.error('Error saving measurement:', err);
      setError(err instanceof Error ? err.message : 'Failed to save measurement');
    } finally {
      setLoading(false);
    }
  };
  
  // Show help modal with measurement image
  const showHelp = (measurement: string) => {
    const imageMap: Record<string, { image: string; title: string }> = {
      chest: { image: '/images/chest_mm.jpg', title: 'Chest Measurement' },
      abdominal: { image: '/images/abdominal_mm.jpg', title: 'Abdominal Measurement' },
      thigh: { image: '/images/thigh_mm.jpg', title: 'Thigh Measurement' },
      bicep: { image: '/images/bicep_mm.jpg', title: 'Bicep Measurement' },
      tricep: { image: '/images/tricep_mm.jpg', title: 'Tricep Measurement' },
      subscapular: { image: '/images/subscapular_mm.jpg', title: 'Subscapular Measurement' },
      suprailiac: { image: '/images/suprailiac_mm.jpg', title: 'Suprailiac Measurement' },
      lower_back: { image: '/images/lower_back_mm.jpg', title: 'Lower Back Measurement' },
      calf: { image: '/images/calf_mm.jpg', title: 'Calf Measurement' },
      midaxillary: { image: '/images/midaxillary_mm.jpg', title: 'Midaxillary Measurement' },
      neck: { image: '/images/neck_cm.jpg', title: 'Neck Measurement' },
      waist: { image: '/images/waist_cm.jpg', title: 'Waist Measurement' },
      overall: { image: '/images/man_body_fat_diagram.gif', title: 'Body Fat Measurement Reference Guide' }
    };
    
    const measurementInfo = imageMap[measurement];
    if (measurementInfo) {
      setHelpImage(measurementInfo.image);
      setHelpTitle(measurementInfo.title);
      setShowHelpModal(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Body Measurements</h2>
        {existingMeasurement ? (
          <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
            Editing
          </span>
        ) : (
          <span className="text-sm px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
            New Measurement
          </span>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date and Weight */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Measurement Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Body Fat Calculation Method
          </label>
          <select
            value={calculationMethod}
            onChange={(e) => setCalculationMethod(e.target.value as BFCalculationMethod)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={BFCalculationMethod.JACKSON_POLLOCK_3}>Jackson-Pollock 3-Site</option>
            <option value={BFCalculationMethod.JACKSON_POLLOCK_4}>Jackson-Pollock 4-Site</option>
            <option value={BFCalculationMethod.JACKSON_POLLOCK_7}>Jackson-Pollock 7-Site</option>
            <option value={BFCalculationMethod.DURNIN_WOMERSLEY}>Durnin-Womersley</option>
            <option value={BFCalculationMethod.PARRILLO}>Parrillo</option>
            <option value={BFCalculationMethod.NAVY_TAPE}>Navy Tape Measure</option>
          </select>
        </div>
        
        {/* Body Fat Measurement Reference */}
        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col lg:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <img
                src="/images/man_body_fat_diagram.gif"
                alt="Body Fat Measurement Reference Diagram"
                className="w-32 h-32 lg:w-40 lg:h-40 object-contain rounded-lg shadow-sm bg-white"
                onClick={() => showHelp('overall')}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                Measurement Reference Guide
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Click on the diagram for a detailed view of all measurement locations. Each measurement field below also has a help button for specific guidance.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                💡 Tip: Consistent measurement technique and location are crucial for accurate body composition tracking.
              </div>
            </div>
          </div>
        </div>
        
        {/* Body Circumference Measurements */}
        <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
            Circumference Measurements (cm)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Waist</label>
                <button
                  type="button"
                  onClick={() => showHelp('waist')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Neck</label>
                <button
                  type="button"
                  onClick={() => showHelp('neck')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={neck}
                onChange={(e) => setNeck(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hips {athleteData.gender === 'female' && calculationMethod === BFCalculationMethod.NAVY_TAPE && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="number"
                step="0.1"
                value={hips}
                onChange={(e) => setHips(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Skinfold Measurements */}
        <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
            Skinfold Measurements (mm)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Chest</label>
                <button
                  type="button"
                  onClick={() => showHelp('chest')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Abdominal</label>
                <button
                  type="button"
                  onClick={() => showHelp('abdominal')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={abdominal}
                onChange={(e) => setAbdominal(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thigh</label>
                <button
                  type="button"
                  onClick={() => showHelp('thigh')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={thigh}
                onChange={(e) => setThigh(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bicep</label>
                <button
                  type="button"
                  onClick={() => showHelp('bicep')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={bicep}
                onChange={(e) => setBicep(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tricep</label>
                <button
                  type="button"
                  onClick={() => showHelp('tricep')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={tricep}
                onChange={(e) => setTricep(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subscapular</label>
                <button
                  type="button"
                  onClick={() => showHelp('subscapular')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={subscapular}
                onChange={(e) => setSubscapular(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Suprailiac</label>
                <button
                  type="button"
                  onClick={() => showHelp('suprailiac')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={suprailiac}
                onChange={(e) => setSuprailiac(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lower Back</label>
                <button
                  type="button"
                  onClick={() => showHelp('lower_back')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={lowerBack}
                onChange={(e) => setLowerBack(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calf</label>
                <button
                  type="button"
                  onClick={() => showHelp('calf')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={calf}
                onChange={(e) => setCalf(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Midaxillary</label>
                <button
                  type="button"
                  onClick={() => showHelp('midaxillary')}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={midaxillary}
                onChange={(e) => setMidaxillary(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Calculate Button */}
        <div className="flex justify-center pt-2">
          <Button 
            type="button" 
            onClick={calculateBodyFat}
            variant="secondary"
            className="px-8 py-3 font-medium"
          >
            Calculate Body Fat
          </Button>
        </div>
        
        {/* Body Composition Results */}
        <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
            Body Composition Results
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Body Fat %
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFatPercentage}
                readOnly
                className="block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Body Fat % Override
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFatOverride}
                onChange={(e) => setBodyFatOverride(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Manual override"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Lean Body Mass (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={leanMass}
                readOnly
                className="block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fat Mass (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={fatMass}
                readOnly
                className="block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                BMR (calories)
              </label>
              <input
                type="number"
                value={bmr}
                readOnly
                className="block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
        
        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={3}
          />
        </div>
        
        {/* Actions */}
        <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="submit"
            variant="primary"
            color="indigo"
            className="px-6"
            disabled={loading}
          >
            {loading ? 'Saving...' : existingMeasurement ? 'Update Measurement' : 'Save Measurement'}
          </Button>
        </div>
        
        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{helpTitle}</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex justify-center">
                  <img
                    src={helpImage}
                    alt={helpTitle}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallbackText = target.parentElement?.querySelector('.fallback-text');
                      if (fallbackText) {
                        (fallbackText as HTMLElement).style.display = 'block';
                      }
                    }}
                  />
                  <div className="fallback-text hidden text-center p-8 text-gray-500 dark:text-gray-400">
                    Image not available for {helpTitle.toLowerCase()}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button
                  onClick={() => setShowHelpModal(false)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AthleteBodyMeasurementForm; 