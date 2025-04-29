import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      {/* Main content area - takes remaining height */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet /> {/* Page content renders here */}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout; 