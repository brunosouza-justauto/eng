import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectProfile, logout, ProfileData } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import Footer from './Footer';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';
import { FiLogOut, FiMenu, FiX, FiHome, FiUsers, FiUser, FiFileText, FiCalendar, FiActivity, FiMessageSquare, FiSettings, FiHelpCircle, FiArrowLeft } from 'react-icons/fi';

// NavItem component for sidebar navigation
const NavItem = ({ to, icon, label, active, onClick }: { to: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) => {
  return (
    <NavLink
      to={to}
      className={() => 
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors ${
          active
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
          
          <NotificationBell />
          
          <Link to="/profile" className="flex items-center space-x-2 hover:opacity-80">
            <div className="flex items-center justify-center w-8 h-8 font-medium text-white bg-indigo-600 rounded-full">
              {profile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-sm font-medium text-gray-700 truncate dark:text-gray-300 max-w-[150px]">
              {profile?.email || 'User'}
            </div>
          </Link>
          
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  
  // Determine if user is a coach
  const isCoach = profile?.role === 'coach';

  // Initial sidebar state based on screen size
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop, sidebar should always be visible
      if (!mobile) {
        setIsSidebarOpen(true);
      }
    };
    
    // Initial check
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close sidebar on mobile when location changes
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      dispatch(logout());
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when a menu item is clicked (for mobile)
  const handleNavItemClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
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
      {/* Top navigation bar */}
      <header className="sticky top-0 z-20 w-full bg-white border-b dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4">
            <button 
              className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden" 
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <FiX className="w-6 h-6 text-gray-600 dark:text-gray-300" /> : <FiMenu className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
            </button>
            <span className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">ENG App</span>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <NotificationBell />
            
            <Link to="/profile" className="flex items-center space-x-2 hover:opacity-80">
              <div className="flex items-center justify-center w-8 h-8 font-medium text-white bg-indigo-600 rounded-full">
                {profile?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-sm font-medium text-gray-700 truncate dark:text-gray-300 max-w-[150px]">
                {profile?.email || 'User'}
              </div>
            </Link>
            
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
      
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 z-10 bg-gray-900/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div 
          className={`
            ${isMobile ? 'fixed top-16' : 'relative top-0'} 
            bottom-0 left-0 z-10 w-74 
            transform bg-white dark:bg-gray-900 shadow-lg transition-transform 
            ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          `}
        >
          {/* Sidebar header */}
          <div className="bg-gray-900 dark:bg-gray-900 text-white">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold">ENG Admin</h2>
            </div>
            <Link 
              to="/dashboard" 
              className="flex items-center p-4 text-gray-300 hover:bg-gray-800 border-b border-gray-800"
              onClick={handleNavItemClick}
            >
              <FiArrowLeft className="mr-3" />
              <span>Athlete Dashboard</span>
            </Link>
          </div>

          {/* Sidebar content */}
          <div className="p-4 h-[calc(100%-8rem)] overflow-y-auto">
            <nav className="mb-6 space-y-1">
              {/* Admin navigation links */}
              <NavItem 
                to="/admin" 
                icon={<FiHome className="w-5 h-5" />} 
                label="Coach Dashboard" 
                active={location.pathname === '/admin'} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/athletes" 
                icon={<FiUsers className="w-5 h-5" />} 
                label="Manage Athletes" 
                active={location.pathname.startsWith('/admin/athletes')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/coaches" 
                icon={<FiUser className="w-5 h-5" />} 
                label="Manage Coaches" 
                active={location.pathname.startsWith('/admin/coaches')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/programs" 
                icon={<FiFileText className="w-5 h-5" />} 
                label="Program Builder" 
                active={location.pathname.startsWith('/admin/programs')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/bmr-calculator" 
                icon={<FiFileText className="w-5 h-5" />} 
                label="BMR & TDEE Calculator" 
                active={location.pathname.startsWith('/admin/bmr-calculator')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/mealplans" 
                icon={<FiCalendar className="w-5 h-5" />} 
                label="Meal Planning" 
                active={location.pathname.startsWith('/admin/mealplans')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/stepgoals" 
                icon={<FiActivity className="w-5 h-5" />} 
                label="Step Goals" 
                active={location.pathname.startsWith('/admin/stepgoals')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/checkins" 
                icon={<FiMessageSquare className="w-5 h-5" />} 
                label="Check-ins" 
                active={location.pathname.startsWith('/admin/checkins')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/supplements" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>} 
                label="Supplements Management" 
                active={location.pathname.startsWith('/admin/supplements')} 
                onClick={handleNavItemClick}
              />
              <NavItem 
                to="/admin/settings" 
                icon={<FiSettings className="w-5 h-5" />} 
                label="Settings" 
                active={location.pathname.startsWith('/admin/settings')} 
                onClick={handleNavItemClick}
              />
            </nav>

            <div className="pt-4 mt-6 border-t border-gray-700">
              <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">HELP & SUPPORT</h3>
              <NavItem 
                to="/admin/support" 
                icon={<FiHelpCircle className="w-5 h-5" />} 
                label="Get Support" 
                active={location.pathname.startsWith('/admin/support')} 
                onClick={handleNavItemClick}
              />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className={`flex flex-col flex-1 w-0 overflow-hidden ${!isMobile && !isSidebarOpen ? 'pl-0' : ''}`}>
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