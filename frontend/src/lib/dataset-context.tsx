"use client";

import { createContext, useContext } from "react";
import { getDashboard, getProfile, listDatasets } from "@/lib/api";
import { useAsyncData, type Async } from "@/lib/use-async-data";
import type { Dashboard, Profile } from "@/lib/types";

/** Everything a dataset-scoped screen needs, hydrated once in the [id] layout. */
export interface DatasetBundle {
  id: string;
  filename: string;
  rowCount: number;
  uploadedAt: string | null;
  profile: Profile;
  dashboard: Dashboard;
}

const DatasetContext = createContext<DatasetBundle | null>(null);

/** Read the active dataset bundle inside any /d/[id] screen. */
export function useDataset(): DatasetBundle {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used within <DatasetProvider>");
  return ctx;
}

/**
 * Fetches profile + dashboard for a dataset id (plus its filename from the
 * library list / an upload cached in sessionStorage) and exposes them to
 * children. Keeps the data flow intact: everything comes from the real backend.
 */
export function useDatasetBundle(id: string): {
  state: Async<DatasetBundle>;
  reload: () => void;
} {
  return useAsyncData<DatasetBundle>(async () => {
    const [profile, dashboard, list] = await Promise.all([
      getProfile(id),
      getDashboard(id),
      listDatasets().catch(() => []),
    ]);
    const summary = list.find((d) => d.id === id);
    let filename = summary?.filename ?? "";
    let uploadedAt = summary?.uploaded_at ?? null;
    if (!filename && typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(`iq:name:${id}`);
        if (cached) filename = cached;
      } catch {}
    }
    return {
      id,
      filename: filename || "Dataset",
      rowCount: profile.row_count,
      uploadedAt,
      profile,
      dashboard,
    };
  }, [id]);
}

export const DatasetProvider = DatasetContext.Provider;
