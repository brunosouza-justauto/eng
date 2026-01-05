import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectLanguage, setLanguage } from '../../store/slices/uiSlice';

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const language = useSelector(selectLanguage);
  const dispatch = useDispatch();
  const { i18n, t } = useTranslation();
  
  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'pt-BR' : 'en';
    dispatch(setLanguage(newLanguage));
    i18n.changeLanguage(newLanguage);
  };
  
  return (
    <button
      onClick={toggleLanguage}
      className={`p-2 rounded-md transition-colors duration-200 
        text-gray-600 hover:text-gray-900 hover:bg-gray-100 
        dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700
        ${className}`}
      aria-label={t('language.switchLanguage')}
      title={t('language.switchLanguage')}
    >
      <div className="flex items-center justify-center w-5 h-5 text-xs font-semibold">
        {language === 'en' ? 'PT' : 'EN'}
      </div>
    </button>
  );
};

export default LanguageToggle;