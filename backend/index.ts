import { router, json, error, db, requireAuth } from '@appdeploy/sdk';

type Project = { title: string; description: string; url: string; stack: string };
type Profile = {
  userId: string; displayName: string; handle: string; tagline: string; about: string;
  skills: string[]; github: string; website: string; achievements: string[];
  projects: Project[]; updatedAt: string;
};
const TABLE = 'creator_profiles';
const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const cleanList = (value: unknown, maxItems: number, maxLength: number): string[] =>
  Array.isArray(value) ? value.slice(0, maxItems).map(v => cleanText(v, maxLength)).filter(Boolean) : [];
const cleanUrl = (value: unknown): string => {
  const url = cleanText(value, 300);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
  } catch { return ''; }
};
function publicProfile(raw: Record<string, unknown>): Profile {
  const projects = Array.isArray(raw.projects) ? raw.projects.slice(0, 12).map(item => {
    const p = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return { title: cleanText(p.title, 100), description: cleanText(p.description, 500), url: cleanUrl(p.url), stack: cleanText(p.stack, 180) };
  }).filter(p => p.title) : [];
  return {
    userId: cleanText(raw.userId, 80), displayName: cleanText(raw.displayName, 70),
    handle: cleanText(raw.handle, 40).toLowerCase().replace(/[^a-z0-9-]/g, ''),
    tagline: cleanText(raw.tagline, 140), about: cleanText(raw.about, 1200),
    skills: cleanList(raw.skills, 20, 40), github: cleanUrl(raw.github), website: cleanUrl(raw.website),
    achievements: cleanList(raw.achievements, 12, 140), projects, updatedAt: cleanText(raw.updatedAt, 40)
  };
}
export const handler = router({
  'GET /api/profiles': [async ({ query }) => {
    const page = await db.list<Record<string, unknown>>(TABLE, { limit: 100 });
    const q = (query.q || '').trim().toLowerCase();
    const skill = (query.skill || '').trim().toLowerCase();
    const profiles = page.items.map(item => publicProfile(item))
      .filter(p => p.displayName && p.handle)
      .filter(p => !q || [p.displayName, p.handle, p.tagline, p.about, ...p.skills, ...p.projects.map(x => x.title)].join(' ').toLowerCase().includes(q))
      .filter(p => !skill || p.skills.some(s => s.toLowerCase() === skill))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return json({ profiles, nextToken: page.nextToken || null });
  }],
  'GET /api/profiles/:id': [async ({ params }) => {
    const [record] = await db.get<Record<string, unknown>>(TABLE, [params.id]);
    if (!record) return error('Profile not found', 404);
    const profile = publicProfile(record);
    return profile.displayName && profile.handle ? json({ profile }) : error('Profile not found', 404);
  }],
  'GET /api/me': [requireAuth(), async ({ user }) => {
    const [record] = await db.get<Record<string, unknown>>(TABLE, [user!.userId]);
    return json({ profile: record ? publicProfile(record) : null });
  }],
  'PUT /api/me': [requireAuth(), async ({ user, body }) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid profile data', 400);
    const input = body as Record<string, unknown>;
    const profile = publicProfile({ ...input, userId: user!.userId, updatedAt: new Date().toISOString() });
    if (!profile.displayName || !profile.handle) return error('Display name and handle are required', 400);
    if (profile.handle.length < 2) return error('Handle must contain at least two characters', 400);
    const page = await db.list<Record<string, unknown>>(TABLE, { limit: 100 });
    const conflict = page.items.find(item => item.id !== user!.userId && String(item.handle || '').toLowerCase() === profile.handle);
    if (conflict) return error('That public handle is already in use. Please choose another.', 409);
    const [saved] = await db.tx.update(TABLE, [{ id: user!.userId, record: profile as unknown as Record<string, unknown> }]);
    if (!saved) return error('Could not save your profile. Please try again.', 503);
    return json({ profile });
  }],
  'DELETE /api/me': [requireAuth(), async ({ user }) => {
    const [deleted] = await db.delete(TABLE, [user!.userId]);
    return json({ deleted });
  }]
});
