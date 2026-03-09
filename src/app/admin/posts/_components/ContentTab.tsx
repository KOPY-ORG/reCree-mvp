"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { translateFields } from "../_actions/draft-actions";
import {
  bold,
  italic,
  strikethrough,
  link,
  quote,
  code,
  codeBlock,
  unorderedListCommand,
  orderedListCommand,
  divider,
  type ICommand,
} from "@uiw/react-md-editor/commands";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const STORY_COMMANDS: ICommand[] = [
  bold, italic, strikethrough, divider,
  link, quote, code, codeBlock, divider,
  unorderedListCommand, orderedListCommand,
];

interface Props {
  bodyKo: string;
  setBodyKo: (v: string) => void;
  bodyEn: string;
  setBodyEn: (v: string) => void;
}

export function ContentTab({
  bodyKo, setBodyKo,
  bodyEn, setBodyEn,
}: Props) {
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const handleTranslateOne = async (
    field: string,
    ko: string,
    setEn: (v: string) => void,
  ) => {
    if (!ko.trim()) return;
    setTranslatingField(field);
    const { data, error } = await translateFields({ value: ko });
    setTranslatingField(null);
    if (error) {
      toast.error(error);
    } else if (data?.value) {
      setEn(data.value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4" data-color-mode="light">
        <div className="space-y-1.5">
          <div className="flex items-center h-7">
            <span className="text-sm font-medium">본문 (한국어)</span>
          </div>
          <MDEditor
            value={bodyKo}
            onChange={(v) => setBodyKo(v ?? "")}
            height={320}
            preview="edit"
            commands={STORY_COMMANDS}
            extraCommands={[]}
            visibleDragbar={false}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between h-7">
            <span className="text-sm font-medium text-muted-foreground">Body (English)</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground gap-1"
              disabled={!bodyKo.trim() || translatingField === "bodyEn"}
              onClick={() => handleTranslateOne("bodyEn", bodyKo, setBodyEn)}
            >
              {translatingField === "bodyEn" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <><Languages className="h-3 w-3" />번역</>
              )}
            </Button>
          </div>
          <MDEditor
            value={bodyEn}
            onChange={(v) => setBodyEn(v ?? "")}
            height={320}
            preview="edit"
            commands={STORY_COMMANDS}
            extraCommands={[]}
            visibleDragbar={false}
          />
        </div>
      </div>
    </div>
  );
}
