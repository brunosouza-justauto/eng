import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectProfile, logout } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';

const Header: React.FC = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const profile = useSelector(selectProfile);
    const dispatch = useDispatch();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            dispatch(logout()); // Dispatch logout action to clear Redux state
            // No need to navigate, ProtectedRoute will redirect to /login
        } catch (error) {
            console.error('Error logging out:', error);
            // Optionally show an error message to the user
        }
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) => 
        `px-3 py-2 rounded-md text-sm font-medium ${isActive 
            ? 'bg-gray-900 dark:bg-gray-700 text-white' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`;

    return (
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-40">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Title */}
                    <div className="flex-shrink-0">
                        <Link to="/dashboard" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            ENG App
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    {isAuthenticated && (
                        <nav className="hidden md:flex space-x-4">
                            <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
                            <NavLink to="/check-in/new" className={navLinkClass}>Weekly Check-in</NavLink>
                            <NavLink to="/history" className={navLinkClass}>History</NavLink>
                            {/* Conditional Admin Link */}
                            {profile?.role === 'coach' && (
                                <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
                            )}
                        </nav>
                    )}

                    {/* Desktop Auth Actions / User Info */}
                    <div className="hidden md:block">
                        {isAuthenticated ? (
                            <button 
                                onClick={handleLogout}
                                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                            >
                                Logout
                            </button>
                        ) : (
                            <NavLink to="/login" className={navLinkClass}>Login</NavLink>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        {isAuthenticated && (
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:hover:bg-gray-700"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                {/* Icon: Menu (Heroicons) */}
                                <svg className={`block h-6 w-6 ${isMobileMenuOpen ? 'hidden' : 'block'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                {/* Icon: Close (Heroicons) */}
                                <svg className={`h-6 w-6 ${isMobileMenuOpen ? 'block' : 'hidden'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isAuthenticated && isMobileMenuOpen && (
                <div className="md:hidden absolute top-16 inset-x-0 p-2 transition transform origin-top-right z-50 shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
                    <div className="pt-2 pb-3 space-y-1">
                        <NavLink to="/dashboard" className={(props) => `${navLinkClass(props)} block`}>Dashboard</NavLink>
                        <NavLink to="/check-in/new" className={(props) => `${navLinkClass(props)} block`}>Weekly Check-in</NavLink>
                        <NavLink to="/history" className={(props) => `${navLinkClass(props)} block`}>History</NavLink>
                        {profile?.role === 'coach' && (
                            <NavLink to="/admin" className={(props) => `${navLinkClass(props)} block`}>Admin</NavLink>
                        )}
                    </div>
                    <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center px-4 mb-3">
                            {/* Use profile.email */}
                             <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{profile?.email || 'User'}</p>
                        </div>
                        <div className="mt-1 space-y-1">
                            <button 
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header; 