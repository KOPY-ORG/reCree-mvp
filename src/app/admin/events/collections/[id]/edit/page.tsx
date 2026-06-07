import { notFound } from "next/navigation";
import { getCollectionForEdit } from "../../../_actions/collection-actions";
import {
  CollectionForm,
  type CollectionInitialData,
} from "../../../_components/CollectionForm";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionForEdit(id);
  if (!collection) notFound();

  const translations = Object.fromEntries(
    collection.translations.map((t) => [t.locale, { name: t.name }]),
  );

  const initialData: CollectionInitialData = {
    id: collection.id,
    slug: collection.slug,
    status: collection.status,
    sortOrder: collection.sortOrder,
    translations,
  };

  return (
    <CollectionForm
      mode="edit"
      collectionId={id}
      initialData={initialData}
    />
  );
}
