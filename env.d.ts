interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare interface SyncManager {
  register(tag: string): Promise<void>;
}

declare interface ServiceWorkerRegistration {
  readonly sync?: SyncManager;
}

declare interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}
