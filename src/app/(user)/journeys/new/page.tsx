import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CourseEditor } from "../_components/CourseEditor";

interface Props {
  searchParams: Promise<{ lat?: string; lng?: string; near?: string }>;
}

/** 좌표 하나만 검증한다. 범위 밖이거나 숫자가 아니면 없는 셈 친다 */
function toCoord(raw: string | undefined, max: number): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

// 화면 진입만으로는 코스를 만들지 않는다 — Done 을 눌러야 CourseEditor 가
// createCourse 부터 아이템까지 한꺼번에 푼다 (materializeDraft).
export default async function NewJourneyPage({ searchParams }: Props) {
  const [currentUser, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!currentUser) redirect("/login");

  // 맵에서 "Create a journey here" 로 들어온 경우에만 붙는다.
  // 코스는 지역을 갖지 않으므로 저장되는 값이 아니라, 첫 장소를 담기 전까지
  // Nearby Attractions 가 둘러볼 기준점으로만 쓰인다.
  const lat = toCoord(params.lat, 90);
  const lng = toCoord(params.lng, 180);
  const label = params.near?.trim();
  const initialAnchor =
    lat !== null && lng !== null
      ? { lat, lng, label: label && label.length <= 80 ? label : "this area" }
      : undefined;

  return <CourseEditor mode="create" initialAnchor={initialAnchor} />;
}
