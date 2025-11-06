import type { Language } from '../LanguageContext';

export type HelpCategoryId =
  | 'getting-started'
  | 'automation'
  | 'analytics'
  | 'collaboration'
  | 'help-center';

export interface HelpCategory {
  id: HelpCategoryId;
  title: string;
  description: string;
  icon?: string;
  keywords?: string[];
}

export interface HelpArticle {
  id: string;
  categoryId: HelpCategoryId;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
  relatedArticleIds?: string[];
  lastUpdated: string;
  estimatedReadingMinutes: number;
  popularityScore?: number;
}

export interface HelpFaqEntry {
  id: string;
  categoryId: HelpCategoryId;
  question: string;
  answer: string;
  tags: string[];
}

export interface HelpLocaleContent {
  locale: Language;
  categories: HelpCategory[];
  articles: HelpArticle[];
  faqs: HelpFaqEntry[];
  suggestedArticleIds?: string[];
}

export interface ArticleSearchResult extends HelpArticle {
  score: number;
}

export interface ArticleSearchOptions {
  categoryId?: HelpCategoryId | 'all';
  limit?: number;
  minScore?: number;
}

export interface SuggestedArticleOptions {
  limit?: number;
  includeCategories?: HelpCategoryId[];
}

export interface HelpContentAPI {
  getCategories: (language: Language) => HelpCategory[];
  getArticles: (language: Language, options?: ArticleSearchOptions) => HelpArticle[];
  getFaqs: (language: Language, categoryId?: HelpCategoryId | 'all') => HelpFaqEntry[];
  getArticleById: (language: Language, articleId: string) => HelpArticle | undefined;
  searchArticles: (language: Language, query: string, options?: ArticleSearchOptions) => ArticleSearchResult[];
  getSuggestedArticles: (language: Language, options?: SuggestedArticleOptions) => HelpArticle[];
}
