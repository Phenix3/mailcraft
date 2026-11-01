import { describe, expect, it } from "vitest";
import { previewDeviceClass } from "./email-preview";

describe("prévisualisation responsive", () => {
  it("applique une largeur propre à chaque format d’appareil", () => {
    expect(previewDeviceClass("mobile")).toBe("max-w-[320px]");
    expect(previewDeviceClass("tablet")).toBe("max-w-[560px]");
    expect(previewDeviceClass("desktop")).toBe("max-w-[760px]");
  });
});
