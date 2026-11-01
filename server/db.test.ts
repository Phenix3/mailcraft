import { describe, expect, it } from "vitest";
import { shouldSuppressAfterBounce } from "./db";

describe("gestion des rebonds", () => {
  it("supprime uniquement les rebonds définitifs des futures diffusions", () => {
    expect(shouldSuppressAfterBounce("hard")).toBe(true);
    expect(shouldSuppressAfterBounce("soft")).toBe(false);
  });
});
