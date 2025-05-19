import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

/**
 * HomePage component
 * Landing page for the ENG App showcasing the trainer's bio and package offerings
 */
const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm">
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
      <div className="relative bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gray-50 dark:bg-gray-800 sm:pb-16 md:pb-20 lg:w-full lg:pb-28 xl:pb-32">
            <div className="pt-10 mx-auto max-w-7xl px-4 sm:pt-12 sm:px-6 md:pt-16 lg:pt-20 lg:px-8 xl:pt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block">Earned Not Given</span>
                  <span className="block text-indigo-600 dark:text-indigo-400">Progress you can measure, effort you can track</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Transform your physique with evidence-based training programs, personalized nutrition plans, and expert coaching designed to maximize your results.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
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
                      className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 md:py-4 md:text-lg md:px-10"
                    >
                      Login
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Me Section */}
      <div className="py-12 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">About Me</h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-5xl">
              Meet Your Coach
            </p>
          </div>
          <div className="mt-10">
            <div className="md:flex md:items-center md:space-x-10">
              <div className="md:w-1/3">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md">
                  <div className="h-64 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400">Coach Image</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-0 md:w-2/3">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Bruno Souza da Silva</h3>
                <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
                  I'm a 40-year-old Brazilian-Australian living in Bright, Victoria. When I'm not leading web development projects, you'll find me pushing plates in the gym, carving fresh powder on a snowboard, tearing up alpine trails on my dirt bike, or sharpening my game on the tennis and squash courts.
                </p>
                <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
                  I train to stay strong for the mountains, agile for the courts, and energetic for life with my family. My goal is simple: keep leveling up, inspire others to move, and prove that consistency beats excuses—every single day.
                </p>
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
                <p className="mt-4 text-indigo-200">Growth by Plants 12-week comprehensive program.</p>
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
              {/* Placeholder for testimonial cards - you can add real content later */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500">Transformation Photo</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Client Name</h3>
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                  </p>
                </div>
              ))}
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
              {/* Social Links (placeholders) */}
              <a href="#" className="text-gray-400 hover:text-gray-300">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-300">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-base text-gray-400">
                &copy; 2023 ENG App. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 