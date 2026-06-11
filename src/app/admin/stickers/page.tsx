import { getAllStickers } from "./_actions/sticker-actions";
import { StickerGrid } from "./_components/StickerGrid";
import { StickerUploadForm } from "./_components/StickerUploadForm";

export default async function StickersPage() {
  const stickers = await getAllStickers();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white">스티커 관리</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          에디터에서 사용할 스티커를 업로드하고 관리합니다.
        </p>
      </div>

      <StickerUploadForm />

      <StickerGrid initialStickers={stickers} />
    </div>
  );
}
