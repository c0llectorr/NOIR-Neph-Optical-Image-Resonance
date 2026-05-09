
/**
 * Song Service
 * Centralized logic for resolving audio previews and track metadata
 */

import { SongRecommendation } from "../types";

export interface TrackMetadata {
  previewUrl: string;
  albumArt: string;
  trackId: string;
  artistName: string;
  trackName: string;
}

const CACHE_PREFIX = 'track_res_v2_';

/**
 * Normalizes artist and title for better searching
 */
function cleanString(str: string): string {
  return str
    .replace(/\(.*\)|\[.*\]/g, '') // Remove parentheticals
    .replace(/feat\.|ft\.|featuring/gi, '') // Remove features
    .replace(/&|and/gi, ' ') // Replace & with space
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .trim();
}

/**
 * Fetches track data from iTunes via the app's proxy
 */
async function fetchTrackFromiTunes(query: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/itunes-search?term=${encodeURIComponent(query)}&v=${Date.now()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error(`[SongService] Fetch failed for "${query}":`, err);
    return [];
  }
}

/**
 * Resolves a single song recommendation to a playable track
 */
export async function resolveSong(song: SongRecommendation): Promise<SongRecommendation> {
  const cacheKey = `${CACHE_PREFIX}${song.title}_${song.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // 1. Check persistent cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      return { ...song, ...data };
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  const cleanTitle = cleanString(song.title);
  const cleanArtist = cleanString(song.artist);

  // 2. Define search variations in order of specificity
  const variations = [
    `${cleanTitle} ${cleanArtist}`, // Most targeted
    `${song.title} ${song.artist}`,   // Original strings
    cleanTitle,                     // Just title (often enough)
    `${cleanArtist} ${cleanTitle}`  // Reversed
  ].filter(Boolean);

  console.log(`[SongService] Resolving: "${song.title}" by "${song.artist}"`);

  for (const query of variations) {
    const results = await fetchTrackFromiTunes(query);
    if (results.length === 0) continue;

    // Filter for tracks with previews
    const playable = results.filter(r => !!r.previewUrl);
    if (playable.length === 0) continue;

    // Find best match: prioritize artist match
    let bestMatch = playable.find(r => 
      r.artistName?.toLowerCase().includes(cleanArtist.toLowerCase()) || 
      cleanArtist.toLowerCase().includes(r.artistName?.toLowerCase())
    );

    // Fallback to first playable result if no artist match
    if (!bestMatch) {
      bestMatch = playable[0];
    }

    if (bestMatch) {
      console.log(`[SongService] Matched "${song.title}" -> "${bestMatch.trackName}" (${bestMatch.previewUrl})`);
      const resolvedData = {
        previewUrl: bestMatch.previewUrl,
        albumArt: (bestMatch.artworkUrl100 || "").replace('100x100bb', '600x600bb'),
        trackId: bestMatch.trackId?.toString()
      };

      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify(resolvedData));
      return { ...song, ...resolvedData };
    }
  }

  console.warn(`[SongService] Could not resolve playable track for: ${song.title}`);
  return song; // Return as-is
}

/**
 * Resolves an array of songs in parallel
 */
export async function resolveSongs(songs: SongRecommendation[]): Promise<SongRecommendation[]> {
  return Promise.all(songs.map(resolveSong));
}
