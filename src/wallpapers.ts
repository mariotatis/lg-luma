import type { Wallpaper } from './types';

export const wallpaperThumbnail = (image: string) =>
  `./${image.endsWith('.jpg') ? 'wallpaper-thumbnails' : 'wallpapers'}/${image}`;

export const wallpapers: {
  id: Wallpaper;
  title: string;
  image: string;
  // Looping video backgrounds; `image` is their first frame.
  video?: string;
}[] = [
  {
    id: 'slate',
    title: 'Slate',
    image: 'slate.svg',
  },
  {
    id: 'midnight',
    title: 'Midnight',
    image: 'midnight.svg',
  },
  {
    id: 'prism',
    title: 'Prism',
    image: 'prism.svg',
  },
  {
    id: 'dunes',
    title: 'Monument Valley',
    image: 'dunes.jpg',
  },
  {
    id: 'san-francisco',
    title: 'San Francisco',
    image: 'san-francisco.jpg',
  },
  {
    id: 'summit',
    title: 'Summit',
    image: 'summit.jpg',
  },
  {
    id: 'forest',
    title: 'Forest',
    image: 'forest.jpg',
  },
  {
    id: 'yosemite',
    title: 'Yosemite',
    image: 'yosemite.jpg',
  },
  {
    id: 'northern-lights',
    title: 'Northern lights',
    image: 'northern-lights.jpg',
  },
  {
    id: 'china',
    title: 'Great Wall',
    image: 'china.jpg',
    video: './weather-videos/other/china.mp4',
  },
  {
    id: 'la',
    title: 'Los Angeles',
    image: 'la.jpg',
    video: './weather-videos/other/la.mp4',
  },
  {
    id: 'sfo',
    title: 'San Francisco Bay',
    image: 'sfo.jpg',
    video: './weather-videos/other/sfo.mp4',
  },
];
