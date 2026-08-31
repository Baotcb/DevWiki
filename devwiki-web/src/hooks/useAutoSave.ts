import { useEffect, useRef, useCallback, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  /** Hàm thực hiện save — nhận data hiện tại */
  onSave: (data: unknown) => Promise<void>;
  /** Debounce ms (mặc định 30 giây) */
  delay?: number;
  /** Có kích hoạt auto-save hay không (false khi chưa có ID) */
  enabled?: boolean;
}

interface AutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  /** Trigger save thủ công (bypass debounce) */
  saveNow: () => void;
}

/**
 * Hook tự động lưu dữ liệu theo debounce.
 *
 * Cách hoạt động:
 * - Mỗi khi `data` thay đổi → reset timer
 * - Sau `delay` ms không có thay đổi → gọi `onSave(data)`
 * - Cung cấp trạng thái: idle | saving | saved | error
 * - Gọi `saveNow()` để lưu ngay lập tức (dùng khi click nút Lưu thủ công)
 */
export function useAutoSave(data: unknown, options: AutoSaveOptions): AutoSaveResult {
  const { onSave, delay = 30_000, enabled = true } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const dataRef     = useRef(data);

  // Luôn giữ dataRef up-to-date (tránh stale closure trong timer callback)
  dataRef.current = data;

  const executeSave = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setStatus('saving');
    try {
      await onSave(dataRef.current);
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch {
      setStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave]);

  // Auto-save debounced
  useEffect(() => {
    if (!enabled) return;

    // Reset timer mỗi khi data thay đổi
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle');

    timerRef.current = setTimeout(() => {
      executeSave();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay, enabled, executeSave]);

  // Lưu thủ công (bỏ qua debounce)
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    executeSave();
  }, [executeSave]);

  return { status, lastSavedAt, saveNow };
}
