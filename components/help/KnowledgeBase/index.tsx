import * as React from 'react';
import { BookOpen, Compass, LifeBuoy, Search, Sparkles, ThumbsUp } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  getHelpCategories,
  getHelpArticles,
  getHelpFaqs,
  searchHelpArticles,
  getSuggestedArticles,
  getArticleById,
} from '../../../i18n/help';
import type { ArticleSearchResult, HelpArticle, HelpCategory, HelpFaqEntry, HelpCategoryId } from '../../../i18n/help/types';
import { useTour } from '../../../context/TourContext';

const cardBaseClass =
  'rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 shadow-sm dark:shadow-none';

const badgeClass =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium';

function getCategoryIcon(id: HelpCategoryId): React.ReactNode {
  switch (id) {
    case 'automation':
      return <Sparkles size={14} />;
    case 'analytics':
      return <BookOpen size={14} />;
    case 'collaboration':
      return <ThumbsUp size={14} />;
    case 'help-center':
      return <LifeBuoy size={14} />;
    case 'getting-started':
    default:
      return <Compass size={14} />;
  }
}

const KnowledgeBase: React.FC = () => {
  const { language, t } = useLanguage();
  const { startTour, isTourRunning } = useTour();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<HelpCategoryId | 'all'>('all');
  const [feedback, setFeedback] = React.useState({ articleId: '', sentiment: 'positive', comment: '' });
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
  const feedbackTimeoutRef = React.useRef<number | null>(null);

  const categories = React.useMemo<HelpCategory[]>(() => getHelpCategories(language), [language]);

  const searchResults = React.useMemo<ArticleSearchResult[]>(
    () =>
      searchHelpArticles(language, searchTerm, {
        categoryId: selectedCategory,
        limit: 6,
      }),
    [language, searchTerm, selectedCategory],
  );

  const suggestedArticles = React.useMemo<HelpArticle[]>(
    () =>
      getSuggestedArticles(language, {
        includeCategories: selectedCategory === 'all' ? undefined : [selectedCategory],
        limit: 3,
      }),
    [language, selectedCategory],
  );

  const categoryFaqs = React.useMemo<HelpFaqEntry[]>(
    () => getHelpFaqs(language, selectedCategory),
    [language, selectedCategory],
  );

  const categoryArticles = React.useMemo<HelpArticle[]>(
    () => getHelpArticles(language, { categoryId: selectedCategory }),
    [language, selectedCategory],
  );

  const isSearching = searchTerm.trim().length > 0;
  const activeArticles = isSearching ? searchResults : suggestedArticles;

  const handleCategoryChange = React.useCallback((category: HelpCategoryId | 'all') => {
    setSelectedCategory(category);
  }, []);

  const handleSubmitFeedback = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();
      setFeedbackSubmitted(true);
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedbackSubmitted(false);
        feedbackTimeoutRef.current = null;
      }, 3200);
    },
    [],
  );

  const handleResetFeedback = React.useCallback(() => {
    setFeedback({ articleId: '', sentiment: 'positive', comment: '' });
    setFeedbackSubmitted(false);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const handleStartTour = React.useCallback(() => {
    startTour('help-center');
  }, [startTour]);

  React.useEffect(() => {
    const handler: EventListener = (event) => {
      const detail = (event as CustomEvent<{ articleId?: string }>).detail;
      if (!detail?.articleId) {
        return;
      }
      const article = getArticleById(language, detail.articleId);
      if (!article) {
        return;
      }
      setSelectedCategory(article.categoryId);
      setSearchTerm(article.title);
      setFeedback((prev) => ({ ...prev, articleId: article.id }));
    };
    window.addEventListener('help-center:focus-article', handler);
    return () => {
      window.removeEventListener('help-center:focus-article', handler);
    };
  }, [language]);

  React.useEffect(() => {
    if (!feedback.articleId) {
      return;
    }

    const articleExists = categoryArticles.some((article) => article.id === feedback.articleId);
    if (!articleExists) {
      setFeedback((prev) => ({ ...prev, articleId: '' }));
    }
  }, [categoryArticles, feedback.articleId]);

  React.useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="space-y-8" data-tour-step="help-center.root">
      <div className={`${cardBaseClass} p-6 relative overflow-hidden`} data-tour-step="help-center.hero">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-[var(--drip-primary)]/10 rounded-full blur-2xl"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <span className={`${badgeClass} bg-white dark:bg-neutral-900/80 text-[var(--drip-primary)]`}>{t('help.hero.badge')}</span>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--drip-text)] dark:text-white">
              {t('help.hero.title')}
            </h1>
            <p className="text-sm sm:text-base text-[var(--drip-muted)] dark:text-neutral-300 max-w-2xl">
              {t('help.hero.subtitle')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleStartTour}
              disabled={isTourRunning}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--drip-primary)] text-white px-5 py-2 text-sm font-semibold shadow-lg shadow-[rgba(75,165,134,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={16} />
              {t('help.hero.startTour')}
            </button>
            <div className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 text-center sm:text-left">
              {t('help.hero.tourHint')}
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardBaseClass} p-6`} data-tour-step="help-center.search">
        <label htmlFor="knowledge-base-search" className="sr-only">
          {t('help.search.label')}
        </label>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--drip-muted)]" />
            <input
              id="knowledge-base-search"
              data-tour-target="knowledge-base-search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('help.search.placeholder')}
              className="w-full rounded-full border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
            />
          </div>
          <div className="flex flex-wrap gap-2" data-tour-target="knowledge-base-category-filter">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`${badgeClass} ${
                selectedCategory === 'all'
                  ? 'bg-[var(--drip-primary)] text-white border-[var(--drip-primary)]'
                  : 'bg-white dark:bg-neutral-900 text-[var(--drip-muted)] dark:text-neutral-300'
              }`}
            >
              {t('help.categories.all')}
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`${badgeClass} ${
                  selectedCategory === category.id
                    ? 'bg-[var(--drip-primary)] text-white border-[var(--drip-primary)]'
                    : 'bg-white dark:bg-neutral-900 text-[var(--drip-muted)] dark:text-neutral-300'
                }`}
              >
                {getCategoryIcon(category.id as HelpCategoryId)}
                {category.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6" data-tour-step="help-center.results">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">
              {isSearching ? t('help.results.title') : t('help.suggested.title')}
            </h2>
            <span className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
              {isSearching
                ? t('help.results.count', { count: searchResults.length })
                : t('help.suggested.count', { count: suggestedArticles.length })}
            </span>
          </div>

          {activeArticles.length === 0 && (
            <div className={`${cardBaseClass} p-6 text-sm text-[var(--drip-muted)] dark:text-neutral-300 text-center`}> 
              {t('help.results.empty')}
            </div>
          )}

          <div className="space-y-4">
            {activeArticles.map((article) => (
              <article key={article.id} className={`${cardBaseClass} p-5 hover:border-[var(--drip-primary)] transition border`}
                data-tour-target="knowledge-base-article-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                      {getCategoryIcon(article.categoryId)}
                      <span>{categories.find((category) => category.id === article.categoryId)?.title}</span>
                      <span aria-hidden="true">•</span>
                      <span>{t('help.article.readTime', { minutes: article.estimatedReadingMinutes })}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--drip-text)] dark:text-white">{article.title}</h3>
                    <p className="mt-2 text-sm text-[var(--drip-muted)] dark:text-neutral-300 whitespace-pre-line">
                      {article.summary}
                    </p>
                    {'score' in article && (
                      <div className="mt-3 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                        {t('help.article.relevance', { score: Math.round((article as ArticleSearchResult).score) })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-[var(--drip-primary)] hover:underline"
                  >
                    {t('help.article.open')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-6" data-tour-step="help-center.sidebar">
          <div className={`${cardBaseClass} p-5 space-y-3`}>
            <h3 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">
              {t('help.sidebar.faqTitle')}
            </h3>
            <ul className="space-y-3 text-sm text-[var(--drip-muted)] dark:text-neutral-300">
              {categoryFaqs.map((faq) => (
                <li key={faq.id} className="border-b border-slate-200/60 dark:border-neutral-700/60 pb-2 last:border-none last:pb-0">
                  <p className="font-medium text-[var(--drip-text)] dark:text-white">{faq.question}</p>
                  <p className="mt-1 text-xs whitespace-pre-line">{faq.answer}</p>
                </li>
              ))}
              {categoryFaqs.length === 0 && (
                <li className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                  {t('help.sidebar.noFaqs')}
                </li>
              )}
            </ul>
          </div>

          <div className={`${cardBaseClass} p-5 space-y-4`} data-tour-step="help-center.feedback">
            <div>
              <h3 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">
                {t('help.feedback.title')}
              </h3>
              <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                {t('help.feedback.subtitle')}
              </p>
            </div>
            <form className="space-y-3" onSubmit={handleSubmitFeedback} onReset={handleResetFeedback}>
              <div className="space-y-1">
                <label htmlFor="knowledge-feedback-article" className="text-xs font-medium text-[var(--drip-muted)] dark:text-neutral-300">
                  {t('help.feedback.articleLabel')}
                </label>
                <select
                  id="knowledge-feedback-article"
                  value={feedback.articleId}
                  onChange={(event) => setFeedback((prev) => ({ ...prev, articleId: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                >
                  <option value="">{t('help.feedback.articlePlaceholder')}</option>
                  {categoryArticles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="knowledge-feedback-sentiment" className="text-xs font-medium text-[var(--drip-muted)] dark:text-neutral-300">
                  {t('help.feedback.sentimentLabel')}
                </label>
                <select
                  id="knowledge-feedback-sentiment"
                  value={feedback.sentiment}
                  onChange={(event) => setFeedback((prev) => ({ ...prev, sentiment: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                >
                  <option value="positive">{t('help.feedback.sentiments.positive')}</option>
                  <option value="neutral">{t('help.feedback.sentiments.neutral')}</option>
                  <option value="negative">{t('help.feedback.sentiments.negative')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="knowledge-feedback-comment" className="text-xs font-medium text-[var(--drip-muted)] dark:text-neutral-300">
                  {t('help.feedback.commentLabel')}
                </label>
                <textarea
                  id="knowledge-feedback-comment"
                  value={feedback.comment}
                  onChange={(event) => setFeedback((prev) => ({ ...prev, comment: event.target.value }))}
                  placeholder={t('help.feedback.commentPlaceholder')}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                  <LifeBuoy size={14} />
                  <span>{t('help.feedback.supportHint')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="reset"
                    className="rounded-full border border-slate-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-[var(--drip-muted)] hover:text-[var(--drip-primary)]"
                  >
                    {t('help.feedback.reset')}
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--drip-primary)] px-4 py-1 text-xs font-semibold text-white shadow-sm"
                  >
                    {t('help.feedback.submit')}
                  </button>
                </div>
              </div>

              {feedbackSubmitted && (
                <div className="rounded-lg bg-[var(--drip-primary)]/10 text-[var(--drip-primary)] px-3 py-2 text-xs font-medium">
                  {t('help.feedback.thankYou')}
                </div>
              )}
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default KnowledgeBase;
