import {
  Accessibility,
  Check,
  ChevronRight,
  Clock3,
  Languages,
  ChevronDown,
  House,
  RefreshCw,
  Type,
} from 'lucide-react';
import { WeatherSettings } from './weather-settings';
import type { Language, Preferences } from '../types';
import { useRef, useState } from 'react';
import { wallpapers, wallpaperThumbnail } from '../wallpapers';

const photoWallpapers = wallpapers.filter((wallpaper) => !wallpaper.video);
const videoWallpapers = wallpapers.filter((wallpaper) => wallpaper.video);
import { useTranslation, wallpaperLabel } from '../i18n';

interface Props {
  preferences: Preferences;
  onUpdate: (patch: Partial<Preferences>) => void;
  onRefresh: () => void;
}

export function Settings({ preferences, onUpdate, onRefresh }: Props) {
  const { t, language } = useTranslation();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageButton = useRef<HTMLButtonElement>(null);
  const chooseLanguage = (next: Language) => {
    onUpdate({ language: next });
    setLanguageMenuOpen(false);
    requestAnimationFrame(() => languageButton.current?.focus({ preventScroll: true }));
  };
  const openLanguageMenu = () => {
    setLanguageMenuOpen(true);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-focusable="language-option-${preferences.language}"]`)
        ?.focus({ preventScroll: true });
    });
  };
  const wallpaperOption = (wallpaper: (typeof wallpapers)[number]) => (
    <button
      key={wallpaper.id}
      className={`wallpaper-option${preferences.wallpaper === wallpaper.id ? ' selected' : ''}`}
      data-focusable={`wallpaper-${wallpaper.id}`}
      aria-pressed={preferences.wallpaper === wallpaper.id}
      onClick={() => onUpdate({ wallpaper: wallpaper.id })}
    >
      <span className="wallpaper-thumbnail">
        <img src={wallpaperThumbnail(wallpaper.image)} alt="" draggable={false} decoding="async" />
        {preferences.wallpaper === wallpaper.id ? (
          <span className="wallpaper-check">
            <Check size={18} />
          </span>
        ) : null}
      </span>
      <span>{wallpaperLabel(language, wallpaper.id, wallpaper.title)}</span>
    </button>
  );
  return (
    <section className="settings-page" aria-label={t('settingsRegion')}>
      <h1 className="sr-only">{t('settings')}</h1>
      <div className="settings-layout">
        <section
          className="settings-panel settings-backgrounds"
          aria-labelledby="background-heading"
        >
          <h2 className="settings-section-title" id="background-heading">
            {t('background')}
          </h2>
          <div className="wallpaper-options">{photoWallpapers.map(wallpaperOption)}</div>
          <h3 className="settings-subsection-title">{t('dynamicBackground')}</h3>
          <div className="wallpaper-options">{videoWallpapers.map(wallpaperOption)}</div>
        </section>
        <div className="settings-controls">
          <section className="settings-panel" aria-labelledby="interface-heading">
            <h2 className="settings-section-title" id="interface-heading">
              {t('interface')}
            </h2>
            <div className="settings-group">
              <button
                className="setting-row"
                role="switch"
                aria-checked={preferences.showHomeAppNames}
                data-focusable="setting-home-app-names"
                data-focus-up="nav-settings"
                onClick={() => onUpdate({ showHomeAppNames: !preferences.showHomeAppNames })}
              >
                <Type />
                <span>
                  <strong>{t('showAppNames')}</strong>
                </span>
                <span className={`toggle${preferences.showHomeAppNames ? ' on' : ''}`}>
                  <i />
                </span>
              </button>
              <button
                className="setting-row"
                role="switch"
                aria-checked={preferences.clock24}
                data-focusable="setting-clock"
                onClick={() => onUpdate({ clock24: !preferences.clock24 })}
              >
                <Clock3 />
                <span>
                  <strong>{t('clock24')}</strong>
                </span>
                <span className={`toggle${preferences.clock24 ? ' on' : ''}`}>
                  <i />
                </span>
              </button>
              <button
                className="setting-row"
                role="switch"
                aria-checked={preferences.reducedMotion}
                data-focusable="setting-motion"
                data-focus-down="setting-language"
                onClick={() => onUpdate({ reducedMotion: !preferences.reducedMotion })}
              >
                <Accessibility />
                <span>
                  <strong>{t('reducedMotion')}</strong>
                </span>
                <span className={`toggle${preferences.reducedMotion ? ' on' : ''}`}>
                  <i />
                </span>
              </button>
              <div className="setting-row language-option">
                <Languages aria-hidden="true" />
                <span>
                  <strong>{t('language')}</strong>
                </span>
                <button
                  ref={languageButton}
                  type="button"
                  className="language-trigger"
                  data-focusable="setting-language"
                  data-focus-up="setting-motion"
                  data-focus-down="setting-refresh"
                  aria-haspopup="listbox"
                  aria-expanded={languageMenuOpen}
                  aria-label={`${t('languageMenu')}: ${t(preferences.language === 'en' ? 'english' : preferences.language === 'de' ? 'german' : 'chinese')}`}
                  onKeyDown={(event) => {
                    // Down moves on to the next row like every other setting; OK opens the menu.
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      openLanguageMenu();
                    } else if (event.key === 'Escape' || event.keyCode === 461) {
                      event.preventDefault();
                      event.stopPropagation();
                      setLanguageMenuOpen(false);
                    }
                  }}
                  onClick={() =>
                    languageMenuOpen ? setLanguageMenuOpen(false) : openLanguageMenu()
                  }
                  // Moving away before focus reaches the open menu also closes it.
                  onBlur={(event) => {
                    if (!(event.relatedTarget as HTMLElement | null)?.closest('.language-menu'))
                      setLanguageMenuOpen(false);
                  }}
                >
                  <span>
                    {t(
                      preferences.language === 'en'
                        ? 'english'
                        : preferences.language === 'de'
                          ? 'german'
                          : 'chinese',
                    )}
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </div>
              {languageMenuOpen ? (
                <div
                  className="language-menu"
                  role="listbox"
                  tabIndex={-1}
                  aria-label={t('languageMenu')}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Escape' ||
                      event.keyCode === 461 ||
                      event.key === 'Backspace'
                    ) {
                      event.preventDefault();
                      setLanguageMenuOpen(false);
                      languageButton.current?.focus({ preventScroll: true });
                    }
                  }}
                  // Leaving the menu sideways or with the pointer closes it.
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                      setLanguageMenuOpen(false);
                  }}
                >
                  {(
                    [
                      ['en', 'english'],
                      ['de', 'german'],
                      ['zh', 'chinese'],
                    ] as const
                  ).map(([option, label], index, options) => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={preferences.language === option}
                      className="language-menu-option"
                      data-focusable={`language-option-${option}`}
                      data-focus-up={
                        index > 0 ? `language-option-${options[index - 1][0]}` : undefined
                      }
                      data-focus-down={
                        index < options.length - 1
                          ? `language-option-${options[index + 1][0]}`
                          : undefined
                      }
                      onKeyDown={(event) => {
                        // The ends of the list lead out of the menu instead of wrapping.
                        const exit =
                          event.key === 'ArrowUp' && index === 0
                            ? languageButton.current
                            : event.key === 'ArrowDown' && index === options.length - 1
                              ? document.querySelector<HTMLElement>(
                                  '[data-focusable="setting-refresh"]',
                                )
                              : null;
                        if (exit) {
                          event.preventDefault();
                          event.stopPropagation();
                          setLanguageMenuOpen(false);
                          exit.focus({ preventScroll: true });
                          return;
                        }
                        if (
                          event.key === 'Escape' ||
                          event.keyCode === 461 ||
                          event.key === 'Backspace'
                        ) {
                          event.preventDefault();
                          event.stopPropagation();
                          setLanguageMenuOpen(false);
                          languageButton.current?.focus({ preventScroll: true });
                        }
                      }}
                      onClick={() => chooseLanguage(option)}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="settings-group">
              <button
                className="setting-row"
                data-focusable="setting-refresh"
                data-focus-up="setting-language"
                data-focus-down="setting-use-as-home"
                onClick={onRefresh}
              >
                <RefreshCw />
                <span>
                  <strong>{t('refreshApps')}</strong>
                </span>
                <ChevronRight />
              </button>
              <button
                className="setting-row"
                role="switch"
                aria-checked={preferences.useAsHome}
                data-focusable="setting-use-as-home"
                data-focus-up="setting-refresh"
                data-focus-down="setting-show-weather"
                onClick={() => onUpdate({ useAsHome: !preferences.useAsHome })}
              >
                <House />
                <span>
                  <strong>{t('useAsHome')}</strong>
                  <small>{t('useAsHomeHint')}</small>
                </span>
                <span className={`toggle${preferences.useAsHome ? ' on' : ''}`}>
                  <i />
                </span>
              </button>
            </div>
          </section>
          <section className="settings-panel">
            <WeatherSettings
              location={preferences.weatherLocation}
              onChange={(weatherLocation) => onUpdate({ weatherLocation })}
              enabled={preferences.showWeather}
              onEnabledChange={(showWeather) => onUpdate({ showWeather })}
              unit={preferences.temperatureUnit}
              onUnitChange={(temperatureUnit) => onUpdate({ temperatureUnit })}
              dynamicBackground={preferences.dynamicBackground}
              onDynamicBackgroundChange={(dynamicBackground) => onUpdate({ dynamicBackground })}
            />
          </section>
        </div>
      </div>
    </section>
  );
}
