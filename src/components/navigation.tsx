import { memo, useCallback, useLayoutEffect, useRef } from 'react';
import { Cable, House, LayoutGrid, Settings, type LucideIcon } from 'lucide-react';
import type { Page } from '../types';
import { useTranslation } from '../i18n';

const tabs: { id: Page; label: 'home' | 'apps' | 'inputs' | 'settings'; icon: LucideIcon }[] = [
  { id: 'home', label: 'home', icon: House },
  { id: 'apps', label: 'apps', icon: LayoutGrid },
  { id: 'inputs', label: 'inputs', icon: Cable },
  { id: 'settings', label: 'settings', icon: Settings },
];

// `labels` shows the text pill; without it each page is a round icon button, like the
// TV settings button, and the selected one is filled instead of using the moving pill.
export const Navigation = memo(function Navigation({
  page,
  labels,
  onChange,
}: {
  page: Page;
  labels: boolean;
  onChange: (page: Page) => void;
}) {
  const { t } = useTranslation();
  const navigation = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const positioned = useRef(false);
  const positionIndicator = useCallback((animate: boolean) => {
    const selected = navigation.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const pill = indicator.current;
    if (!selected || !pill) return;
    // Measure only when selecting a tab or resizing. CSS owns every animation frame.
    pill.style.transition = animate ? '' : 'none';
    const left = selected.offsetLeft;
    const width = selected.offsetWidth;
    pill.style.width = `${width}px`;
    pill.style.transform = `translateX(${left}px)`;
  }, []);

  useLayoutEffect(() => {
    positionIndicator(positioned.current);
    positioned.current = true;
  }, [page, labels, positionIndicator]);

  useLayoutEffect(() => {
    const element = navigation.current;
    if (!element) return;
    // Font loading and responsive styles can change the individual tab widths.
    const observer = new ResizeObserver(() => positionIndicator(false));
    observer.observe(element);
    element.querySelectorAll('button').forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, [labels, positionIndicator]);

  return (
    <nav
      ref={navigation}
      className={`navigation${labels ? '' : ' is-icons'}`}
      aria-label={t('mainNavigation')}
    >
      {labels ? <span ref={indicator} className="nav-indicator" aria-hidden="true" /> : null}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-item${page === tab.id ? ' active' : ''}`}
          data-focusable={`nav-${tab.id}`}
          aria-current={page === tab.id ? 'page' : undefined}
          aria-label={labels ? undefined : t(tab.label)}
          title={labels ? undefined : t(tab.label)}
          onClick={() => onChange(tab.id)}
        >
          {labels ? <span>{t(tab.label)}</span> : <tab.icon strokeWidth={1.8} aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
});
