export const ATS_ACTIVITY_REFRESH_EVENT = 'ats:activity-refresh';

export function emitActivityRefresh(detail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(ATS_ACTIVITY_REFRESH_EVENT, {
      detail: {
        timestamp: Date.now(),
        ...detail,
      },
    })
  );
}
