import type { UserRole } from '../../types';

export type TourId = 'dashboard-overview' | 'help-center';
export type TourPageId = 'dashboard' | 'help-center';
export type TourStepPlacement = 'top' | 'bottom' | 'left' | 'right' | 'over';

export interface TourStep {
  target: string;
  content: string;
  title?: string;
  placement?: TourStepPlacement;
}

export interface TourDefinition {
  id: TourId;
  pageId: TourPageId;
  title: string;
  description: string;
  steps: TourStep[];
  autoStartRoles?: UserRole[];
  order?: number;
}

const tourDefinitions: TourDefinition[] = [
  {
    id: 'dashboard-overview',
    pageId: 'dashboard',
    title: 'Dashboard overview',
    description: 'Show the main metrics, navigation and assistant.',
    autoStartRoles: ['viewer', 'user', 'manager'],
    order: 1,
    steps: [
      {
        target: '[data-tour-target="dashboard-stat-cards"]',
        placement: 'bottom',
        title: 'Live KPIs',
        content:
          'Follow your meetings, revenue and task completion from these live KPI cards. Click any tile for quick access.',
      },
      {
        target: '[data-tour-target="dashboard-tab-navigation"]',
        placement: 'bottom',
        title: 'Workspace tabs',
        content:
          'Use the workspace tabs to switch between calendar, financials, approvals and the help center.',
      },
      {
        target: '[data-tour-target="dashboard-chatbot-toggle"]',
        placement: 'left',
        title: 'Ask for help',
        content:
          'Need support? Open the assistant to trigger automations, ask questions or jump into recommended articles.',
      },
    ],
  },
  {
    id: 'help-center',
    pageId: 'help-center',
    title: 'Help center tour',
    description: 'Introduce search, categories and feedback.',
    autoStartRoles: ['viewer', 'user'],
    order: 1,
    steps: [
      {
        target: '[data-tour-step="help-center.hero"]',
        placement: 'bottom',
        title: 'Welcome',
        content:
          'Start a guided walkthrough any time or stay informed about new playbooks tailored to your role.',
      },
      {
        target: '[data-tour-target="knowledge-base-search-input"]',
        placement: 'bottom',
        title: 'Search the library',
        content:
          'Search the full help library in your current language. We highlight the best matching articles first.',
      },
      {
        target: '[data-tour-target="knowledge-base-category-filter"]',
        placement: 'bottom',
        title: 'Filter by topic',
        content:
          'Filter results by topic. Categories adapt per language so you always see relevant terminology.',
      },
      {
        target: '[data-tour-target="knowledge-base-article-card"]',
        placement: 'top',
        title: 'Article insights',
        content:
          'Each article summarises the key actions and links to related guidance. Relevance scores help you prioritise.',
      },
      {
        target: '[data-tour-step="help-center.feedback"]',
        placement: 'top',
        title: 'Share feedback',
        content:
          'Share feedback so we can tune article recommendations and guided tours for your team.',
      },
    ],
  },
];

export function getTourDefinition(id: TourId): TourDefinition | undefined {
  return tourDefinitions.find((tour) => tour.id === id);
}

export function getToursForPage(pageId: TourPageId): TourDefinition[] {
  return tourDefinitions.filter((tour) => tour.pageId === pageId);
}

export function getAutoStartToursForRole(role: UserRole | null | undefined): TourDefinition[] {
  if (!role) {
    return [];
  }
  return tourDefinitions
    .filter((tour) => !tour.autoStartRoles || tour.autoStartRoles.includes(role))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
