export function formatDate(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
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
