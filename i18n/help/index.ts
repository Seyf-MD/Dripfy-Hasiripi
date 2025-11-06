import { helpContentByLanguage } from './content';
import type { Language } from '../LanguageContext';
import type {
  ArticleSearchOptions,
  ArticleSearchResult,
  HelpArticle,
  HelpCategory,
  HelpContentAPI,
  HelpFaqEntry,
  HelpLocaleContent,
  HelpCategoryId,
  SuggestedArticleOptions,
} from './types';

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getContent(language: Language): HelpLocaleContent {
  return helpContentByLanguage[language] ?? helpContentByLanguage.en;
}

function filterByCategory<T extends { categoryId: HelpCategoryId }>(
  items: T[],
  categoryId?: HelpCategoryId | 'all',
): T[] {
  if (!categoryId || categoryId === 'all') {
    return items;
  }
  return items.filter((item) => item.categoryId === categoryId);
}

function sortByScore(results: ArticleSearchResult[]): ArticleSearchResult[] {
  return [...results].sort((a, b) => {
    if (b.score === a.score) {
      return (b.popularityScore ?? 0) - (a.popularityScore ?? 0);
    }
    return b.score - a.score;
  });
}

function createSearchResult(article: HelpArticle, score: number): ArticleSearchResult {
  return {
    ...article,
    score,
  };
}

function scoreArticle(article: HelpArticle, query: string): number {
  const target = normalise(query);
  if (!target) {
    return article.popularityScore ?? 0;
  }

  const haystack = [article.title, article.summary, article.content, article.keywords.join(' ')];
  const combined = normalise(haystack.join(' '));

  if (!combined.includes(target)) {
    return 0;
  }

  let score = 0;
  if (normalise(article.title).includes(target)) {
    score += 6;
  }
  if (normalise(article.summary).includes(target)) {
    score += 4;
  }
  if (article.keywords.some((keyword) => normalise(keyword).includes(target))) {
    score += 3;
  }
  const occurrences = combined.split(target).length - 1;
  score += Math.min(occurrences * 2, 8);
  score += (article.popularityScore ?? 0) / 25;
  return score;
}

function applyArticleLimit<T extends HelpArticle>(items: T[], limit?: number): T[] {
  if (typeof limit === 'number' && limit >= 0) {
    return items.slice(0, limit);
  }
  return items;
}

export function getHelpCategories(language: Language): HelpCategory[] {
  const content = getContent(language);
  return content.categories.map((category) => ({ ...category }));
}

export function getHelpArticles(language: Language, options: ArticleSearchOptions = {}): HelpArticle[] {
  const content = getContent(language);
  const filtered = filterByCategory(content.articles, options.categoryId);
  return applyArticleLimit(filtered, options.limit).map((article) => ({ ...article }));
}

export function getHelpFaqs(language: Language, categoryId: ArticleSearchOptions['categoryId'] = 'all'): HelpFaqEntry[] {
  const content = getContent(language);
  const filtered = filterByCategory(content.faqs, categoryId as HelpCategoryId | 'all');
  return filtered.map((faq) => ({ ...faq }));
}

export function getArticleById(language: Language, articleId: string): HelpArticle | undefined {
  const content = getContent(language);
  const match = content.articles.find((article) => article.id === articleId);
  return match ? { ...match } : undefined;
}

export function searchHelpArticles(
  language: Language,
  query: string,
  options: ArticleSearchOptions = {},
): ArticleSearchResult[] {
  const trimmed = query.trim();
  const content = getContent(language);
  const source = filterByCategory(content.articles, options.categoryId);

  if (!trimmed) {
    return applyArticleLimit(
      sortByScore(
        source.map((article) => createSearchResult(article, (article.popularityScore ?? 0) / 10)),
      ),
      options.limit,
    );
  }

  const results = source
    .map((article) => ({ article, score: scoreArticle(article, trimmed) }))
    .filter((item) => item.score >= (options.minScore ?? 1))
    .map((item) => createSearchResult(item.article, item.score));

  return applyArticleLimit(sortByScore(results), options.limit);
}

export function getSuggestedArticles(
  language: Language,
  options: SuggestedArticleOptions = {},
): HelpArticle[] {
  const content = getContent(language);
  const fallbackArticles = [...content.articles].sort(
    (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
  );

  const base = content.suggestedArticleIds
    ?.map((id) => content.articles.find((article) => article.id === id))
    .filter((article): article is HelpArticle => Boolean(article)) ?? fallbackArticles;

  const filtered = options.includeCategories && options.includeCategories.length
    ? base.filter((article) => options.includeCategories!.includes(article.categoryId))
    : base;

  return applyArticleLimit(filtered, options.limit).map((article) => ({ ...article }));
}

export const helpContentApi: HelpContentAPI = {
  getCategories: getHelpCategories,
  getArticles: getHelpArticles,
  getFaqs: getHelpFaqs,
  getArticleById,
  searchArticles: searchHelpArticles,
  getSuggestedArticles,
};

export default helpContentApi;
