import { describe, expect, it } from "vitest";
import { detectLocaleFromReply } from "../src/ai/orchestrator.js";

describe("detectLocaleFromReply", () => {
  it("detects Arabic script", () => {
    expect(detectLocaleFromReply("عربي")).toBe("AR");
    expect(detectLocaleFromReply("بالعربية من فضلك")).toBe("AR");
  });

  it("detects the word Arabic spelled in Latin script", () => {
    expect(detectLocaleFromReply("Arabic")).toBe("AR");
    expect(detectLocaleFromReply("arabic please")).toBe("AR");
  });

  it("defaults to English for anything else", () => {
    expect(detectLocaleFromReply("English")).toBe("EN");
    expect(detectLocaleFromReply("eng")).toBe("EN");
    expect(detectLocaleFromReply("1")).toBe("EN");
    expect(detectLocaleFromReply("yes please")).toBe("EN");
  });
});
