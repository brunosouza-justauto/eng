import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = "Privacy Policy | ENG Coaching";
  }, []);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center mb-8">
          <button 
            onClick={handleGoBack}
            className="mr-4 flex items-center text-indigo-400 hover:text-indigo-300 transition-colors"
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-300 mb-4">
            ENG ("Earned Not Given") Coaching ("we," "our," or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            coaching application and connected fitness services.
          </p>
          <p className="text-gray-300 mb-4">
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
            please do not access the application.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-gray-100 mb-2">Personal Information</h3>
          <p className="text-gray-300 mb-4">
            We may collect personal information that you voluntarily provide when using our application, including:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-6 ml-2">
            <li>Name, email address, and contact information</li>
            <li>Profile information such as age, gender, height, and weight</li>
            <li>Login credentials</li>
            <li>Health and fitness data</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-100 mb-2">Fitness Device Data</h3>
          <p className="text-gray-300 mb-4">
            When you connect fitness devices or services (such as Fitbit, Garmin, or Google Fit), we may collect:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-6 ml-2">
            <li>Step counts and activity data</li>
            <li>Heart rate information</li>
            <li>Sleep metrics</li>
            <li>Other fitness-related metrics provided by connected services</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="text-gray-300 mb-2">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-4 ml-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Track your fitness progress and goals</li>
            <li>Create personalized workout and nutrition plans</li>
            <li>Communicate with you about your account and provide customer support</li>
            <li>Send you updates, security alerts, and administrative messages</li>
            <li>Analyze usage patterns and optimize user experience</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Fitness Services</h2>
          <p className="text-gray-300 mb-4">
            Our application integrates with third-party fitness services and devices. When you connect these services, 
            you authorize us to collect and store data from these platforms. Please note that we have no control over 
            the privacy practices of these third-party services, and we encourage you to review their respective privacy policies:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-4 ml-2">
            <li><a href="https://www.fitbit.com/global/us/legal/privacy-policy" className="text-indigo-400 hover:underline">Fitbit Privacy Policy</a></li>
            <li><a href="https://www.garmin.com/en-US/privacy/connect/" className="text-indigo-400 hover:underline">Garmin Connect Privacy Policy</a></li>
            <li><a href="https://policies.google.com/privacy" className="text-indigo-400 hover:underline">Google Fit (Google Privacy Policy)</a></li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
          <p className="text-gray-300 mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information 
            from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the 
            Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          <p className="text-gray-300 mb-4">
            Your data is stored using industry-standard database technologies with proper encryption and access controls.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p className="text-gray-300 mb-4">
            Depending on your location, you may have certain rights regarding your personal information, including:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-4 ml-2">
            <li>Access to your personal information</li>
            <li>Correction of inaccurate or incomplete information</li>
            <li>Deletion of your personal information</li>
            <li>Restriction or objection to certain processing activities</li>
            <li>Data portability</li>
            <li>Withdrawal of consent</li>
          </ul>
          <p className="text-gray-300 mb-4">
            To exercise these rights, please contact us using the information provided in the "Contact Us" section.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
          <p className="text-gray-300 mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
            Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy 
            Policy periodically for any changes.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-300 mb-4">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-gray-300">
            Email: privacy@engcoaching.com<br />
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage; 