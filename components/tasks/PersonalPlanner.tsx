import * as React from 'react';
import { Calendar as CalendarIcon, Clock, Plus, RefreshCcw, Bell, Link2, AlertTriangle } from 'lucide-react';
import type {
  Task,
  CalendarIntegrationAccount,
  PlannerCalendarEvent,
  TaskReminder,
  PlannerSyncStatus,
} from '../../types';
import {
  fetchPersonalTasks,
  createPersonalTask,
  updatePersonalTask,
  syncPersonalTask,
  type PersonalTaskInput,
} from '../../services/tasks';
import {
  fetchIntegrationAccounts,
  triggerIntegrationSync,
  fetchPlannerEvents,
} from '../../services/integrations';
import {
  fetchPlanningSyncStatus,
  syncPlanningCalendar,
  syncPlanningTasks,
} from '../../services/planning/sync';

interface PersonalPlannerProps {
  userId: string | null;
  timezone?: string | null;
}

const HOURS = Array.from({ length: 11 }, (_value, index) => index + 8); // 08:00 - 18:00

function getWeekStart(date: Date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  clone.setDate(clone.getDate() + diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function toIsoString(date: Date) {
  return date.toISOString();
}

function normaliseReminders(reminders: TaskReminder[] | undefined) {
  return (reminders || []).map((reminder) => ({
    id: reminder.id,
    type: reminder.type,
    minutesBefore: reminder.minutesBefore,
    scheduledAt: reminder.scheduledAt ?? null,
    createdAt: reminder.createdAt,
  }));
}

const PersonalPlanner: React.FC<PersonalPlannerProps> = ({ userId, timezone }) => {
  const resolvedTimezone = React.useMemo(() => {
    if (timezone) {
      return timezone;
    }
    if (typeof Intl !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return 'UTC';
  }, [timezone]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [integrations, setIntegrations] = React.useState<CalendarIntegrationAccount[]>([]);
  const [plannerEvents, setPlannerEvents] = React.useState<PlannerCalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [plannerError, setPlannerError] = React.useState<string | null>(null);
  const [plannerInfo, setPlannerInfo] = React.useState<string | null>(null);
  const [plannerStatus, setPlannerStatus] = React.useState<PlannerSyncStatus | null>(null);
  const [formState, setFormState] = React.useState<PersonalTaskInput & { reminderMinutes: number }>({
    title: '',
    priority: 'Medium',
    dueDate: '',
    personalNotes: '',
    focusTags: [],
    reminderMinutes: 30,
  });
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [creating, setCreating] = React.useState(false);
  const [syncingTaskId, setSyncingTaskId] = React.useState<string | null>(null);
  const [syncingIntegrationId, setSyncingIntegrationId] = React.useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [calendarSyncing, setCalendarSyncing] = React.useState(false);
  const [taskPlanningSyncing, setTaskPlanningSyncing] = React.useState(false);

  const currentWeekStart = React.useMemo(() => {
    const reference = new Date();
    reference.setDate(reference.getDate() + weekOffset * 7);
    return getWeekStart(reference);
  }, [weekOffset]);

  const currentWeekEnd = React.useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [currentWeekStart]);

  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_value, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return date;
    });
  }, [currentWeekStart]);

  const loadPlannerEvents = React.useCallback(async () => {
    try {
      const events = await fetchPlannerEvents({
        start: toIsoString(currentWeekStart),
        end: toIsoString(currentWeekEnd),
      });
      setPlannerEvents(events);
      setPlannerError(null);
    } catch (eventError) {
      console.error('[PersonalPlanner] planner events failed', eventError);
      setPlannerError('Takvim verileri yüklenemedi.');
    }
  }, [currentWeekStart, currentWeekEnd]);

  const refreshPlannerStatus = React.useCallback(async () => {
    try {
      const status = await fetchPlanningSyncStatus();
      setPlannerStatus(status);
    } catch (statusError) {
      console.warn('[PersonalPlanner] sync status fetch failed', statusError);
    }
  }, []);

  const loadData = React.useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setIntegrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [personalTasks, accounts] = await Promise.all([
        fetchPersonalTasks(),
        fetchIntegrationAccounts().catch((integrationError) => {
          console.warn('[PersonalPlanner] integration fetch failed', integrationError);
          return [] as CalendarIntegrationAccount[];
        }),
      ]);
      setTasks(personalTasks);
      setIntegrations(accounts);
      await loadPlannerEvents();
      await refreshPlannerStatus();
    } catch (loadError) {
      console.error('[PersonalPlanner] initial load failed', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Veriler alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [userId, loadPlannerEvents, refreshPlannerStatus]);

  React.useEffect(() => {
    loadData().catch((loadError) => {
      console.error('[PersonalPlanner] load effect failed', loadError);
    });
  }, [loadData]);

  React.useEffect(() => {
    loadPlannerEvents().catch((eventError) => {
      console.error('[PersonalPlanner] planner events refresh failed', eventError);
    });
  }, [loadPlannerEvents]);

  const unscheduledTasks = React.useMemo(() => {
    return tasks.filter((task) => !task.personalization?.schedule?.start);
  }, [tasks]);

  const scheduledByDay = React.useMemo(() => {
    const map = new Map<string, (Task | PlannerCalendarEvent)[]>();
    tasks.forEach((task) => {
      const start = task.personalization?.schedule?.start || task.dueDate;
      if (!start) {
        return;
      }
      const key = start.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    plannerEvents
      .filter((event) => !event.taskId)
      .forEach((event) => {
        if (!event.start) {
          return;
        }
        const key = event.start.slice(0, 10);
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      });
    return map;
  }, [tasks, plannerEvents]);

  const handleFormChange = (field: keyof typeof formState, value: unknown) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title || creating) {
      return;
    }
    setCreating(true);
    try {
      const payload: PersonalTaskInput = {
        title: formState.title,
        description: formState.description,
        priority: formState.priority,
        dueDate: formState.dueDate || undefined,
        personalNotes: formState.personalNotes,
        focusTags: formState.focusTags,
        reminders:
          formState.reminderMinutes > 0
            ? [
                {
                  type: 'popup',
                  minutesBefore: formState.reminderMinutes,
                },
              ]
            : [],
      };
      const created = await createPersonalTask(payload);
      setTasks((prev) => [created, ...prev]);
      setFormState({
        title: '',
        priority: 'Medium',
        dueDate: '',
        personalNotes: '',
        focusTags: [],
        reminderMinutes: 30,
      });
      setError(null);
    } catch (createError) {
      console.error('[PersonalPlanner] task create failed', createError);
      setError(createError instanceof Error ? createError.message : 'Görev oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const updateTaskSchedule = async (task: Task, start: Date, end: Date) => {
    try {
      const updated = await updatePersonalTask(
        task.id,
        {
          schedule: {
            start: toIsoString(start),
            end: toIsoString(end),
            allDay: false,
            timezone: resolvedTimezone,
          },
        },
        task.version,
      );
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setPlannerError(null);
      await loadPlannerEvents();
    } catch (updateError) {
      console.error('[PersonalPlanner] schedule update failed', updateError);
      setPlannerError(updateError instanceof Error ? updateError.message : 'Planlama başarısız.');
    }
  };

  const handleDropOnSlot = async (event: React.DragEvent<HTMLDivElement>, day: Date, hour: number) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) {
      return;
    }
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    await updateTaskSchedule(task, start, end);
    setDraggedTaskId(null);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleAllowDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleAddReminder = async (task: Task, minutesBefore: number) => {
    try {
      const reminders = [
        ...normaliseReminders(task.reminders),
        { type: 'popup', minutesBefore, createdAt: new Date().toISOString(), scheduledAt: null },
      ];
      const updated = await updatePersonalTask(
        task.id,
        { reminders },
        task.version,
      );
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (reminderError) {
      console.error('[PersonalPlanner] add reminder failed', reminderError);
      setError(reminderError instanceof Error ? reminderError.message : 'Hatırlatıcı eklenemedi.');
    }
  };

  const handleSyncTask = async (task: Task) => {
    try {
      setSyncingTaskId(task.id);
      await syncPersonalTask(task.id);
      await loadPlannerEvents();
      setError(null);
    } catch (syncError) {
      console.error('[PersonalPlanner] task sync failed', syncError);
      setError(syncError instanceof Error ? syncError.message : 'Senkronizasyon başlatılamadı.');
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
    try {
      setSyncingIntegrationId(integrationId);
      await triggerIntegrationSync(integrationId);
      await Promise.all([loadData(), loadPlannerEvents()]);
      setError(null);
    } catch (syncError) {
      console.error('[PersonalPlanner] integration sync failed', syncError);
      setError(syncError instanceof Error ? syncError.message : 'Senkronizasyon başlatılamadı.');
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const handlePlannerCalendarSync = async () => {
    try {
      setCalendarSyncing(true);
      setPlannerError(null);
      setPlannerInfo(null);
      const summary = await syncPlanningCalendar({
        range: { start: toIsoString(currentWeekStart), end: toIsoString(currentWeekEnd) },
        includePersonalCalendar: true,
      });
      const warnings = summary.warnings?.length ? ` Uyarılar: ${summary.warnings.join(' · ')}` : '';
      setPlannerInfo(`Planlama takvimi ${summary.syncedEvents} etkinlik ile güncellendi.${warnings}`);
      await loadPlannerEvents();
      await refreshPlannerStatus();
    } catch (calendarError) {
      console.error('[PersonalPlanner] planning calendar sync failed', calendarError);
      setPlannerError(calendarError instanceof Error ? calendarError.message : 'Planlama takvimi senkronize edilemedi.');
    } finally {
      setCalendarSyncing(false);
    }
  };

  const handlePlannerTaskSync = async () => {
    try {
      setTaskPlanningSyncing(true);
      setPlannerInfo(null);
      const summary = await syncPlanningTasks({ assignMissingTasks: true, autoCreatePlaceholders: true });
      const warnings = summary.warnings?.length ? ` Uyarılar: ${summary.warnings.join(' · ')}` : '';
      setPlannerInfo(`Görev planlaması ${summary.syncedTasks} kayıt ile eşitlendi.${warnings}`);
      await loadData();
      await refreshPlannerStatus();
      setPlannerError(null);
    } catch (taskSyncError) {
      console.error('[PersonalPlanner] planning task sync failed', taskSyncError);
      setPlannerError(taskSyncError instanceof Error ? taskSyncError.message : 'Görev planlaması senkronize edilemedi.');
    } finally {
      setTaskPlanningSyncing(false);
    }
  };

  if (!userId) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Kişisel Planlayıcı</h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
          Kişisel görev planlama özelliğini kullanmak için lütfen giriş yapın.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Kişisel Planlayıcı</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Haftalık takvim görünümünde kişisel görevlerinizi planlayın ve bağlı takvim hesaplarıyla senkronize edin.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Önceki Hafta
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Sonraki Hafta
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlannerCalendarSync}
              disabled={calendarSyncing}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
            >
              <RefreshCcw size={16} />
              {calendarSyncing ? 'Senkronize ediliyor…' : 'Planlama Takvimi'}
            </button>
            <button
              type="button"
              onClick={handlePlannerTaskSync}
              disabled={taskPlanningSyncing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              <Link2 size={16} />
              {taskPlanningSyncing ? 'Görevler eşitleniyor…' : 'Görevleri Eşitle'}
            </button>
          </div>
        </div>
      </header>

      {plannerInfo && (
        <div className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-200">
          <span>{plannerInfo}</span>
          {(plannerStatus?.lastSyncedAt || plannerStatus?.nextSyncAt || typeof plannerStatus?.pendingItems === 'number') && (
            <div className="flex flex-wrap gap-3 text-xs text-emerald-600/80 dark:text-emerald-200/80">
              {plannerStatus?.lastSyncedAt && (
                <span>Son senkron: {new Date(plannerStatus.lastSyncedAt).toLocaleString()}</span>
              )}
              {plannerStatus?.nextSyncAt && (
                <span>Sıradaki senkron: {new Date(plannerStatus.nextSyncAt).toLocaleString()}</span>
              )}
              {typeof plannerStatus?.pendingItems === 'number' && plannerStatus.pendingItems > 0 && (
                <span>Bekleyen {plannerStatus.pendingItems} öğe</span>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <form
            onSubmit={handleCreateTask}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-neutral-200">
              <Plus size={16} />
              Yeni Görev
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                  Başlık
                </label>
                <input
                  required
                  value={formState.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Örn. Haftalık raporu hazırla"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    Öncelik
                  </label>
                  <select
                    value={formState.priority}
                    onChange={(event) => handleFormChange('priority', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="High">Yüksek</option>
                    <option value="Medium">Orta</option>
                    <option value="Low">Düşük</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    Son Tarih
                  </label>
                  <input
                    type="datetime-local"
                    value={formState.dueDate}
                    onChange={(event) => handleFormChange('dueDate', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                  Notlar
                </label>
                <textarea
                  value={formState.personalNotes}
                  onChange={(event) => handleFormChange('personalNotes', event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Görevin bağlamını ekleyin"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                  Hatırlatıcı (dakika)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formState.reminderMinutes}
                  onChange={(event) => handleFormChange('reminderMinutes', Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-75"
            >
              <Plus size={16} />
              {creating ? 'Kaydediliyor…' : 'Görev Oluştur'}
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-neutral-200">
              <Bell size={16} />
              Bekleyen Görevler
            </div>
            <div className="mt-4 space-y-3">
              {unscheduledTasks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                  Planlanmayı bekleyen görev bulunmuyor.
                </p>
              )}
              {unscheduledTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, task.id)}
                  className="cursor-grab rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm transition hover:bg-slate-100 active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <div className="font-semibold text-slate-800 dark:text-white">{task.title}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                    {task.priority} • {task.status}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
                    <button
                      type="button"
                      onClick={() => handleAddReminder(task, 30)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 transition hover:bg-slate-100 dark:border-neutral-700 dark:hover:bg-neutral-700"
                    >
                      <Bell size={14} /> +30 dk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncTask(task)}
                      disabled={syncingTaskId === task.id}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 transition hover:bg-slate-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-700"
                    >
                      <RefreshCcw size={14} />
                      {syncingTaskId === task.id ? 'Senkronize ediliyor…' : 'Senkronize et'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-neutral-200">
              <Link2 size={16} />
              Bağlı Hesaplar
            </div>
            <div className="mt-4 space-y-4">
              {integrations.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                  Bağlı takvim hesabı bulunamadı. Ayarlar &gt; Entegrasyonlar sekmesinden hesap bağlayabilirsiniz.
                </p>
              )}
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {integration.provider === 'google' ? 'Google Takvim' : 'Outlook Takvim'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400">{integration.accountEmail}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSyncIntegration(integration.id)}
                      disabled={syncingIntegrationId === integration.id}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-medium transition hover:bg-slate-100 disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-700"
                    >
                      <RefreshCcw size={14} />
                      {syncingIntegrationId === integration.id ? 'Senkronize…' : 'Senkronize et'}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
                    Otomatik Senkronizasyon: {integration.preferences.autoSync ? 'Açık' : 'Kapalı'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-neutral-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-neutral-200">
                <CalendarIcon size={16} />
                Haftalık Takvim
              </div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">
                {formatDateLabel(weekDays[0])} – {formatDateLabel(weekDays[6])}
              </div>
            </div>
            {plannerError && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/40 dark:text-amber-200">
                <AlertTriangle size={14} />
                {plannerError}
              </div>
            )}
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <div className="px-4 py-2">Saat</div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="px-4 py-2 text-center">
                      {formatDateLabel(day)}
                    </div>
                  ))}
                </div>
                {HOURS.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0 dark:border-neutral-800">
                    <div className="border-r border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {`${hour.toString().padStart(2, '0')}:00`}
                      </div>
                    </div>
                    {weekDays.map((day) => {
                      const key = day.toISOString().slice(0, 10);
                      const items = scheduledByDay.get(key) || [];
                      const scheduledTasks = items.filter((item) => {
                        const start = 'personalization' in item
                          ? item.personalization?.schedule?.start
                          : item.start;
                        if (!start) {
                          return false;
                        }
                        const startDate = new Date(start);
                        return startDate.getHours() === hour;
                      });
                      return (
                        <div
                          key={`${key}-${hour}`}
                          onDragOver={handleAllowDrop}
                          onDrop={(event) => handleDropOnSlot(event, day, hour)}
                          className="min-h-[72px] border-r border-slate-100 px-3 py-2 text-xs transition last:border-r-0 hover:bg-emerald-50/40 dark:border-neutral-800 dark:hover:bg-emerald-500/10"
                        >
                          {scheduledTasks.map((item) => {
                            if ('personalization' in item) {
                              const start = item.personalization?.schedule?.start
                                ? new Date(item.personalization.schedule.start)
                                : new Date(item.dueDate);
                              const end = item.personalization?.schedule?.end
                                ? new Date(item.personalization.schedule.end)
                                : null;
                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(event) => handleDragStart(event, item.id)}
                                  className="mb-2 rounded-lg border border-emerald-200 bg-emerald-500/10 p-2 text-slate-700 shadow-sm last:mb-0 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100"
                                >
                                  <div className="font-semibold">{item.title}</div>
                                  <div className="text-[11px] text-slate-600 dark:text-emerald-200/80">
                                    {start ? formatTimeLabel(start) : ''}
                                    {end ? ` – ${formatTimeLabel(end)}` : ''}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-emerald-200/70">
                                    <span>{item.priority}</span>
                                    <span>{item.status}</span>
                                  </div>
                                </div>
                              );
                            }
                            const start = item.start ? new Date(item.start) : null;
                            const end = item.end ? new Date(item.end) : null;
                            return (
                              <div
                                key={item.id}
                                className="mb-2 rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-600 last:mb-0 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                              >
                                <div className="font-medium">{item.title}</div>
                                <div className="text-[11px]">
                                  {start ? formatTimeLabel(start) : ''}
                                  {end ? ` – ${formatTimeLabel(end)}` : ''}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {loading && (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-neutral-400">
                Takvim yükleniyor…
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PersonalPlanner;
