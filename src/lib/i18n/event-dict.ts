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
  openDaily: string;
  category: Record<EventCategory, string>;
  entryType: Record<EventEntryType, { label: string; note: string }>;
  fromDate: (date: string) => string;
  untilDate: (date: string) => string;
  locationsLabel: (n: number) => string;
};

export const eventDict: Record<EventLocale, EventDictEntry> = {
  en: {
    dates: "DATES",
    hours: "HOURS",
    location: "Location",
    whatYouGet: "What you'll get here",
    aboutSpot: "About this spot",
    links: "Links",
    officialSite: "Official event site",
    openDaily: "Open daily",
    category: {
      CONCERT: "LIVE EVENTS",
      LANDMARK_LIGHTING: "LANDMARK LIGHTING",
      PROMOTION: "OFFLINE PROMOTION",
      ACTIVITY: "OFFLINE ACTIVITIES",
      SHOPPING: "SHOPPING",
      MOBILITY: "MOBILITY",
      FNB: "F&B",
      STAY: "STAY",
      WELCOME_KIT: "Welcome Kit",
    },
    entryType: {
      WALK_IN: { label: "Walk-in", note: "No booking needed" },
      RESERVATION: { label: "Reservation", note: "Required before visit" },
      TICKET: { label: "Ticketed", note: "Purchase ticket to enter" },
    },
    fromDate: (d) => `From ${d}`,
    untilDate: (d) => `Until ${d}`,
    locationsLabel: (n) => `${n} location${n > 1 ? "s" : ""}`,
  },

  ko: {
    dates: "날짜",
    hours: "운영 시간",
    location: "장소",
    whatYouGet: "받을 수 있는 혜택",
    aboutSpot: "장소 소개",
    links: "링크",
    officialSite: "공식 이벤트 사이트",
    openDaily: "매일 운영",
    category: {
      CONCERT: "공연",
      LANDMARK_LIGHTING: "랜드마크 라이팅",
      PROMOTION: "오프라인 프로모션",
      ACTIVITY: "오프라인 액티비티",
      SHOPPING: "쇼핑",
      MOBILITY: "모빌리티",
      FNB: "F&B",
      STAY: "스테이",
      WELCOME_KIT: "웰컴키트",
    },
    entryType: {
      WALK_IN: { label: "현장 방문", note: "예약 불필요" },
      RESERVATION: { label: "사전 예약", note: "방문 전 예약 필수" },
      TICKET: { label: "티켓 입장", note: "입장권 구매 필요" },
    },
    fromDate: (d) => `${d}부터`,
    untilDate: (d) => `${d}까지`,
    locationsLabel: (n) => `${n}곳`,
  },

  ja: {
    dates: "日程",
    hours: "営業時間",
    location: "場所",
    whatYouGet: "もらえる特典",
    aboutSpot: "この場所について",
    links: "リンク",
    officialSite: "公式イベントサイト",
    openDaily: "毎日営業",
    category: {
      CONCERT: "ライブイベント",
      LANDMARK_LIGHTING: "ランドマークライティング",
      PROMOTION: "オフラインプロモーション",
      ACTIVITY: "オフラインアクティビティ",
      SHOPPING: "ショッピング",
      MOBILITY: "モビリティ",
      FNB: "F&B",
      STAY: "ステイ",
      WELCOME_KIT: "ウェルカムキット",
    },
    entryType: {
      WALK_IN: { label: "当日来場", note: "予約不要" },
      RESERVATION: { label: "予約制", note: "来場前に予約必須" },
      TICKET: { label: "チケット制", note: "入場チケット購入" },
    },
    fromDate: (d) => `${d}から`,
    untilDate: (d) => `${d}まで`,
    locationsLabel: (n) => `${n}か所`,
  },

  "zh-CN": {
    dates: "日期",
    hours: "营业时间",
    location: "地点",
    whatYouGet: "可获得的福利",
    aboutSpot: "关于此地点",
    links: "链接",
    officialSite: "官方活动网站",
    openDaily: "每日开放",
    category: {
      CONCERT: "现场演出",
      LANDMARK_LIGHTING: "地标灯光",
      PROMOTION: "线下推广",
      ACTIVITY: "线下体验",
      SHOPPING: "购物",
      MOBILITY: "出行",
      FNB: "餐饮",
      STAY: "住宿",
      WELCOME_KIT: "欢迎礼包",
    },
    entryType: {
      WALK_IN: { label: "现场参与", note: "无需预约" },
      RESERVATION: { label: "需预约", note: "到访前须预约" },
      TICKET: { label: "凭票入场", note: "需购买门票" },
    },
    fromDate: (d) => `${d}起`,
    untilDate: (d) => `截至${d}`,
    locationsLabel: (n) => `${n}个地点`,
  },

  "zh-TW": {
    dates: "日期",
    hours: "營業時間",
    location: "地點",
    whatYouGet: "可獲得的福利",
    aboutSpot: "關於此地點",
    links: "連結",
    officialSite: "官方活動網站",
    openDaily: "每日開放",
    category: {
      CONCERT: "演出活動",
      LANDMARK_LIGHTING: "地標燈光",
      PROMOTION: "線下推廣",
      ACTIVITY: "線下體驗",
      SHOPPING: "購物",
      MOBILITY: "交通出行",
      FNB: "餐飲",
      STAY: "住宿",
      WELCOME_KIT: "歡迎禮包",
    },
    entryType: {
      WALK_IN: { label: "現場參與", note: "無需預約" },
      RESERVATION: { label: "需預約", note: "到訪前須預約" },
      TICKET: { label: "憑票入場", note: "需購買門票" },
    },
    fromDate: (d) => `${d}起`,
    untilDate: (d) => `截至${d}`,
    locationsLabel: (n) => `${n}個地點`,
  },

  es: {
    dates: "FECHAS",
    hours: "HORARIO",
    location: "Ubicación",
    whatYouGet: "Lo que recibirás",
    aboutSpot: "Sobre este lugar",
    links: "Enlaces",
    officialSite: "Sitio oficial del evento",
    openDaily: "Abierto todos los días",
    category: {
      CONCERT: "Eventos en vivo",
      LANDMARK_LIGHTING: "Iluminación de monumentos",
      PROMOTION: "Promoción presencial",
      ACTIVITY: "Actividades presenciales",
      SHOPPING: "Compras",
      MOBILITY: "Movilidad",
      FNB: "Gastronomía",
      STAY: "Alojamiento",
      WELCOME_KIT: "Kit de bienvenida",
    },
    entryType: {
      WALK_IN: { label: "Sin cita", note: "No requiere reserva" },
      RESERVATION: { label: "Reserva", note: "Requerida antes de visitar" },
      TICKET: { label: "Con entrada", note: "Compra requerida" },
    },
    fromDate: (d) => `Desde ${d}`,
    untilDate: (d) => `Hasta ${d}`,
    locationsLabel: (n) => `${n} ubicaciones`,
  },
};

export function getEventDict(locale: string): (typeof eventDict)[EventLocale] {
  return eventDict[locale as EventLocale] ?? eventDict.en;
}
