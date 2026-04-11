"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { updateProfile } from "../_actions/profile-actions";
import { getProfileImagePresignedUrl } from "@/lib/actions/upload-actions";
import { MAX_PROFILE_IMAGE_SIZE, ALLOWED_IMAGE_ACCEPT } from "@/lib/upload-constants";
import { useNicknameCheck } from "@/hooks/use-nickname-check";
import { NicknameInput } from "@/components/NicknameInput";
import { showToast, showError } from "@/lib/toast";
import { compressImage } from "@/lib/image";

interface Props {
  email: string;
  nickname: string | null;
  bio: string | null;
  profileImageUrl: string | null;
}

export function ProfileEditForm({
  email,
  nickname,
  bio,
  profileImageUrl,
}: Props) {
  const [nicknameVal, setNicknameVal] = useState(nickname ?? "");
  const [bioVal, setBioVal] = useState(bio ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(profileImageUrl);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicknameStatus = useNicknameCheck(nicknameVal, nickname ?? "");

  const initial = email[0].toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      showError("Image size must be 10MB or less.");
      e.target.value = "";
      return;
    }
    setImagePreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
    setPhotoRemoved(false);
  }

  function handleRemovePhoto() {
    setImagePreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
    setPhotoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSave() {
    startSaving(async () => {
      try {
        let finalImageUrl: string | null = photoRemoved ? null : imagePreview;

        if (imageFile) {
          const compressed = await compressImage(imageFile, 400, 0.85);
          const presigned = await getProfileImagePresignedUrl(compressed.name, compressed.type);
          if ("error" in presigned) {
            showError(<>Failed to upload image.<br />Please try again.</>);
            return;
          }
          const res = await fetch(presigned.presignedUrl, {
            method: "PUT",
            body: compressed,
            headers: { "Content-Type": compressed.type },
          });
          if (!res.ok) {
            showError(<>Failed to upload image.<br />Please try again.</>);
            return;
          }
          finalImageUrl = presigned.cdnUrl;
        }

        const result = await updateProfile({
          nickname: nicknameVal,
          bio: bioVal,
          profileImageUrl: finalImageUrl,
        });

        if (result.error) {
          showError(result.error);
          return;
        }

        setImageFile(null);
        showToast("Profile updated.");
        router.push("/profile");
      } catch {
        showError(<>Something went wrong.<br />Please try again.</>);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 프로필 사진 */}
      <div className="flex flex-col items-center gap-3 pt-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group"
        >
          <div className="size-24 rounded-full bg-brand flex items-center justify-center text-black text-2xl font-bold overflow-hidden">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Profile" className="size-24 object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="size-5 text-white" />
          </div>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Change photo
          </button>
          {imagePreview && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-xs text-destructive underline underline-offset-2"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 계정 정보 */}
      <div className="px-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Email
          </label>
          <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2.5">
            {email}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nickname" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nickname
          </label>
          <NicknameInput
            value={nicknameVal}
            onChange={setNicknameVal}
            status={nicknameStatus}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Bio
          </label>
          <textarea
            id="bio"
            value={bioVal}
            onChange={(e) => setBioVal(e.target.value)}
            placeholder="Tell us about yourself"
            maxLength={150}
            rows={3}
            className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2.5 outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{bioVal.length}/150</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || nicknameStatus === "taken" || nicknameStatus === "checking"}
          className="w-full py-3 rounded-lg bg-brand text-black text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

    </div>
  );
}
