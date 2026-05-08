import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="segmented">
      <button
        type="button"
        className={language === 'en' ? 'seg active' : 'seg'}
        onClick={() => setLanguage('en')}
        aria-label="English"
      >
        EN
      </button>
      <button
        type="button"
        className={language === 'my' ? 'seg active' : 'seg'}
        onClick={() => setLanguage('my')}
        aria-label="Burmese"
      >
        မြန်မာ
      </button>
    </div>
  );
}
