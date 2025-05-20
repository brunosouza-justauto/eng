import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsLoading } from '../store/slices/authSlice';

// Instagram Embed Component
const InstagramEmbed: React.FC<{ postUrl: string }> = ({ postUrl }) => {
  useEffect(() => {
    // Load Instagram embed.js script
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    } else {
      const script = document.createElement('script');
      script.async = true;
      script.src = '//www.instagram.com/embed.js';
      script.onload = () => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      };
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [postUrl]);

  return (
    <div className="instagram-embed-container">
      <blockquote 
        className="instagram-media" 
        data-instgrm-captioned 
        data-instgrm-permalink={`${postUrl}?utm_source=ig_embed&utm_campaign=loading`}
        data-instgrm-version="14"
        style={{ 
          background: '#FFF',
          border: 0, 
          borderRadius: '3px', 
          boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
          margin: '1px',
          maxWidth: '540px',
          minWidth: '326px',
          padding: 0,
          width: 'calc(100% - 2px)'
        }}
      >
        <div style={{ padding: '16px' }}>
          <a 
            href={`${postUrl}?utm_source=ig_embed&utm_campaign=loading`} 
            style={{ 
              background: '#FFFFFF', 
              lineHeight: 0, 
              padding: '0 0', 
              textAlign: 'center', 
              textDecoration: 'none', 
              width: '100%' 
            }} 
            target="_blank"
            rel="noopener noreferrer"
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', flexGrow: 0, height: '40px', marginRight: '14px', width: '40px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: 0, height: '14px', marginBottom: '6px', width: '100px' }}></div>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: 0, height: '14px', width: '60px' }}></div>
              </div>
            </div>
            <div style={{ padding: '19% 0' }}></div>
            <div style={{ display: 'block', height: '50px', margin: '0 auto 12px', width: '50px' }}>
              <svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg">
                <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                  <g transform="translate(-511.000000, -20.000000)" fill="#000000">
                    <g>
                      <path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
            <div style={{ paddingTop: '8px' }}>
              <div style={{ color: '#3897f0', fontFamily: 'Arial,sans-serif', fontSize: '14px', fontStyle: 'normal', fontWeight: 550, lineHeight: '18px' }}>
                View this post on Instagram
              </div>
            </div>
            <div style={{ padding: '12.5% 0' }}></div>
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '14px', alignItems: 'center' }}>
              <div>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', height: '12.5px', width: '12.5px', transform: 'translateX(0px) translateY(7px)' }}></div>
                <div style={{ backgroundColor: '#F4F4F4', height: '12.5px', transform: 'rotate(-45deg) translateX(3px) translateY(1px)', width: '12.5px', flexGrow: 0, marginRight: '14px', marginLeft: '2px' }}></div>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', height: '12.5px', width: '12.5px', transform: 'translateX(9px) translateY(-18px)' }}></div>
              </div>
              <div style={{ marginLeft: '8px' }}>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', flexGrow: 0, height: '20px', width: '20px' }}></div>
                <div style={{ width: 0, height: 0, borderTop: '2px solid transparent', borderLeft: '6px solid #f4f4f4', borderBottom: '2px solid transparent', transform: 'translateX(16px) translateY(-4px) rotate(30deg)' }}></div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ width: 0, borderTop: '8px solid #F4F4F4', borderRight: '8px solid transparent', transform: 'translateY(16px)' }}></div>
                <div style={{ backgroundColor: '#F4F4F4', flexGrow: 0, height: '12px', width: '16px', transform: 'translateY(-4px)' }}></div>
                <div style={{ width: 0, height: 0, borderTop: '8px solid #F4F4F4', borderLeft: '8px solid transparent', transform: 'translateY(-4px) translateX(8px)' }}></div>
              </div>
            </div>
          </a>
          <p style={{ color: '#c9c8cd', fontFamily: 'Arial,sans-serif', fontSize: '14px', lineHeight: '17px', marginBottom: 0, marginTop: '8px', overflow: 'hidden', padding: '8px 0 7px', textAlign: 'center', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <a 
              href={`${postUrl}?utm_source=ig_embed&utm_campaign=loading`} 
              style={{ color: '#c9c8cd', fontFamily: 'Arial,sans-serif', fontSize: '14px', fontStyle: 'normal', fontWeight: 'normal', lineHeight: '17px', textDecoration: 'none' }} 
              target="_blank"
              rel="noopener noreferrer"
            >
              A post shared by Bruno Souza da Silva (@brunoifbb)
            </a>
          </p>
        </div>
      </blockquote>
    </div>
  );
};

// Add TypeScript interface for window to include instgrm
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

/**
 * HomePage component
 * Landing page for the ENG App showcasing the trainer's bio and package offerings
 */
