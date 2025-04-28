import React from 'react';
import { Outlet, Link } from 'react-router-dom'; // Use Outlet for nested routes

const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Placeholder */}
      <aside className="w-64 bg-gray-800 text-white p-4 flex-shrink-0">
        <h2 className="text-xl font-semibold mb-6">Admin Panel</h2>
        <nav>
          <ul>
            <li className="mb-2">
              {/* Use Link for navigation */}
              <Link to="/admin/users" className="hover:text-indigo-300">User Management</Link>
            </li>
            {/* Add links for Program Builder, Meal Planner etc. later */}
            <li className="mb-2">
              <span className="text-gray-500">Program Builder (TBD)</span>
            </li>
             <li className="mb-2">
              <span className="text-gray-500">Meal Planner (TBD)</span>
            </li>
             <li className="mb-2">
              <span className="text-gray-500">Step Goals (TBD)</span>
            </li>
             <li className="mb-2">
              <span className="text-gray-500">Check-in Review (TBD)</span>
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