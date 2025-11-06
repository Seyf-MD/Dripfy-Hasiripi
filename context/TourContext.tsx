import * as React from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tourStyles.css';
import { useAuth } from './AuthContext';
import { getTourDefinition, getAutoStartToursForRole } from '../services/onboardingTour';
import type { TourId, TourPageId, TourDefinition } from '../services/onboardingTour';

interface TourContextValue {
  activeTourId: TourId | null;
  isTourRunning: boolean;
  startTour: (tourId: TourId) => void;
  stopTour: () => void;
  registerPage: (pageId: TourPageId) => void;
}

const TourContext = React.createContext<TourContextValue | undefined>(undefined);

const STORAGE_PREFIX = 'dripfy.tours';

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeTourId, setActiveTourId] = React.useState<TourId | null>(null);
  const [isTourRunning, setIsTourRunning] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<TourPageId>('dashboard');
  const completionsRef = React.useRef<Set<TourId>>(new Set());
  const driverRef = React.useRef<Driver | null>(null);
  const activeTourIdRef = React.useRef<TourId | null>(null);

  const persistCompletions = React.useCallback(() => {
    if (!user) {
      return;
    }
    try {
      const key = getStorageKey(user.id);
      window.localStorage.setItem(key, JSON.stringify(Array.from(completionsRef.current)));
    } catch (error) {
      console.warn('[TourContext] Failed to persist completions', error);
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      completionsRef.current = new Set();
      return;
    }
    try {
      const key = getStorageKey(user.id);
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          completionsRef.current = new Set(parsed as TourId[]);
        }
      }
    } catch (error) {
      console.warn('[TourContext] Failed to restore completions', error);
      completionsRef.current = new Set();
    }
  }, [user]);

  const markTourCompleted = React.useCallback(
    (tourId: TourId) => {
      completionsRef.current.add(tourId);
      persistCompletions();
    },
    [persistCompletions],
  );

  const cleanupDriver = React.useCallback(() => {
    driverRef.current = null;
    setIsTourRunning(false);
    setActiveTourId(null);
    activeTourIdRef.current = null;
  }, []);

  const runDriver = React.useCallback(
    (definition: TourDefinition) => {
      const mappedSteps: DriveStep[] = definition.steps.map((step) => ({
        element: step.target,
        popover: {
          title: step.title ?? definition.title,
          description: step.content,
          side: step.placement ?? 'bottom',
          align: 'start',
          showButtons: ['previous', 'next', 'close'],
          showProgress: true,
        },
      }));

      const instance = driver({
        showProgress: true,
        allowClose: true,
        overlayColor: 'rgba(15, 23, 42, 0.55)',
        stagePadding: 6,
        popoverClass: 'dripfy-tour-popover',
        steps: mappedSteps,
        onHighlighted: (_, __, options) => {
          const index = options.driver.getActiveIndex();
          if (typeof index === 'number') {
            setIsTourRunning(true);
          }
        },
        onDestroyed: () => {
          const id = activeTourIdRef.current;
          if (id) {
            markTourCompleted(id);
          }
          cleanupDriver();
        },
      });

      driverRef.current = instance;
      activeTourIdRef.current = definition.id;
      instance.drive();
    },
    [cleanupDriver, markTourCompleted],
  );

  const startTour = React.useCallback(
    (tourId: TourId) => {
      const definition = getTourDefinition(tourId);
      if (!definition) {
        return;
      }

      if (driverRef.current) {
        driverRef.current.destroy();
      }

      setActiveTourId(tourId);
      setIsTourRunning(true);
      runDriver(definition);
    },
    [runDriver],
  );

  const stopTour = React.useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      return;
    }
    cleanupDriver();
  }, [cleanupDriver]);

  const registerPage = React.useCallback((pageId: TourPageId) => {
    setCurrentPage(pageId);
  }, []);

  React.useEffect(() => {
    if (!user || isTourRunning || !currentPage) {
      return;
    }

    const autoTours = getAutoStartToursForRole(user.role).filter(
      (tour) => tour.pageId === currentPage && !completionsRef.current.has(tour.id),
    );

    if (autoTours.length > 0) {
      startTour(autoTours[0].id);
    }
  }, [user, currentPage, isTourRunning, startTour]);

  React.useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, []);

  const contextValue = React.useMemo<TourContextValue>(
    () => ({
      activeTourId,
      isTourRunning,
      startTour,
      stopTour,
      registerPage,
    }),
    [activeTourId, isTourRunning, startTour, stopTour, registerPage],
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}
    </TourContext.Provider>
  );
};

export function useTour(): TourContextValue {
  const context = React.useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
