import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ProfileData } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';

const BMRCalculatorPage: React.FC = () => {
    const navigate = useNavigate();
    // const profile = useSelector(selectProfile);
    const [activityLevel, setActivityLevel] = useState('1.2'); // Sedentary by default
    const [proteinMultiplier, setProteinMultiplier] = useState(2.0);
    const [fatMultiplier, setFatMultiplier] = useState(1.0);
    const [carbMultiplier, setCarbMultiplier] = useState(0);
    const [bmr, setBMR] = useState(0);
    const [tdee, setTDEE] = useState(0);
    const [calorieTarget, setCalorieTarget] = useState(0);
    const [goal, setGoal] = useState('maintenance');

    // Add Athlete Selection
    const [athletes, setAthletes] = useState<ProfileData[]>([]);
    const [selectedAthlete, setSelectedAthlete] = useState<ProfileData | null>(null);
    
    const [height, setHeight] = useState(selectedAthlete?.height_cm?.toString() || '');
    const [weight, setWeight] = useState(selectedAthlete?.weight_kg?.toString() || '');
    const [age, setAge] = useState(selectedAthlete?.age?.toString() || '');
    const [gender, setGender] = useState(selectedAthlete?.gender || 'male');

    // Fetch all profiles (athletes)
    const fetchAthletes = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, email, height_cm, weight_kg, age, gender, user_id, onboarding_complete, role, first_name, last_name')
                .eq('role', 'athlete');
            if (error) throw error;
            setAthletes(data || []);
        } catch (err) {
            console.error('Error fetching athletes:', err);
        }
    };

    useEffect(() => {
        fetchAthletes();
    }, []);

    const calculateBMR = () => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        const a = parseInt(age, 10);
        let bmrValue = 0;

        if (gender === 'male') {
            bmrValue = 10 * w + 6.25 * h - 5 * a + 5;
        } else {
            bmrValue = 10 * w + 6.25 * h - 5 * a - 161;
        }

        setBMR(bmrValue);
        calculateTDEE(bmrValue);
    };

    const calculateTDEE = (bmrValue: number) => {
        const tdeeValue = bmrValue * parseFloat(activityLevel);
        setTDEE(tdeeValue);
        calculateCalorieTarget(tdeeValue);
    };

    const calculateCalorieTarget = (tdeeValue: number) => {
        let adjustedTDEE = tdeeValue;
        if (goal === 'bulking') {
            adjustedTDEE *= 1.10; // 10% surplus for bulking
        } else if (goal === 'cutting') {
            adjustedTDEE *= 0.80; // 20% deficit for cutting
        }

        const proteinCalories = parseFloat(weight) * proteinMultiplier * 4;
        const fatCalories = parseFloat(weight) * fatMultiplier * 9;
        const carbCalories = adjustedTDEE - (proteinCalories + fatCalories);
        const carbGrams = carbCalories / 4;

        setCalorieTarget(adjustedTDEE);
        setCarbMultiplier(carbGrams / parseFloat(weight));
    };

    const calculateMultipliers = () => {
        switch (goal) {
            case 'bulking':
                setProteinMultiplier(2.0);
                setFatMultiplier(1.0);
                break;
            case 'cutting':
                setProteinMultiplier(2.4);
                setFatMultiplier(0.4);
                break;
            default:
                setProteinMultiplier(1.8);
                setFatMultiplier(0.7);
        }
        calculateBMR();
    };

    useEffect(() => {
        calculateMultipliers();
    }, [goal]);

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">BMR & TDEE Calculator</h1>
            </div>
            
            <Card className="mb-6">
                <div className="p-4">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Goal Selection</h2>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Goal:</label>
                        <select value={goal} onChange={(e) => setGoal(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="maintenance">Maintenance</option>
                            <option value="bulking">Bulking</option>
                            <option value="cutting">Cutting</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        {goal === 'bulking' && (
                            <>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Bulking</h4>
                                <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                                    <li>Protein: 2.0-2.5g/kg</li>
                                    <li>Fat: 0.5-2.0g/kg</li>
                                    <li>Carbohydrates: 4-7g/kg</li>
                                </ul>
                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                    Bulking Phase Caloric Surplus: Research suggests aiming for a 10% caloric surplus during bulking phases. This moderate surplus provides sufficient additional energy to support muscle growth while minimizing excessive fat gain. For most individuals, this translates to 300-500 calories above maintenance requirements.
                                </p>
                            </>
                        )}
                        {goal === 'cutting' && (
                            <>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Cutting</h4>
                                <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                                    <li>Protein: 1.6-2.4g/kg (potentially up to 3.1g/kg)</li>
                                    <li>Fat: 0.3-0.5g/kg</li>
                                    <li>Carbohydrates: Sufficient amounts to fill remaining calories</li>
                                </ul>
                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                    Cutting Phase Caloric Deficit: For effective fat loss while preserving muscle mass, most experts recommend starting with a 20% caloric deficit from maintenance levels. This moderate deficit (typically 400-600 calories below maintenance) promotes steady fat loss while minimizing muscle catabolism.
                                </p>
                            </>
                        )}
                        {goal === 'maintenance' && (
                            <>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Maintenance</h4>
                                <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                                    <li>Protein: 1.6-2.2g/kg</li>
                                    <li>Fat: 0.5-1.0g/kg</li>
                                    <li>Carbohydrates: 4-5g/kg</li>
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </Card>
            
            <Card className="mb-6">
                <div className="p-4">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Athlete Data</h2>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Athlete:</label>
                        <select value={selectedAthlete?.id || ''} onChange={(e) => {
                            const athlete = athletes.find(a => a.id === e.target.value);
                            setSelectedAthlete(athlete || null);
                            if (athlete) {
                                setHeight(athlete.height_cm?.toString() || '');
                                setWeight(athlete.weight_kg?.toString() || '');
                                setAge(athlete.age?.toString() || '');
                                setGender(athlete.gender || 'male');
                            }
                        }} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="">Select an athlete</option>
                            {athletes.map(athlete => (
                                <option key={athlete.id} value={athlete.id}>{athlete.username}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Height (cm):</label>
                            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weight (kg):</label>
                            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age:</label>
                            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender:</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col mb-4 sm:flex-row">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Activity Level:</label>
                            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="1.2">Sedentary: little or no exercise</option>
                                <option value="1.375">Exercise 1-3 times/week</option>
                                <option value="1.55">Exercise 4-5 times/week</option>
                                <option value="1.725">Daily exercise or intense exercise 3-4 times/week</option>
                                <option value="1.9">Intense exercise 6-7 times/week</option>
                                <option value="2.0">Very intense exercise daily, or physical job</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid items-end grid-cols-1 gap-4 mb-4 sm:grid-cols-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Protein Multiplier:</label>
                            <input type="number" value={proteinMultiplier} onChange={(e) => setProteinMultiplier(parseFloat(e.target.value))} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fat Multiplier:</label>
                            <input type="number" value={fatMultiplier} onChange={(e) => setFatMultiplier(parseFloat(e.target.value))} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Carbs Multiplier:</label>
                            <input type="number" value={carbMultiplier} onChange={(e) => setCarbMultiplier(parseFloat(e.target.value))} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />                
                        </div>
                        <div>
                            <button onClick={calculateBMR} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Calculate
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
            
            <Card className="mb-6">
                <div className="p-4">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Activity Guidelines</h2>
                    <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Guidelines</h4>
                        <ul className="text-sm text-gray-700 list-disc list-inside dark:text-gray-300">
                            <li>Exercise: 15-30 minutes of elevated heart rate activity.</li>
                            <li>Intense exercise: 45-120 minutes of elevated heart rate activity.</li>
                            <li>Very intense exercise: 2+ hours of elevated heart rate activity.</li>
                        </ul>
                    </div>
                </div>
            </Card>
            
            <Card>
                <div className="p-4">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Calculated Results</h2>
                    <div className="mt-4">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Energy Expenditure</h4>
                        <table className="min-w-full mt-2 divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Metric</th>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Value</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">BMR</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{bmr.toFixed(2)} kcal/day</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">TDEE</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{tdee.toFixed(2)} kcal/day</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Calorie Target ({goal})</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{calorieTarget.toFixed(2)} kcal/day</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
    
                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Macronutrients ({goal})</h4>
                        <table className="min-w-full mt-2 divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Macronutrient</th>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Multiplier</th>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Grams/day</th>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Calories/day</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Protein</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{proteinMultiplier} g/kg</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {(proteinMultiplier * parseFloat(weight || '0')).toFixed(1)} g
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {(proteinMultiplier * parseFloat(weight || '0') * 4).toFixed(1)} kcal
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Fat</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{fatMultiplier} g/kg</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {(fatMultiplier * parseFloat(weight || '0')).toFixed(1)} g
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {(fatMultiplier * parseFloat(weight || '0') * 9).toFixed(1)} kcal
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Carbs</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{carbMultiplier.toFixed(1)} g/kg</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {(carbMultiplier * parseFloat(weight || '0')).toFixed(1)} g
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {(carbMultiplier * parseFloat(weight || '0') * 4).toFixed(1)} kcal
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => {
                                // Store the calculated values in localStorage
                                const mealPlanData = {
                                    name: 'New Meal Plan',
                                    total_calories: calorieTarget.toFixed(0),
                                    protein_grams: (proteinMultiplier * parseFloat(weight || '0')).toFixed(0),
                                    carbohydrate_grams: (carbMultiplier * parseFloat(weight || '0')).toFixed(0),
                                    fat_grams: (fatMultiplier * parseFloat(weight || '0')).toFixed(0),
                                    description: `Created from BMR Calculator. Goal: ${goal.charAt(0).toUpperCase() + goal.slice(1)}. BMR: ${bmr.toFixed(0)} kcal/day. TDEE: ${tdee.toFixed(0)} kcal/day.${selectedAthlete ? ` Athlete: ${selectedAthlete.username}.` : ''}`
                                };
                                localStorage.setItem('newMealPlanData', JSON.stringify(mealPlanData));
                                navigate('/admin/mealplans');
                            }}
                            className="px-4 py-2 mt-4 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Create Meal Plan with These Values
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default BMRCalculatorPage; 