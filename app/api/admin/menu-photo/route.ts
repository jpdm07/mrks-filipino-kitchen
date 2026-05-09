import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 5MB or smaller." },
      { status: 400 }
    );
  }
  const mime = file.type || "";
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/jpeg" || mime === "image/jpg"
        ? "jpg"
        : mime === "image/webp"
          ? "webp"
          : "";
  if (!ext) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WebP image." },
      { status: 400 }
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "menu");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/menu/${name}` });
}
