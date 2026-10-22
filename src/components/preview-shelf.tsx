import { useEffect, useState } from 'react';
import { loadPreviews, type PreviewItem } from '../previews';
import { useTranslation } from '../i18n';
import type { TVApp } from '../types';

// Loaded shelves are reused so moving across tiles never refetches, and refreshed in the
// background once they are older than SHELF_TTL_MS; apps can publish new content.
const SHELF_TTL_MS = 10 * 60 * 1000;
const shelves = new Map<string, { items: PreviewItem[]; at: number }>();
// Matches the closing transition in styles.css.
const SHELF_EXIT_MS = 400;
const pending = new Map<string, Promise<PreviewItem[]>>();

function fetchShelf(app: TVApp): Promise<PreviewItem[]> {
  let request = pending.get(app.id);
  if (!request) {
    request = loadPreviews(app)
      .catch(() => [])
      .then((items) => {
        shelves.set(app.id, { items, at: Date.now() });
        return items;
      })
      .finally(() => pending.delete(app.id));
    pending.set(app.id, request);
  }
  return request;
}

const fresh = (app: TVApp) => {
  const shelf = shelves.get(app.id);
  return !!shelf && Date.now() - shelf.at < SHELF_TTL_MS;
};

// Loads the shelves of the given apps one after another, so a focused favorite opens at once.
export async function prefetchPreviews(apps: TVApp[]): Promise<void> {
  for (const app of apps) if (!fresh(app)) await fetchShelf(app);
}

// Always reads the shared cache, which prefetching may have refreshed; loading only
// triggers a render.
export function usePreviewItems(app: TVApp | undefined): PreviewItem[] {
  const [, setLoads] = useState(0);
  useEffect(() => {
    if (!app || fresh(app)) return;
    let current = true;
    void fetchShelf(app).then(() => {
      if (current) setLoads((count) => count + 1);
    });
    return () => {
      current = false;
    };
  }, [app]);
  return app ? (shelves.get(app.id)?.items ?? []) : [];
}

// A favorite's highlighted content, shown under the Home greeting while open. It stays
// mounted with its last content so closing can fade out; closed cards are not focusable.
export function PreviewShelf({
  app,
  items,
  open,
  onOpen,
}: {
  app: TVApp | undefined;
  items: PreviewItem[];
  open: boolean;
  onOpen: (app: TVApp, item: PreviewItem) => void;
}) {
  const { t } = useTranslation();
  const [last, setLast] = useState<{ app: TVApp; items: PreviewItem[] } | null>(null);
  const current = open && app && items.length ? { app, items } : null;
  if (current && (last?.app !== current.app || last.items !== current.items)) setLast(current);
  // Once the fade-out has finished, the closed shelf leaves the page entirely: on the TV a
  // transparent, hidden shelf still left faint traces over the background.
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setLast(null), SHELF_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);
  const shown = current ?? last;
  if (!shown) return null;
  const label = t('previewShelf', { app: shown.app.title });
  return (
    <div
      className={`preview-shelf${open ? ' is-open' : ''}`}
      aria-label={label}
      aria-hidden={!open}
    >
      <div className="preview-row">
        {shown.items.map((item, index) => {
          const self = `preview-${item.id}`;
          return (
            <button
              key={item.id}
              className="preview-card"
              tabIndex={open ? undefined : -1}
              data-focusable={open ? self : undefined}
              data-focus-down={`favorite-${shown.app.id}`}
              // Left and Right follow the row even while it scrolls, and its ends hold focus
              // instead of leaving the shelf.
              data-focus-left={`preview-${shown.items[Math.max(0, index - 1)].id}`}
              data-focus-right={`preview-${shown.items[Math.min(shown.items.length - 1, index + 1)].id}`}
              aria-label={t('playPreview', {
                title: `${item.title} · ${item.subtitle}`,
                app: shown.app.title,
              })}
              // Only a moving pointer takes focus: the shelf appearing under a resting
              // cursor must not pull focus away from the remote.
              onPointerMove={(event) => {
                const card = event.currentTarget;
                if (open && event.pointerType === 'mouse' && document.activeElement !== card)
                  card.focus({ preventScroll: true });
              }}
              onClick={() => onOpen(shown.app, item)}
            >
              <span className="preview-art">
                <img src={item.image} alt="" draggable={false} decoding="async" loading="lazy" />
              </span>
              <span className="preview-title">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
