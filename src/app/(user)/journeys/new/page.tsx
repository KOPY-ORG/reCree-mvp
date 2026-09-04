import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CourseEditor } from "../_components/CourseEditor";

// 화면 진입만으로는 코스를 만들지 않는다 — 제목을 처음 입력해 blur 할 때
// CourseEditor 가 createCourse 를 부르고 /journeys/{id}/edit 로 replace 한다.
export default async function NewJourneyPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <CourseEditor mode="create" />;
}
