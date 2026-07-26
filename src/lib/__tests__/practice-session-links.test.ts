import { describe, expect, it } from 'vitest';

import {
  PRACTICE_HISTORY_HREF,
  PRACTICE_SESSIONS_HREF,
  READING_SESSION_PREVIEW_HREF,
  practiceAttemptDetailHref,
} from '../practice-session-links';

describe('practice session link helpers', () => {
  it('exposes stable entry-point hrefs', () => {
    expect(PRACTICE_SESSIONS_HREF).toBe('/practice/sessions');
    expect(PRACTICE_HISTORY_HREF).toBe('/practice/history');
    expect(READING_SESSION_PREVIEW_HREF.startsWith('/practice/session/')).toBe(true);
  });

  it('builds an attempt detail href under the history route', () => {
    expect(practiceAttemptDetailHref('abc123')).toBe('/practice/history/abc123');
  });

  it('percent-encodes ids that contain a colon so the path stays valid', () => {
    expect(practiceAttemptDetailHref('reading:001')).toBe('/practice/history/reading%3A001');
  });

  it('encodes slashes and spaces rather than splitting the path segment', () => {
    expect(practiceAttemptDetailHref('a/b c')).toBe('/practice/history/a%2Fb%20c');
  });

  it('round-trips the raw id through decodeURIComponent of the last segment', () => {
    const id = 'user-42:unit/7 draft';
    const href = practiceAttemptDetailHref(id);
    const lastSegment = href.slice(`${PRACTICE_HISTORY_HREF}/`.length);
    expect(decodeURIComponent(lastSegment)).toBe(id);
  });
});