const HomePage: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // If still loading or authenticated, show a minimal loading indicator
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-90 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">ENG</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Login
              </Link>
              <Link 
                to="/login?signup=true" 
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-indigo-900 overflow-hidden">
        {/* Background overlay pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 rounded-full opacity-10 transform rotate-45"></div>
        <div className="absolute bottom-0 left-0 -mb-40 -ml-40 w-96 h-96 bg-indigo-600 rounded-full opacity-10"></div>
        
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8">
              <div className="mx-auto max-w-md px-4 sm:max-w-2xl sm:px-6 sm:text-center lg:px-0 lg:text-left lg:flex lg:items-center">
                <div>
                  <h1 className="mt-4 text-4xl tracking-tight font-extrabold text-white sm:mt-5 sm:text-5xl lg:mt-6 xl:text-6xl">
                    <span className="block">Earned Not Given</span>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400 pb-3">
                      Progress you can measure, effort you can track
                    </span>
                  </h1>
                  <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                    Transform your physique with evidence-based training programs, personalized nutrition plans, and expert coaching designed to maximize your results.
                  </p>
                  <div className="mt-8 sm:mt-12">
                    <div className="sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        <Link
                          to="/login?signup=true"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                        >
                          Get Started
                        </Link>
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-3">
                        <Link
                          to="/login"
                          className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-100 bg-gray-800 bg-opacity-60 hover:bg-opacity-70 md:py-4 md:text-lg md:px-10"
                        >
                          Login
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-12 -mb-16 sm:-mb-48 lg:m-0 lg:relative">
                <div className="mx-auto max-w-md px-4 sm:max-w-2xl sm:px-6 lg:max-w-none lg:px-0">
                  {/* Hero image */}
                  <div className="w-full lg:absolute lg:inset-y-0 lg:left-0 lg:h-full lg:w-auto lg:max-w-none">
                    <div className="relative h-56 sm:h-72 lg:h-full">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 transform rotate-3 shadow-xl"></div>
                      <div className="absolute inset-0 rounded-2xl bg-white dark:bg-gray-800 p-0.5">
                        <div className="h-full w-full rounded-xl overflow-hidden">
                          <img 
                            src="/images/bruno-competition.png" 
                            alt="Bruno Souza da Silva fitness coaching" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Me Section - Updated with dark background and new layout */}
      <div className="py-16 bg-gray-900 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-400 tracking-wide uppercase">ABOUT ME</h2>
            <p className="mt-1 text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-5xl">
              Meet Your Coach
            </p>
          </div>
          <div className="mt-16">
            <div className="flex flex-col md:flex-row md:space-x-12 lg:space-x-20 items-start">
              <div className="w-full md:w-2/5 flex flex-col items-center">
                <div className="rounded-lg overflow-hidden shadow-xl h-auto w-full max-w-md">
                  <img 
                    src="/images/bruno-competition.png" 
                    alt="Bruno Souza da Silva in bodybuilding competition" 
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-md">
                  <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center mb-2 text-indigo-400">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-xs text-gray-300 text-center">Competition Experience</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center mb-2 text-indigo-400">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 6H23V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-xs text-gray-300 text-center">Evidence-Based</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center mb-2 text-indigo-400">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-xs text-gray-300 text-center">Results Driven</span>
                  </div>
                </div>
              </div>
              <div className="mt-10 md:mt-0 md:w-3/5">
                <h3 className="text-3xl font-bold text-white mb-3">Bruno Souza da Silva</h3>
                <div className="inline-block bg-indigo-900/50 px-4 py-1.5 rounded-full text-sm font-medium text-indigo-300 mb-6">
                  Bodybuilding Coach & Competitor
                </div>
                <p className="text-lg text-gray-300 mb-4">
                  Web-dev by day, stage athlete by choice. At 40, I live and breathe the IFBB grind: year-round periodized training, precision macros, and daily posing practice—all to bring razor-sharp conditioning and balanced symmetry to every show.
                </p>
                <p className="text-lg text-gray-300 mb-4">
                  My mantra is "progress over comfort"—whether I'm perfecting back-lat spreads in the mirror or hammering out code for global sites. Off-season means adding dense, quality muscle; prep means relentless focus and zero excuses.
                </p>
                <p className="text-lg text-gray-300 mb-6">
                  Lift heavy, dial in, peak smart, repeat. Let's chase that pro card.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/login?signup=true"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    Work With Me
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">Packages</h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-5xl">
              Choose Your Journey
            </p>
            <p className="max-w-2xl mt-5 mx-auto text-xl text-gray-500 dark:text-gray-400">
              Select the package that best fits your goals and commitment level.
            </p>
          </div>

          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
            {/* Package 1 */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">App Access</h3>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Get access to all training programs and nutrition resources.</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$40</span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">/month</span>
                </p>
                <Link
                  to="/login?signup=true"
                  className="mt-8 block w-full bg-gray-800 dark:bg-gray-700 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-gray-900 dark:hover:bg-gray-600"
                >
                  Get Started
                </Link>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">What's included</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Access to all training programs</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Progress tracking tools</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Nutrition guidelines</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Package 2 */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Custom Plan</h3>
                <p className="mt-4 text-gray-500 dark:text-gray-400">One-off customized nutrition and training program.</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$200</span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">/one-time</span>
                </p>
                <Link
                  to="/login?signup=true"
                  className="mt-8 block w-full bg-gray-800 dark:bg-gray-700 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-gray-900 dark:hover:bg-gray-600"
                >
                  Get Started
                </Link>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">What's included</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Personalized nutrition plan</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Custom training program</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">One-time setup for success</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Package 3 */}
            <div className="bg-indigo-600 rounded-lg shadow-md divide-y divide-indigo-500">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white">12-Week Transformation</h3>
                <p className="mt-4 text-indigo-200">12-week comprehensive program.</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-white">$700</span>
                  <span className="text-base font-medium text-indigo-200">/program</span>
                </p>
                <Link
                  to="/login?signup=true"
                  className="mt-8 block w-full bg-white rounded-md py-2 text-sm font-semibold text-indigo-600 text-center hover:bg-gray-50"
                >
                  Get Started
                </Link>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-white">What's included</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-indigo-200" aria-hidden="true" />
                    <span className="text-sm text-indigo-200">Customized meal plans</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-indigo-200" aria-hidden="true" />
                    <span className="text-sm text-indigo-200">Progressive training system</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-indigo-200" aria-hidden="true" />
                    <span className="text-sm text-indigo-200">Bi-weekly check-ins</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-indigo-200" aria-hidden="true" />
                    <span className="text-sm text-indigo-200">Full 12-week support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Package 4 */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Premium Coaching</h3>
                <p className="mt-4 text-gray-500 dark:text-gray-400">One-on-one coaching with weekly follow-ups.</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$50</span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">/week</span>
                </p>
                <Link
                  to="/login?signup=true"
                  className="mt-8 block w-full bg-gray-800 dark:bg-gray-700 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-gray-900 dark:hover:bg-gray-600"
                >
                  Get Started
                </Link>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">What's included</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Weekly coaching calls</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Personalized adjustments</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Direct access to coach</span>
                  </li>
                  <li className="flex space-x-3">
                    <FiCheck className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Priority support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instagram Reels Section */}
      <div className="py-16 bg-gradient-to-b from-gray-900 to-gray-800 dark:from-black dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-400 tracking-wide uppercase">FOLLOW MY JOURNEY</h2>
            <p className="mt-1 text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-5xl">
              Bruno Talks Series on Instagram
            </p>
            <p className="max-w-2xl mt-5 mx-auto text-xl text-gray-300 mb-12">
              Follow my fitness journey on Instagram <a href="https://instagram.com/brunoifbb" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">@brunoifbb</a>
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            {/* Instagram Embeds */}
            <InstagramEmbed postUrl="https://www.instagram.com/reel/DI--HzcJ4ZU/" />
            <InstagramEmbed postUrl="https://www.instagram.com/reel/DJBaAUMpJaY/" />
            <InstagramEmbed postUrl="https://www.instagram.com/reel/DJELIiOJx1-/" />
          </div>
            
          <div className="mt-12 text-center">
            <a 
              href="https://instagram.com/brunoifbb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              View More on Instagram
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 ml-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Instagram Embed Container Styles */}
      <style>
        {`
          .instagram-embed-container {
            min-width: 326px;
            max-width: 540px;
            margin-bottom: 20px;
          }
          
          @media (max-width: 640px) {
            .instagram-embed-container {
              width: 100%;
            }
          }
        `}
      </style>

      {/* Testimonials Section - Placeholder */}
      <div className="py-12 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">Testimonials</h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-5xl">
              Real Results, Real People
            </p>
          </div>
          
          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500">Coming Soon</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tamara Costa</h3>
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    "Coming Soon"
                  </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500">Coming Soon</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Naomi Warner</h3>
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    "Coming Soon"
                  </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500">Coming Soon</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pablo Trecco</h3>
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    "Coming Soon"
                  </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-indigo-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to transform?</span>
            <span className="block text-indigo-200">Start your journey today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/login?signup=true"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
              >
                Get Started
                <FiArrowRight className="ml-2 -mr-1 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:order-2 space-x-6">
              {/* Social Links */}
              <a href="https://instagram.com/brunoifbb" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              
              <a href="https://facebook.com/brunoifbb" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              
              <a href="https://youtube.com/@brunoifbb" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors">
                <span className="sr-only">YouTube</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                </svg>
              </a>
              
              <a href="https://tiktok.com/@brunoifbb" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors">
                <span className="sr-only">TikTok</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-base text-gray-400">
                &copy; {new Date().getFullYear()} ENG App. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Add CSS for the grid pattern */}
      <style>
        {`
          .bg-grid-pattern {
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          }
        `}
      </style>
    </div>
  );
};

export default HomePage; 