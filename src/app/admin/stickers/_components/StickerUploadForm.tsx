"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { getStickerPresignedUrl } from "@/lib/actions/upload-actions";
import { createSticker } from "../_actions/sticker-actions";

export function StickerUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setIsUploading(true);
    setError(null);
    try {
      const presigned = await getStickerPresignedUrl(file.name, file.type);
      if ("error" in presigned) throw new Error(presigned.error);
      const res = await fetch(presigned.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      await createSticker({ name: name.trim(), imageUrl: presigned.cdnUrl, mimeType: file.type });
      setName("");
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
      {/* 파일 선택 */}
      <div className="shrink-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
          id="sticker-file"
        />
        <label
          htmlFor="sticker-file"
          className="size-16 rounded-lg border-2 border-dashed border-zinc-600 flex items-center justify-center cursor-pointer hover:border-brand transition-colors overflow-hidden"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="size-14 object-contain" />
          ) : (
            <Upload className="size-5 text-zinc-500" />
          )}
        </label>
      </div>

      {/* 이름 입력 */}
      <div className="flex-1 space-y-1">
        <label className="text-xs text-zinc-400">이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="스티커 이름"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-brand"
        />
        <p className="text-[10px] text-zinc-500">PNG · WebP · SVG 지원</p>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>

      {/* 업로드 버튼 */}
      <button
        type="submit"
        disabled={!file || !name.trim() || isUploading}
        className="shrink-0 px-4 py-2 rounded-lg bg-brand text-black text-sm font-semibold disabled:opacity-40"
      >
        {isUploading ? "업로드 중..." : "추가"}
      </button>
    </form>
  );
}
