import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectProfile, logout, ProfileData } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import Footer from './Footer';
import ThemeToggle from '../common/ThemeToggle';
import { FiLogOut, FiX } from 'react-icons/fi';

// NavItem component for sidebar navigation
const NavItem = ({ to, icon, label, active, onClick }: { to: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors ${
          isActive || active
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-indigo-800/30'
        }`
      }
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
};

// Dashboard header component for athletes
const DashboardHeader = ({ profile, handleLogout }: { profile: ProfileData | null; handleLogout: () => void }) => {
  return (
    <header className="sticky top-0 z-10 w-full bg-white border-b dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center">
            <span className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">ENG App</span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 font-medium text-white bg-indigo-600 rounded-full">
              {profile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-sm font-medium text-gray-700 truncate dark:text-gray-300 max-w-[150px]">
              {profile?.email || 'User'}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="hidden md:inline ml-2">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

const MainLayout: React.FC = () => {
  const profile = useSelector(selectProfile);
  const dispatch = useDispatch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Determine if user is a coach
  const isCoach = profile?.role === 'coach';

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      dispatch(logout());
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Different layout structure based on user role
  if (!isCoach) {
    // Athlete Layout
    return (
      <div className="flex flex-col min-h-screen text-gray-900 bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
        {/* Header for athletes */}
        <DashboardHeader profile={profile} handleLogout={handleLogout} />
        
        {/* Main content */}
        <main className="flex-1 p-4 pt-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 md:p-6">
          <Outlet />
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    );
  }
  
  // Coach Layout with sidebar
  return (
    <div className="flex flex-col min-h-screen text-gray-900 bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 z-20 bg-gray-900/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 z-30 w-74 transform bg-white dark:bg-gray-800 shadow-lg transition-transform md:translate-x-0 md:relative ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-6 border-b dark:border-gray-700">
            <Link to="/dashboard" className="flex items-center">
              <span className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">ENG App</span>
            </Link>
            <button 
              className="p-1 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiX className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Sidebar content */}
          <div className="p-4 h-[calc(100%-4rem)] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <nav className="mb-6 space-y-2">
                {/* Admin Link (only shown for coaches) */}
                <NavItem 
                  to="/admin" 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  } 
                  label="Admin" 
                  active={location.pathname.startsWith('/admin')} 
                />
              </nav>
            </div>
            
            <div className="pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-8 h-8 font-medium text-white bg-indigo-600 rounded-full">
                    {profile?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-sm font-medium text-gray-700 truncate dark:text-gray-300">
                    {profile?.email || 'User'}
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 mt-2 text-sm font-medium text-gray-700 rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-indigo-800/30"
              >
                <span className="mr-3"><FiLogOut /></span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile header - only for coaches */}
        <header className="sticky top-0 z-10 bg-white border-b dark:bg-gray-800 dark:border-gray-700 md:hidden">
          <div className="flex items-center justify-between h-16 px-6">
            <button 
              className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">ENG App</h1>
            <div className="w-6"></div> {/* Empty div for flex spacing */}
          </div>
        </header>

        {/* Content area */}
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          {/* Main content */}
          <main className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Footer - positioned below both sidebar and content */}
      <Footer />
    </div>
  );
};

export default MainLayout; 