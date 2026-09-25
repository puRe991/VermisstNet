import { describe, expect, it } from "vitest";
import { storage, thumbKey } from "@/server/storage";

describe("Storage", () => {
  it("speichert und liest Datei + Thumbnail", async () => {
    const key = "cases/202609/abc123.webp";
    await storage().put(key, Buffer.from("full"));
    await storage().put(thumbKey(key), Buffer.from("thumb"));
    expect((await storage().get(key))?.toString()).toBe("full");
    expect((await storage().get(thumbKey(key)))?.toString()).toBe("thumb");
    await storage().delete(key);
    expect(await storage().get(key)).toBeNull();
  });

  it("verhindert Path Traversal und fremde Endungen", async () => {
    for (const bad of ["../etc/passwd.webp", "cases/../../x.webp", "/abs/path.webp", "cases/x.html", "cases/x.webp/../y.webp", "Cases/X.webp"]) {
      await expect(storage().get(bad), bad).rejects.toThrow();
    }
  });
});
