import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { detectFileType, processUpload } from "@/server/upload";

async function jpegWithGps(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: "#888" } })
    .jpeg()
    .withExif({ IFD0: { Make: "SecretCam", Copyright: "private" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 21/1 0/1" } })
    .toBuffer();
}

const file = (buf: Buffer, name = "bild.jpg", type = "image/jpeg") => new File([new Uint8Array(buf)], name, { type });

describe("Magic-Byte-Erkennung", () => {
  it("erkennt echte Bildformate", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#000" } }).png().toBuffer();
    const webp = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#000" } }).webp().toBuffer();
    expect(detectFileType(await jpegWithGps())).toBe("image/jpeg");
    expect(detectFileType(png)).toBe("image/png");
    expect(detectFileType(webp)).toBe("image/webp");
  });
  it("erkennt HTML/Skripte nicht als Bild", () => {
    expect(detectFileType(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(detectFileType(Buffer.from("%PDF-1.7 aaaaaaaaaaaaaa"))).toBeNull();
    expect(detectFileType(Buffer.from("GIF89a..........."))).toBeNull();
  });
});

describe("Upload-Verarbeitung", () => {
  it("entfernt EXIF/GPS-Metadaten durch Neukodierung", async () => {
    const input = await jpegWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processUpload(file(input), { allowVideo: false, keyPrefix: "cases" });
    expect(out.mimeType).toBe("image/webp");
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(out.storageKey).toMatch(/^cases\/\d{6}\/[a-z0-9x]+\.webp$/);
    expect(out.thumb).not.toBeNull();
  });
  it("ignoriert Dateiendung und Client-MIME (umbenannte HTML-Datei)", async () => {
    const html = Buffer.from("<html><body><script>alert(document.cookie)</script></body></html>");
    await expect(processUpload(file(html, "bild.jpg", "image/jpeg"), { allowVideo: false, keyPrefix: "cases" })).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });
  it("weist Polyglot-/beschädigte Dateien mit gültigem Header ab", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("<script>alert(1)</script>".repeat(10))]);
    await expect(processUpload(file(fake), { allowVideo: false, keyPrefix: "cases" })).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });
  it("weist zu große Dateien ab", async () => {
    const big = Buffer.alloc(9 * 1024 * 1024, 0);
    big.set([0xff, 0xd8, 0xff], 0);
    await expect(processUpload(file(big), { allowVideo: false, keyPrefix: "cases" })).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });
  it("erlaubt Videos nur, wenn ausdrücklich zugelassen", async () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(32)]);
    await expect(processUpload(file(mp4, "v.mp4", "video/mp4"), { allowVideo: false, keyPrefix: "hints" })).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
    const ok = await processUpload(file(mp4, "v.mp4", "video/mp4"), { allowVideo: true, keyPrefix: "hints" });
    expect(ok.kind).toBe("video");
  });
  it("weist leere Dateien ab", async () => {
    await expect(processUpload(file(Buffer.alloc(0)), { allowVideo: false, keyPrefix: "cases" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
