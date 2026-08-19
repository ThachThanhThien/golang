import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ThemeProvider } from './core/context/ThemeContext';
import { CourseProvider } from './core/context/CourseContext';
import { ProgressProvider } from './core/context/ProgressContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CourseProvider>
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </CourseProvider>
    </ThemeProvider>
  </StrictMode>,
);
