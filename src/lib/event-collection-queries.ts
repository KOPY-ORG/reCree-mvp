import { prisma } from "@/lib/prisma";

export type ActiveEventCollection = {
  id: string;
  slug: string;
  translations: { locale: string; name: string }[];
};

export async function getActiveEventCollections(): Promise<ActiveEventCollection[]> {
  return await prisma.eventCollection.findMany({
    where: {
      status: "PUBLISHED",
      events: {
        some: { status: "PUBLISHED" },
      },
    },
    select: {
      id: true,
      slug: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}
