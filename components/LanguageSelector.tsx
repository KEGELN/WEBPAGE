// components/LanguageSelector.tsx
'use client';

import { useI18n } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as 'en' | 'de';
    setLanguage(newLanguage);
  };

  return (
    <div className="relative">
      <label htmlFor="language-select" className="sr-only">
        {t('languageSelector.ariaLabel', 'Select language')}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={handleLanguageChange}
        className="p-2 rounded-full hover:bg-accent transition-colors duration-200 bg-transparent border-0 focus:ring-0 appearance-none pl-8"
        aria-label={t('languageSelector.ariaLabel', 'Select language')}
      >
        <option value="en">{t('languageSelector.english', 'English')}</option>
        <option value="de">{t('languageSelector.german', 'German')}</option>
      </select>
      <Globe
        size={20}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
      />
    </div>
  );
}