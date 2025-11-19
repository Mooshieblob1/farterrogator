import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation, Trans } from 'react-i18next';
import { X, HelpCircle, Zap, Shield, Cpu, Globe } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 animate-in zoom-in-50 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-red-500" />
            {t('info.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
              <span className="font-bold text-slate-900 dark:text-slate-100">Farterrogator</span> {t('info.description').replace('Farterrogator ', '')}
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {t('info.features.dualModes.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <Trans i18nKey="info.features.dualModes.description" components={{ strong: <strong /> }} />
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-500" />
                {t('info.features.naiReady.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <Trans i18nKey="info.features.naiReady.description" components={{ strong: <strong /> }} />
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                {t('info.features.privacy.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <Trans i18nKey="info.features.privacy.description" components={{ strong: <strong /> }} />
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                {t('info.features.gpuGarden.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('info.features.gpuGarden.description')}
              </p>
            </div>
          </div>

          <section className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('info.howTo.title')}</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>{t('info.howTo.step1')}</li>
              <li>{t('info.howTo.step2')}</li>
              <li>{t('info.howTo.step3')}</li>
              <li><Trans i18nKey="info.howTo.step4" components={{ strong: <strong /> }} /></li>
              <li><Trans i18nKey="info.howTo.step5" components={{ strong: <strong /> }} /></li>
            </ol>
          </section>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center">
          <p className="text-xs text-slate-500">
            {t('info.madeBy')} <a href="https://mooshieblob.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">Mooshieblob</a>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
