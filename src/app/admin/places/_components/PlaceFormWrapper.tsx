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
}

// ─── 수정 모드 ──────────────────────────────────────────────────────────────────

interface EditProps {
  mode: "edit";
  placeId: string;
  initialData: PlaceInitialData;
  initialPlaceImages?: PlaceImageData[];
  allPlaceTypes?: PlaceTypeOption[];
  allAreas?: AreaOption[];
}

type PlaceFormWrapperProps = CreateProps | EditProps;

export function PlaceFormWrapper(props: PlaceFormWrapperProps) {
  const handleSubmit = useCallback(
    async (data: PlaceFormData) => {
      if (props.mode === "create") {
        const result = await createPlace(data);
        return result;
      } else {
        return updatePlace(props.placeId, data);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.mode, props.mode === "edit" ? props.placeId : null],
  );

  return (
    <PlaceForm
      initialData={props.mode === "edit" ? props.initialData : undefined}
      initialPlaceImages={props.mode === "edit" ? (props.initialPlaceImages ?? []) : []}
      allPlaceTypes={props.allPlaceTypes ?? []}
      allAreas={props.allAreas ?? []}
      onSubmit={handleSubmit}
      submitLabel={props.mode === "create" ? "장소 등록" : "수정 완료"}
    />
  );
}
