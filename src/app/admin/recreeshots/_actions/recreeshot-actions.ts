"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ReCreeshotStatus } from "@prisma/client";

function revalidate() {
  revalidatePath("/admin/recreeshots");
}

export async function setRecreeshotStatus(id: string, status: ReCreeshotStatus) {
  await prisma.reCreeshot.update({ where: { id }, data: { status } });
  revalidate();
}
