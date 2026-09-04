import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseDetail } from "@/lib/course-queries";
import {
  CourseEditor,
  type CourseEditorInitialData,
} from "../../_components/CourseEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditJourneyPage({ params }: Props) {
  const { id } = await params;

  const [currentUser, course] = await Promise.all([getCurrentUser(), getCourseDetail(id)]);
  if (!currentUser) redirect("/login");
  if (!course) notFound();

  // 소유자가 아니면 forbidden 이 아니라 notFound 다 — 비공개 코스의 존재 자체를
  // 노출하지 않는다 ([id]/page.tsx:37 과 같은 판단).
  if (course.authorId !== currentUser.id) notFound();

  const initialData: CourseEditorInitialData = {
    title: course.title,
    isPublic: course.isPublic,
    topics: course.topics,
    days: course.days.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      items: day.items.map((item) => ({
        id: item.id,
        placeId: item.placeId,
        nameEn: item.nameEn,
        // CourseItem 스냅샷의 주소가 비어 있으면 원본 Place 로 폴백한다 ([id]/page.tsx:257 과 같은 순서)
        address: item.address ?? item.place?.addressEn ?? item.place?.addressKo ?? null,
      })),
    })),
  };

  return <CourseEditor mode="edit" courseId={id} initialData={initialData} />;
}
