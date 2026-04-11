/**
 * Cloudflare R2 스토리지 유틸리티
 * @aws-sdk/client-s3 (S3 호환 API) 사용
 */

import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "us-east-1", // R2는 실제 라우팅에 region을 사용하지 않음 — "auto"는 일부 SDK 버전에서 SigV4 오류 발생
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL!;

/**
 * CDN URL에서 버킷 하위 경로를 추출하는 헬퍼 생성.
 */
export function makeStorageExtractor(bucket: string) {
  const cdnPrefix = `${CDN_URL}/${bucket}/`;

  return function extractStoragePath(url: string): string | null {
    if (url.startsWith(cdnPrefix)) return url.slice(cdnPrefix.length);
    return null;
  };
}

/** R2에 파일 업로드. 업로드된 CDN URL 반환. */
export async function uploadFile(
  bucket: string,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const key = `${bucket}/${path}`;
await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${CDN_URL}/${key}`;
}

/** 브라우저 직접 업로드용 Presigned PUT URL 생성. expiresIn: 초 단위 (기본 300초) */
export async function getPresignedPutUrl(
  bucket: string,
  path: string,
  contentType: string,
  expiresIn = 300,
): Promise<{ presignedUrl: string; cdnUrl: string }> {
  const key = `${bucket}/${path}`;
  const presignedUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn },
  );
  return { presignedUrl, cdnUrl: `${CDN_URL}/${key}` };
}

/** R2 파일 삭제 (best-effort). 실패해도 에러를 throw하지 않음. */
export async function deleteStorageFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const objects = paths.map((p) => ({ Key: `${bucket}/${p}` }));
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: objects },
      }),
    );
  } catch (e) {
    console.error(`R2 파일 삭제 오류 [${bucket}]:`, e);
  }
}
