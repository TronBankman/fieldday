"use client";

import { useEffect } from "react";
import { track, type FunnelEvent } from "@/lib/track";

export default function TrackPageView({ event }: { event: FunnelEvent }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
