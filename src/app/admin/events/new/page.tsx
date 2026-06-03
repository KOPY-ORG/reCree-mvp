import { getAllCollections } from "../_actions/collection-actions";
import { EventForm } from "../_components/EventForm";

export default async function NewEventPage() {
  const collections = await getAllCollections();
  return <EventForm mode="create" collections={collections} />;
}
