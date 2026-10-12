export type NotifyVariant = 'success' | 'danger' | 'warning' | 'info';

export type Notify = (variant: NotifyVariant, title: string, detail?: string) => void;
