import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SearchPage } from './SearchPage';
import { AppPage } from './AppPage';
import { Brand } from './Brand';
import { ThemeSwitcher } from './ThemeSwitcher';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
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
