import { GalleryHorizontal } from 'lucide-react';
import type { PointerEvent } from 'react';
import { Dialog } from './dialog';
import { Brand } from './brand';
import { useTranslation } from '../i18n';
import type { Preferences, TVApp } from '../types';

function focusRow(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType === 'mouse') event.currentTarget.focus({ preventScroll: true });
}

// Settings → Interface → Previews on Home: the master switch, then one switch per app with
// a verified shelf, so the Interface list itself stays one row long.
export function PreviewSettings({
  apps,
  preferences,
  onUpdate,
  onClose,
}: {
  apps: TVApp[];
  preferences: Preferences;
  onUpdate: (patch: Partial<Preferences>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const disabled = new Set(preferences.disabledPreviews);
  return (
    <Dialog title={t('previewsOnHome')} subtitle={t('previewsHint')} onClose={onClose}>
      <div className="settings-group preview-settings">
        <button
          className="setting-row"
          role="switch"
          aria-checked={preferences.showPreviews}
          data-focusable="previews-all"
          data-autofocus="true"
          onPointerEnter={focusRow}
          onClick={() => onUpdate({ showPreviews: !preferences.showPreviews })}
        >
          <GalleryHorizontal />
          <span>
            <strong>{t('showPreviews')}</strong>
          </span>
          <span className={`toggle${preferences.showPreviews ? ' on' : ''}`}>
            <i />
          </span>
        </button>
        {apps.map((app) => {
          const on = !disabled.has(app.id);
          return (
            <button
              key={app.id}
              className={`setting-row preview-app-row${preferences.showPreviews ? '' : ' is-muted'}`}
              role="switch"
              aria-checked={on}
              data-focusable={`previews-${app.id}`}
              onPointerEnter={focusRow}
              onClick={() =>
                onUpdate({
                  disabledPreviews: on
                    ? [...preferences.disabledPreviews, app.id]
                    : preferences.disabledPreviews.filter((id) => id !== app.id),
                })
              }
            >
              <span className={`preview-app-icon app-face brand-${app.brand}`} aria-hidden="true">
                <Brand app={app} />
              </span>
              <span>
                <strong>{app.title}</strong>
              </span>
              <span className={`toggle${on ? ' on' : ''}`}>
                <i />
              </span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
