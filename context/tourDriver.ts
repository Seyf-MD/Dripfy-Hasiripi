export interface PopoverOptions {
  title?: string;
  description?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  showButtons?: Array<'previous' | 'next' | 'close'>;
  showProgress?: boolean;
}

export interface DriveStep {
  element?: string | HTMLElement | null;
  popover: PopoverOptions;
}

interface DriverOptions {
  steps: DriveStep[];
  showProgress?: boolean;
  allowClose?: boolean;
  overlayColor?: string;
  stagePadding?: number;
  popoverClass?: string;
  onHighlighted?: (step: DriveStep | null, stepIndex: number, meta: { driver: Driver }) => void;
  onDestroyed?: () => void;
}

export interface Driver {
  drive: () => void;
  destroy: () => void;
  getActiveIndex: () => number | null;
}

/**
 * Minimal fallback implementation inspired by driver.js.
 * It does not render fancy overlays but keeps the API surface our
 * TourContext relies on so that builds succeed even when the external
 * dependency is unavailable.
 */
export function createDriver(options: DriverOptions): Driver {
  let destroyed = false;
  let activeIndex: number | null = null;

  const notifyHighlight = (index: number) => {
    const step = options.steps[index] ?? null;
    options.onHighlighted?.(step, index, { driver: driverApi });

    if (step?.popover) {
      const { title, description } = step.popover;
      const headline = title ?? 'Guided tour';
      const body = description ?? '';

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(`${headline}${body ? `\n\n${body}` : ''}`);
      } else {
        console.info(`[tour] ${headline}${body ? ` - ${body}` : ''}`);
      }
    }
  };

  const driverApi: Driver = {
    drive: () => {
      if (destroyed) {
        return;
      }

      if (!options.steps.length) {
        driverApi.destroy();
        return;
      }

      const iterate = (index: number) => {
        if (destroyed) {
          return;
        }
        activeIndex = index;
        notifyHighlight(index);

        const nextIndex = index + 1;
        if (!destroyed && nextIndex < options.steps.length) {
          iterate(nextIndex);
        } else {
          driverApi.destroy();
        }
      };

      iterate(0);
    },
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      activeIndex = null;
      options.onDestroyed?.();
    },
    getActiveIndex: () => activeIndex,
  };

  return driverApi;
}

