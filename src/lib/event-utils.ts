import type { EventCollectionMapMarker } from "./event-collection-queries";

export function dedupeEventMarkers(
  markers: EventCollectionMapMarker[],
): { marker: EventCollectionMapMarker; placeIds: string[] }[] {
  const map = new Map<string, { marker: EventCollectionMapMarker; placeIds: string[] }>();
  for (const m of markers) {
    const entry = map.get(m.eventId);
    if (entry) entry.placeIds.push(m.place.id);
    else map.set(m.eventId, { marker: m, placeIds: [m.place.id] });
  }
  return Array.from(map.values());
}
