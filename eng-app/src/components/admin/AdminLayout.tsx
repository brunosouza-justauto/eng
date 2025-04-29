import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom'; // Add NavLink

const AdminLayout: React.FC = () => {

  // Helper function for active link styling
  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
      `block px-2 py-1 rounded hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-semibold' : ''}`;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4 flex-shrink-0">
        <h2 className="text-xl font-semibold mb-6">Admin Panel</h2>
        <nav>
          <ul className="space-y-2">
            <li>
              <NavLink to="/admin/users" className={navLinkClass}>User Management</NavLink>
            </li>
            <li>
              <NavLink to="/admin/programs" className={navLinkClass}>Program Builder</NavLink>
            </li>
             <li>
              <NavLink to="/admin/mealplans" className={navLinkClass}>Meal Planner</NavLink>
            </li>
             <li>
              <NavLink to="/admin/stepgoals" className={navLinkClass}>Step Goals</NavLink>
            </li>
             <li>
              <NavLink to="/admin/checkins" className={navLinkClass}>Check-in Review</NavLink>
            </li>
            {/* Optional: Link back to main dashboard */}
             <li className="mt-6 border-t border-gray-700 pt-4">
                 <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">Back to Dashboard</Link>
             </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 bg-gray-100 dark:bg-gray-900 overflow-auto">
        <Outlet /> {/* Nested admin routes will render here */}
      </main>
    </div>
  );
};

export default AdminLayout; 