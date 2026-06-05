import type { EventCategory, EventEntryType } from "@prisma/client";

export type EventLocale = "ko" | "en" | "zh-CN" | "zh-TW" | "es" | "ja";

export const SUPPORTED_LOCALES: EventLocale[] = ["ko", "en", "zh-CN", "zh-TW", "es", "ja"];

type EventDictEntry = {
  dates: string;
  hours: string;
  location: string;
  whatYouGet: string;
  aboutSpot: string;
  links: string;
  officialSite: string;
  fromPrefix: string;
  untilPrefix: string;
  openDaily: string;
  locationsCount: string;
  category: Record<EventCategory, string>;
  entryType: Record<EventEntryType, { label: string; note: string }>;
};

const en: EventDictEntry = {
  dates: "DATES",
  hours: "HOURS",
  location: "Location",
  whatYouGet: "What you'll get here",
  aboutSpot: "About this spot",
  links: "Links",
  officialSite: "Official event site",
  fromPrefix: "From ",
  untilPrefix: "Until ",
  openDaily: "Open daily",
  locationsCount: "locations",
  category: {
    CONCERT: "Concert",
    LANDMARK_LIGHTING: "Light Show",
    PROMOTION: "Promotion",
    ACTIVITY: "Activity",
    SHOPPING: "Shopping",
    MOBILITY: "Mobility",
    FNB: "F&B",
    STAY: "Stay",
    WELCOME_KIT: "Welcome Kit",
  },
  entryType: {
    WALK_IN: { label: "Walk-in", note: "No booking needed" },
    RESERVATION: { label: "Reservation", note: "Required before visit" },
    TICKET: { label: "Ticketed", note: "Purchase ticket to enter" },
  },
};

export const eventDict: Record<EventLocale, EventDictEntry> = {
  en,
  ko: en,
  "zh-CN": en,
  "zh-TW": en,
  es: en,
  ja: en,
};

export function getEventDict(locale: string): (typeof eventDict)[EventLocale] {
  return eventDict[locale as EventLocale] ?? eventDict.en;
}
