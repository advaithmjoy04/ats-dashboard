export function formatDate(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatPercent(part, total) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export function getInitials(name) {
  if (!name) {
    return 'AT';
  }

  return name
    .split(' ')
    .map((value) => value[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
