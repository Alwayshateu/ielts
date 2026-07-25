export const PRACTICE_SESSIONS_HREF = '/practice/sessions';
export const PRACTICE_HISTORY_HREF = '/practice/history';
export const READING_SESSION_PREVIEW_HREF = '/practice/session/reading-progressive-urban-green-roofs-001';

/** Detail page for one recorded attempt. Ids can contain ':' so they must be encoded. */
export function practiceAttemptDetailHref(attemptId: string) {
  return `${PRACTICE_HISTORY_HREF}/${encodeURIComponent(attemptId)}`;
}
