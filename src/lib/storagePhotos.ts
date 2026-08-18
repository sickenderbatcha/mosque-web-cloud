import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Buckets that are private: their stored URLs (legacy public-style links) must be
 * exchanged for short-lived signed URLs before they can be rendered.
 */
const PRIVATE_BUCKETS = ["member-photos", "marriage-photos"];

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const cache = new Map<string, string>();

interface ParsedObject {
  bucket: string;
  path: string;
}

/** Extract bucket + object path from a stored Supabase storage URL. */
export function parseStorageUrl(url: string): ParsedObject | null {
  if (!url) return null;
  for (const bucket of PRIVATE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const signedMarker = `/storage/v1/object/sign/${bucket}/`;
    const index = url.includes(marker)
      ? url.indexOf(marker) + marker.length
      : url.includes(signedMarker)
        ? url.indexOf(signedMarker) + signedMarker.length
        : -1;
    if (index >= 0) {
      const path = decodeURIComponent(url.slice(index).split("?")[0]);
      return { bucket, path };
    }
  }
  return null;
}

/** Resolve a stored photo URL to a viewable URL (signed when the bucket is private). */
export async function resolvePhotoUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;

  const cacheKey = `${parsed.bucket}/${parsed.path}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  cache.set(cacheKey, data.signedUrl);
  return data.signedUrl;
}

/** Hook: resolve a single stored photo URL for rendering. */
export function useSignedPhotoUrl(url?: string | null): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved(undefined);
      return;
    }
    resolvePhotoUrl(url).then((value) => {
      if (active) setResolved(value || undefined);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}

/** Hook: resolve many stored photo URLs at once, keyed by the original URL. */
export function useSignedPhotoUrls(urls: (string | null | undefined)[]): Record<string, string> {
  const key = useMemo(() => urls.filter(Boolean).join("|"), [urls]);
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const unique = Array.from(new Set(key ? key.split("|") : []));
    if (unique.length === 0) {
      setMap({});
      return;
    }
    Promise.all(
      unique.map(async (original) => {
        const value = await resolvePhotoUrl(original);
        return [original, value] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const [original, value] of entries) {
        if (value) next[original] = value;
      }
      setMap(next);
    });
    return () => {
      active = false;
    };
  }, [key]);

  return map;
}
