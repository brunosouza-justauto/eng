import React from 'react';
import MainLayout from '../layout/MainLayout';

/**
 * AdminLayout now uses MainLayout which contains the consolidated admin sidebar
 * This eliminates duplicate sidebar implementations and ensures a consistent admin interface
 */
const AdminLayout = () => {
  return <MainLayout />;
};

export default AdminLayout; 