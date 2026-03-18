"use client";

import dynamic from "next/dynamic";

interface Props {
  countries: string[];
  cities: string[];
  currentSearch: string;
  currentCountry: string;
  currentCity: string;
  currentStatus: string;
  currentSource: string;
  currentVerified: string;
}

const PlacesFiltersInner = dynamic(
  () => import("./PlacesFiltersInner").then((m) => m.PlacesFiltersInner),
  { ssr: false },
);

export function PlacesFilters(props: Props) {
  return <PlacesFiltersInner {...props} />;
}
