import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SheetImportClient } from "./_components/SheetImportClient";

export default function ImportPage() {
  const isConfigured =
    !!process.env.GOOGLE_SHEETS_ID &&
    !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">시트 가져오기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Google Sheets에서 수집된 장소 데이터를 포스트로 가져옵니다.
        </p>
      </div>

      {!isConfigured && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>환경변수 설정 필요</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>
              다음 환경변수가 설정되지 않았습니다. .env.local 파일을
              확인해 주세요.
            </p>
            {!process.env.GOOGLE_SHEETS_ID && (
              <p className="font-mono">• GOOGLE_SHEETS_ID</p>
            )}
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <p className="font-mono">• NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <SheetImportClient />
    </div>
  );
}
