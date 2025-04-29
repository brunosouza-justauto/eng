import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { ButtonLink } from '../ui/Button';

interface DashboardStats {
  totalAthletes: number;
  totalPrograms: number;
  totalMealPlans: number;
  totalPendingCheckins: number;
}

const AdminDashboard: React.FC = () => {
  const profile = useSelector(selectProfile);
  const [stats, setStats] = useState<DashboardStats>({
    totalAthletes: 0,
    totalPrograms: 0,
    totalMealPlans: 0,
    totalPendingCheckins: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile || !profile.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch athlete count (profiles where coach_id = current user and role != coach)
        const { count: athletesCount, error: athletesError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', profile.id)
          .neq('role', 'coach');
        
        if (athletesError) throw athletesError;
        
        // Fetch program count
        const { count: programsCount, error: programsError } = await supabase
          .from('program_templates')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', profile.id);
        
        if (programsError) throw programsError;
        
        // Fetch meal plan count
        const { count: mealPlansCount, error: mealPlansError } = await supabase
          .from('nutrition_plans')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', profile.id);
        
        if (mealPlansError) throw mealPlansError;
        
        // For demo purposes, use a random number for pending check-ins
        // In a real app, you would query for unreviewed check-ins
        const pendingCheckins = Math.floor(Math.random() * 5);
        
        setStats({
          totalAthletes: athletesCount || 0,
          totalPrograms: programsCount || 0,
          totalMealPlans: mealPlansCount || 0,
          totalPendingCheckins: pendingCheckins
        });
      } catch (err) {
        console.error('Error fetching admin dashboard stats:', err);
        setError('Failed to load dashboard statistics.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [profile]);

  const quickAccessItems = [
    {
      title: 'Manage Athletes',
      description: 'Add, edit, and assign programs to your athletes',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
      linkTo: '/admin/athletes',
      color: 'indigo'
    },
    {
      title: 'Create Programs',
      description: 'Design training programs and workout routines',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
        </svg>
      ),
      linkTo: '/admin/programs',
      color: 'green'
    },
    {
      title: 'Plan Nutrition',
      description: 'Create meal plans and nutrition strategies',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
        </svg>
      ),
      linkTo: '/admin/mealplans',
      color: 'yellow'
    },
    {
      title: 'Review Check-ins',
      description: 'View and respond to athlete progress updates',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      linkTo: '/admin/checkins',
      color: 'red'
    }
  ];

  const StatCard = ({ title, value, icon, linkTo }: { title: string; value: number; icon: React.ReactNode; linkTo: string }) => (
    <Link to={linkTo} className="block transition-all hover:translate-y-[-2px]">
      <Card className="h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</h2>
            <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white">{isLoading ? '-' : value}</p>
          </div>
          <div className="flex-shrink-0">{icon}</div>
        </div>
      </Card>
    </Link>
  );

  if (error) {
    return (
      <div className="p-4 my-4 border-l-4 border-red-500 rounded bg-red-50 dark:bg-red-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Coach Dashboard</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Welcome back, {profile?.email?.split('@')[0] || 'Coach'}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Athletes" 
          value={stats.totalAthletes} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-indigo-200" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>}
          linkTo="/admin/athletes" 
        />
        <StatCard 
          title="Programs" 
          value={stats.totalPrograms} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-green-200" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>}
          linkTo="/admin/programs" 
        />
        <StatCard 
          title="Meal Plans" 
          value={stats.totalMealPlans} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-yellow-200" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
          </svg>}
          linkTo="/admin/mealplans" 
        />
        <StatCard 
          title="Pending Check-ins" 
          value={stats.totalPendingCheckins} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-200" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>}
          linkTo="/admin/checkins" 
        />
      </div>

      {/* Quick Access */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickAccessItems.map((item, index) => (
            <Card key={index} className="h-full">
              <div className="flex flex-col items-center p-4 text-center">
                <div className="mb-4">{item.icon}</div>
                <h3 className="mb-2 text-lg font-medium text-gray-800 dark:text-white">{item.title}</h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                <ButtonLink 
                  to={item.linkTo} 
                  variant="outline" 
                  color={item.color === 'indigo' ? 'indigo' : item.color === 'green' ? 'green' : item.color === 'red' ? 'red' : 'gray'}
                  size="sm"
                  className="mt-auto"
                >
                  Go to {item.title}
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 