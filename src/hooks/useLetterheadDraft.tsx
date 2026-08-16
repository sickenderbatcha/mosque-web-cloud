import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LETTERHEAD_LAYOUT,
  EMPTY_LETTERHEAD_FIELDS,
  type LetterheadFields,
  type LetterheadLayout,
} from "@/lib/letterheadHtml";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface LetterheadDraft {
  fields: LetterheadFields;
  layout: LetterheadLayout;
  currentId: string | null;
  savedAt: number;
}

const isEmptyFields = (fields: LetterheadFields) =>
  Object.values(fields).every((v) => !String(v ?? "").trim());

export const useLetterheadDraft = () => {
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [restored, setRestored] = useState<LetterheadDraft | null>(null);
  const [isReady, setIsReady] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const key = `letterhead_draft_${data.user?.id ?? "anon"}`;
      setStorageKey(key);
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as LetterheadDraft;
          const fresh = parsed?.savedAt && Date.now() - parsed.savedAt < MAX_AGE_MS;
          if (fresh && parsed.fields && !isEmptyFields(parsed.fields)) {
            setRestored({
              fields: { ...EMPTY_LETTERHEAD_FIELDS, ...parsed.fields },
              layout: { ...DEFAULT_LETTERHEAD_LAYOUT, ...(parsed.layout ?? {}) },
              currentId: parsed.currentId ?? null,
              savedAt: parsed.savedAt,
            });
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const clearDraft = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (storageKey) localStorage.removeItem(storageKey);
    setRestored(null);
  }, [storageKey]);

  const saveDraft = useCallback(
    (fields: LetterheadFields, layout: LetterheadLayout, currentId: string | null) => {
      if (!storageKey || !isReady) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        try {
          if (isEmptyFields(fields)) {
            localStorage.removeItem(storageKey);
            return;
          }
          const draft: LetterheadDraft = { fields, layout, currentId, savedAt: Date.now() };
          localStorage.setItem(storageKey, JSON.stringify(draft));
        } catch (err) {
          console.error("Could not store letterhead draft:", err);
        }
      }, 500);
    },
    [storageKey, isReady]
  );

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return { isReady, restored, saveDraft, clearDraft, dismissRestoredNotice: () => setRestored(null) };
};
