import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiUsers, FiCalendar, FiSettings, FiMessageCircle, FiHelpCircle, FiArrowLeft, FiClipboard } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import ThemeToggle from '../common/ThemeToggle';
import Footer from '../layout/Footer';

// NavItem component for sidebar navigation
const NavItem = ({ to, icon, label, active, onClick }: { to: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) => {
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-indigo-800/30'
      }`}
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const user = useSelector(selectUser);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-gray-900/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 z-30 w-74 transform bg-white dark:bg-gray-800 shadow-lg transition-transform lg:translate-x-0 lg:relative ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-6 border-b dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">ENG Admin</h2>
            <button 
              className="p-1 rounded-md lg:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Sidebar content */}
          <div className="p-4 h-[calc(100%-4rem)] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {/* Back to app button */}
              <div className="mb-4">
                <NavItem 
                  to="/dashboard" 
                  icon={<FiArrowLeft />} 
                  label="Back to App" 
                  active={false}
                />
              </div>
              
              <nav className="mb-6 space-y-2">
                <NavItem 
                  to="/admin" 
                  icon={<FiHome />} 
                  label="Dashboard" 
                  active={location.pathname === '/admin'} 
                />
                <NavItem 
                  to="/admin/athletes" 
                  icon={<FiUsers />} 
                  label="Manage Athletes" 
                  active={location.pathname.startsWith('/admin/athletes')} 
                />
                <NavItem 
                  to="/admin/coaches" 
                  icon={<FiUsers />} 
                  label="Manage Coaches" 
                  active={location.pathname.startsWith('/admin/coaches')} 
                />
                <NavItem 
                  to="/admin/programs" 
                  icon={<FiClipboard />} 
                  label="Program Builder" 
                  active={location.pathname.startsWith('/admin/programs')} 
                />
                <NavItem 
                  to="/admin/bmr-calculator" 
                  icon={<FiClipboard />} 
                  label="BMR & TDEE Calculator" 
                  active={location.pathname.startsWith('/admin/bmr-calculator')} 
                />
                <NavItem 
                  to="/admin/mealplans" 
                  icon={<FiCalendar />} 
                  label="Meal Planning" 
                  active={location.pathname.startsWith('/admin/mealplans')} 
                />
                <NavItem 
                  to="/admin/checkins" 
                  icon={<FiMessageCircle />} 
                  label="Check-ins" 
                  active={location.pathname.startsWith('/admin/checkins')} 
                />
                <NavItem 
                  to="/admin/settings" 
                  icon={<FiSettings />} 
                  label="Settings" 
                  active={location.pathname.startsWith('/admin/settings')} 
                />
              </nav>
              
              <div className="pt-4 border-t dark:border-gray-700">
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                  Help & Support
                </p>
                <a 
                  href="mailto:support@engcoaching.com" 
                  className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-indigo-800/30"
                >
                  <FiHelpCircle className="mr-3" />
                  <span>Get Support</span>
                </a>
              </div>
            </div>
            
            <div className="pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-8 h-8 font-medium text-white bg-indigo-600 rounded-full">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-sm font-medium text-gray-700 truncate dark:text-gray-300">
                    {user?.email || 'User'}
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          {/* Mobile header */}
          <header className="sticky top-0 z-10 bg-white border-b dark:bg-gray-800 dark:border-gray-700 lg:hidden">
            <div className="flex items-center justify-between h-16 px-6">
              <button 
                className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                onClick={() => setSidebarOpen(true)}
              >
                <FiMenu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white">ENG Admin</h1>
              <div className="w-6"></div> {/* Empty div for flex spacing */}
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 md:p-6">
            <Outlet /> {/* Nested admin routes will render here */}
          </main>
        </div>
      </div>
      
      {/* Footer - positioned below both sidebar and content */}
      <Footer />
    </div>
  );
};

export default AdminLayout; 