"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useAsyncData } from "@/hooks/useAsyncData";
import { api } from "@/lib/api";
import type { MeetingDetail, MeetingListItem, MeetingQuery, Stats, UserProfile } from "@/lib/types";

/** Meetings library data (search / filter / sort aware). */
export function useMeetings(query: MeetingQuery) {
  const key = JSON.stringify(query);
  const loader = useCallback(() => api.listMeetings(query), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const state = useAsyncData(loader, [key]);

  return useMemo(
    () => ({
      meetings: state.data?.items ?? ([] as MeetingListItem[]),
      total: state.data?.total ?? 0,
      loading: state.loading,
      refreshing: state.refreshing,
      error: state.error,
      reload: state.reload,
    }),
    [state],
  );
}

/** Single meeting payload for the notepad. */
export function useMeeting(meetingId: string) {
  const loader = useCallback(() => api.getMeeting(meetingId), [meetingId]);
  const state = useAsyncData<MeetingDetail>(loader, [meetingId], { enabled: Boolean(meetingId) });

  return useMemo(
    () => ({
      meeting: state.data,
      loading: state.loading,
      error: state.error,
      reload: state.reload,
      setMeeting: state.setData,
    }),
    [state],
  );
}

export function useCurrentUser() {
  const loader = useCallback(() => api.getCurrentUser(), []);
  const state = useAsyncData<UserProfile>(loader, []);
  return state;
}

export function useStats() {
  const loader = useCallback(() => api.getStats(), []);
  const state = useAsyncData<Stats>(loader, []);

  useEffect(() => {
    const handler = () => void state.reload({ quiet: true });
    window.addEventListener("refresh-stats", handler);
    return () => window.removeEventListener("refresh-stats", handler);
  }, [state.reload]);

  return state;
}
