import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const mainContent = document.getElementById('main-content');

      if (mainContent) {
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        mainContent.focus({ preventScroll: true });
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [pathname]);

  return null;
}
