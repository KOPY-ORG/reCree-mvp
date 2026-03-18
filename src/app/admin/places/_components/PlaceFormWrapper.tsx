"use client";

import { useCallback } from "react";
import { PlaceForm } from "./PlaceForm";
import type { PlaceInitialData, PlaceImageData, PlaceTypeOption, AreaOption } from "./PlaceForm";
import { createPlace, updatePlace } from "../actions";
import type { PlaceFormData } from "../actions";

// ─── 생성 모드 ──────────────────────────────────────────────────────────────────

interface CreateProps {
  mode: "create";
  allPlaceTypes?: PlaceTypeOption[];
  allAreas?: AreaOption[];
  returnUrl?: string;
}

// ─── 수정 모드 ──────────────────────────────────────────────────────────────────

interface EditProps {
  mode: "edit";
  placeId: string;
  initialData: PlaceInitialData;
  initialPlaceImages?: PlaceImageData[];
  allPlaceTypes?: PlaceTypeOption[];
  allAreas?: AreaOption[];
  returnUrl?: string;
}

type PlaceFormWrapperProps = CreateProps | EditProps;

export function PlaceFormWrapper(props: PlaceFormWrapperProps) {
  const returnUrl = props.returnUrl;
  const handleSubmit = useCallback(
    async (data: PlaceFormData) => {
      if (props.mode === "create") {
        return createPlace(data, returnUrl);
      } else {
        return updatePlace(props.placeId, data, returnUrl);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.mode, props.mode === "edit" ? props.placeId : null, returnUrl],
  );

  return (
    <PlaceForm
      initialData={props.mode === "edit" ? props.initialData : undefined}
      initialPlaceImages={props.mode === "edit" ? (props.initialPlaceImages ?? []) : []}
      allPlaceTypes={props.allPlaceTypes ?? []}
      allAreas={props.allAreas ?? []}
      onSubmit={handleSubmit}
      submitLabel={props.mode === "create" ? "장소 등록" : "수정 완료"}
      returnUrl={props.returnUrl}
    />
  );
}
