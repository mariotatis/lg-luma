import { isTV, readAppContent } from './bridge';
import { validAppId } from './catalog';
import type { TVApp } from './types';

// Highlighted content for an app's preview shelf on Home, like Apple TV's top shelf.
// Each item opens the app straight at that content through webOS launch parameters.
export interface PreviewItem {
  id: string;
  title: string;
  // Shown in the card's accessible name; the card itself shows only the title.
  subtitle: string;
  image: string;
  // Opens `appId` (normally the shelf's own app) at this content.
  appId?: string;
  launch: { contentId?: string; params?: Record<string, string> };
}

const youtubeVideo = (id: string, title: string, channel: string): PreviewItem => ({
  id,
  title,
  subtitle: channel,
  // hqdefault is 4:3 with letterboxing; the card crops it back to 16:9.
  image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  // The format YouTube publishes to webOS and accepts as a launch target.
  launch: { params: { contentTarget: `v=${id}` } },
});

// Sample shelf for the desktop preview until a live source is chosen.
const sampleYoutube: PreviewItem[] = [
  youtubeVideo('kJQP7kiw5Fk', 'Luis Fonsi - Despacito ft. Daddy Yankee', 'Luis Fonsi'),
  youtubeVideo('JGwWNGJdvx8', 'Ed Sheeran - Shape of You (Official Music Video)', 'Ed Sheeran'),
  youtubeVideo('OPf0YbXqDm0', 'Mark Ronson - Uptown Funk ft. Bruno Mars', 'Mark Ronson'),
  youtubeVideo('fJ9rUzIMcZQ', 'Queen – Bohemian Rhapsody (Official Video Remastered)', 'Queen'),
  youtubeVideo('RgKAFK5djSk', 'Wiz Khalifa - See You Again ft. Charlie Puth', 'Wiz Khalifa'),
  youtubeVideo('hT_nvWreIhg', 'OneRepublic - Counting Stars', 'OneRepublic'),
  youtubeVideo('9bZkp7q19f0', 'PSY - GANGNAM STYLE (강남스타일) M/V', 'officialpsy'),
  youtubeVideo('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up', 'Rick Astley'),
];

const record = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const imageUrl = (value: unknown) => {
  const url = record(value) ? text(value.url, 2048) : '';
  return /^https?:\/\//.test(url) ? url : '';
};

// webOS contentminer entries, as published for LG's home screen: a leading "title" entry
// for the row, then "content" entries with artwork and a launch target. LG's home opens
// each one by passing its contentId to the target app as contentTarget.
export function normalizeContent(raw: unknown, appId: string): PreviewItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .slice(0, 40)
    .flatMap((entry, index): PreviewItem[] => {
      if (!record(entry) || entry.type !== 'content' || !record(entry.onClick)) return [];
      const title = text(entry.titleText, 200);
      const contentId = text(entry.onClick.contentId, 2048);
      const target = entry.onClick.targetAppId;
      const image = imageUrl(entry.image) || imageUrl(entry.image_4k);
      if (!title || !contentId || !image || seen.has(contentId)) return [];
      seen.add(contentId);
      return [
        {
          id: `${index}`,
          title,
          subtitle: text(entry.category, 120),
          image,
          appId: validAppId(target) ? target : appId,
          launch: { params: { contentTarget: contentId } },
        },
      ];
    })
    .slice(0, 20);
}

// Apps without published content, or without deep links, get no shelf.
export async function loadPreviews(app: TVApp): Promise<PreviewItem[]> {
  if (isTV()) return normalizeContent(await readAppContent(app.id), app.id);
  return app.brand === 'youtube' ? sampleYoutube : [];
}
