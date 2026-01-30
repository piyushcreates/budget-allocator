export const PLATFORMS = [
  { internalKey: 'meta', name: 'Meta Ads' },
  { internalKey: 'google_search', name: 'Google Search Ads' },
  { internalKey: 'google_display', name: 'Google Display YouTube' },
  { internalKey: 'tiktok', name: 'TikTok Ads' },
  { internalKey: 'linkedin', name: 'LinkedIn Ads' },
  { internalKey: 'twitter', name: 'Twitter X Ads' },
  { internalKey: 'snapchat', name: 'Snapchat Ads' },
];

export const OBJECTIVES = [
  { internalKey: 'awareness', name: 'Awareness' },
  { internalKey: 'engagement', name: 'Traffic Engagement' },
  { internalKey: 'conversions', name: 'Conversions Sales' },
  { internalKey: 'leads', name: 'Leads' }, // New objective added
];

export type PlatformKey = typeof PLATFORMS[number]['internalKey'];
export type ObjectiveKey = typeof OBJECTIVES[number]['internalKey'];

export const BASE_WEIGHTS: Record<ObjectiveKey, Record<PlatformKey, number>> = {
  awareness: {
    meta: 25,
    google_search: 0,
    google_display: 20,
    tiktok: 25,
    linkedin: 5,
    twitter: 10,
    snapchat: 15,
  },
  engagement: {
    meta: 25,
    google_search: 20,
    google_display: 5,
    tiktok: 20,
    linkedin: 10,
    twitter: 15,
    snapchat: 5,
  },
  conversions: {
    meta: 25,
    google_search: 35,
    google_display: 5,
    tiktok: 10,
    linkedin: 15,
    twitter: 5,
    snapchat: 5,
  },
  leads: { // New weights for 'Leads' objective
    meta: 30,
    google_search: 30,
    linkedin: 20,
    tiktok: 10,
    google_display: 5,
    twitter: 3,
    snapchat: 2,
  },
};

export const FUNNEL_SPLIT_RATIOS: Record<ObjectiveKey, { awareness: number; traffic: number; conversions: number }> = {
  awareness: { awareness: 70, traffic: 30, conversions: 0 },
  engagement: { awareness: 30, traffic: 50, conversions: 20 },
  leads: { awareness: 20, traffic: 40, conversions: 40 },
  conversions: { awareness: 10, traffic: 20, conversions: 70 },
};