import React, { useState, useEffect } from 'react';
// Add imports for supabase, date-fns, etc. as needed

const CheckInReview: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    // Removed unused error state for now
    // const [error, setError] = useState<string | null>(null);

    // TODO: Fetch users (or allow selection)
    // TODO: Fetch check-ins for selected user
    // TODO: Display check-in details (metrics, wellness, adherence, notes, media)
    // TODO: Add ability for coach to add feedback comments

     useEffect(() => {
        setIsLoading(false);
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Check-in Review</h1>
            {isLoading && <p>Loading...</p>}
            {/* {error && <p className="text-red-500">Error: {error}</p>} */}
            {!isLoading && (
                 <div>
                    <p>(Check-in review UI placeholder)</p>
                    {/* User selection dropdown/search */}
                    {/* List/Timeline of check-ins for selected user */}
                    {/* Detail view for a selected check-in */}
                    {/* Feedback input area */}
                </div>
            )}
        </div>
    );
};

export default CheckInReview; 