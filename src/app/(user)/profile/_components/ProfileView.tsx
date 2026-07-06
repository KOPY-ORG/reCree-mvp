"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ChevronRight,
  MapPin,
  Heart,
  Pencil,
  LogOut,
  Trash2,
  Plus,
  FileText,
  ShieldCheck,
  EyeOff,
} from "lucide-react";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { deleteAccount } from "../_actions/profile-actions";
import { signOut } from "@/lib/actions/auth";
import { showError } from "@/lib/toast";

interface ReCreeshot {
  id: string;
  imageUrl: string;
  referencePhotoUrl: string | null;
  status: string;
}

interface Props {
  email: string;
  nickname: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  recreeshots: ReCreeshot[];
}

export function ProfileView({
  email,
  nickname,
  bio,
  profileImageUrl,
  recreeshots,
}: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayName = nickname || email.split("@")[0];
  const activeRecreeshotCount = recreeshots.filter(
    (s) => s.status === "ACTIVE" || s.status === "REPORTED"
  ).length;

  async function handleDeleteAccount() {
    setIsDeleting(true);
    const result = await deleteAccount();
    if (result?.error) {
      showError(result.error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* 자체 헤더 */}
      <header className="app-header">
        <div className="h-12 flex items-center justify-between px-4">
          <span className="font-bold text-base tracking-tight">reCree</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center size-8"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* 프로필 정보 */}
      <div className="px-4 pt-4">
        {/* 아바타 + 통계 */}
        <div className="flex items-center justify-between mb-6">
          <UserAvatar
            imageUrl={profileImageUrl}
            name={nickname ?? email}
            size={96}
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg">{activeRecreeshotCount}</span>
              <span className="text-xs text-muted-foreground">recreeshots</span>
            </div>
            <Link
              href="/recreeshot/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-black text-xs font-medium"
              style={{ background: "var(--color-brand-sub3)" }}
            >
              <Plus className="size-3.5" />
              add recreeshot
            </Link>
          </div>
        </div>
        {/* 닉네임 + edit profile */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="font-semibold text-xl truncate">{displayName}</p>
          <Link
            href="/profile/edit"
            className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            edit profile
          </Link>
        </div>
        {/* bio */}
        {bio && (
          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
            {bio}
          </p>
        )}

        {/* 단축 버튼 */}
        <div className="flex gap-2 my-6">
          <Link
            href="/discover?saved=1"
            className="flex flex-1 items-center justify-center gap-2 py-2 rounded-full bg-muted text-sm font-medium"
          >
            <MapPin className="size-4" />
            My Maps
          </Link>
          <Link
            href="/profile/following"
            className="flex flex-1 items-center justify-center gap-2 py-2 rounded-full bg-muted text-sm font-medium"
          >
            <Heart className="size-4" />
            Following
          </Link>
        </div>
      </div>

      {/* 리크리샷 그리드 */}
      {recreeshots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <p className="text-sm font-medium">No recreeshots yet</p>
          <Link
            href="/recreeshot/new"
            className="text-xs underline underline-offset-2"
          >
            Share your first recreeshot
          </Link>
        </div>
      ) : (
        <div className="px-2 grid grid-cols-2 gap-2 bg-background">
          {recreeshots.map((shot) => {
            const isHidden = shot.status === "HIDDEN" || shot.status === "REPORT_HIDDEN";
            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => router.push(`/recreeshot/${shot.id}?from=profile`)}
                className="relative block w-full"
              >
                <ReCreeshotImage
                  shotUrl={shot.imageUrl}
                  variant="thumb-md"
                  className="w-full aspect-[4/5] rounded-none shadow-md"
                  sizes="50vw"
                />
                {isHidden && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <EyeOff className="size-5 text-white/80" />
                    <span className="text-[11px] text-white/70 font-medium">Hidden</span>
                    <span className="text-[10px] text-white/50">Tap to delete</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 설정 드로어 오버레이 */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-background flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-4 h-12">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="size-8 flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <DrawerSection label="ACCOUNT" />
              <DrawerItem
                icon={<Pencil className="size-4" />}
                label="Edit Profile"
                href="/profile/edit"
                onClick={() => setDrawerOpen(false)}
              />

              <DrawerSection label="LEGAL" />
              <DrawerItem
                icon={<FileText className="size-4" />}
                label="Terms of Service"
                href="/policy/terms"
                onClick={() => setDrawerOpen(false)}
              />
              <DrawerItem
                icon={<ShieldCheck className="size-4" />}
                label="Privacy Policy"
                href="/policy/privacy"
                onClick={() => setDrawerOpen(false)}
              />

              <DrawerSection label="DANGER" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                >
                  <LogOut className="size-4 text-muted-foreground" />
                  <span>Sign out</span>
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setShowDeleteDialog(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 탈퇴 확인 다이얼로그 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8">
          <div className="w-full max-w-sm bg-background rounded-2xl overflow-hidden">
            <div className="px-5 pt-6 pb-4 text-center space-y-2">
              <p className="font-bold text-base">Delete account?</p>
              <p className="text-sm text-muted-foreground">
                All your data including saves and reCreeshots will be
                permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="border-t border-border/50">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full py-3.5 text-sm font-semibold text-red-500 border-b border-border/50 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="w-full py-3.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerSection({ label }: { label: string }) {
  return (
    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
      {label}
    </p>
  );
}

function DrawerItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-3.5 text-muted-foreground/50" />
    </Link>
  );
}
