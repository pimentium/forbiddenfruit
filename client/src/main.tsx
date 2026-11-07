import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SearchPage } from './SearchPage';
import { AppPage } from './AppPage';
import { Analytics } from './Analytics';
import { Brand } from './Brand';
import { ThemeSwitcher } from './ThemeSwitcher';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Analytics />
      <nav className="topbar">
        <Brand />
        <ThemeSwitcher />
      </nav>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/app/:id" element={<AppPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
