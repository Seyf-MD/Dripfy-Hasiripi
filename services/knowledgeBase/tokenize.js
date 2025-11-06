const DEFAULT_STOPWORDS = new Set([
  've', 'veya', 'ile', 'ama', 'ancak', 'fakat', 'hem', 'de', 'da', 'ki', 'bu', 'şu', 'o', 'bir',
  'the', 'and', 'for', 'with', 'but', 'are', 'is', 'was', 'were', 'to', 'of', 'in', 'on', 'at',
  'from', 'that', 'this', 'these', 'those', 'as', 'by', 'it', 'be', 'or', 'an', 'a', 'we', 'you',
  'they', 'he', 'she', 'them', 'our', 'your', 'their', 'çok', 'daha', 'gibi', 'icin', 'için',
  'üzerine', 'olarak', 'her', 'herkes', 'herhangi', 'hangi', 'neden', 'ne', 'nasıl', 'şimdi',
  'zaten', 'var', 'yok', 'birkaç', 'bazen', 'çünkü', 'nedenle', 'yani', 'içinde', 'dahil', 'halen',
]);

function normaliseToken(token) {
  return token
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i');
}

export function tokenize(text, { stopwords = DEFAULT_STOPWORDS, minLength = 2 } = {}) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const tokens = [];
  let current = '';
  const lower = text.toLowerCase();

  for (let index = 0; index < lower.length; index += 1) {
    const char = lower[index];
    if (/[a-z0-9ğüşöçıâîû%-]/i.test(char)) {
      current += char;
      continue;
    }

    if (current) {
      const normalised = normaliseToken(current);
      if (normalised.length >= minLength && !stopwords.has(normalised)) {
        tokens.push(normalised);
      }
      current = '';
    }
  }

  if (current) {
    const normalised = normaliseToken(current);
    if (normalised.length >= minLength && !stopwords.has(normalised)) {
      tokens.push(normalised);
    }
  }

  return tokens;
}

export function createTokenizer(customStopwords) {
  const mergedStopwords = new Set(DEFAULT_STOPWORDS);
  if (Array.isArray(customStopwords)) {
    customStopwords.forEach((word) => {
      if (typeof word === 'string' && word.trim()) {
        mergedStopwords.add(word.trim().toLowerCase());
      }
    });
  }
  return (text, options = {}) => tokenize(text, { ...options, stopwords: mergedStopwords });
}

export default tokenize;
