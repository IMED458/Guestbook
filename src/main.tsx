import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './lib/i18n.tsx';
import { SessionProvider } from './lib/session.tsx';
import { ToastProvider } from './components/ui/Toast.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SessionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SessionProvider>
    </I18nProvider>
  </StrictMode>,
);
