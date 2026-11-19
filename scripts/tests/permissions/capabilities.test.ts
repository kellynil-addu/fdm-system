import { describe, it, expect } from "vitest";
import {
  either,
  all,
  checkPermissionRule,
  CAPABILITIES,
  type PermissionRule,
} from "@/lib/capabilities";
import { evaluateRuleAsync } from "@/lib/actions/auth-guard";

describe("Capability & Permission Rules (either / all)", () => {
  it("constructs either and all rule objects with correct types", () => {
    const eitherRule = either("clients.update", "clients.create");
    expect(eitherRule).toEqual({
      type: "either",
      rules: ["clients.update", "clients.create"],
    });

    const allRule = all("properties.update", "clients.update");
    expect(allRule).toEqual({
      type: "all",
      rules: ["properties.update", "clients.update"],
    });
  });

  it("evaluates single permission rules", () => {
    const hasPerm = (p: string) => p === "clients.read";
    expect(checkPermissionRule("clients.read", hasPerm)).toBe(true);
    expect(checkPermissionRule("clients.update", hasPerm)).toBe(false);
  });

  it("evaluates either() rule with logical OR behavior", () => {
    const rule = either("clients.update", "clients.create");

    expect(checkPermissionRule(rule, (p) => p === "clients.create")).toBe(true);
    expect(checkPermissionRule(rule, (p) => p === "clients.update")).toBe(true);
    expect(checkPermissionRule(rule, (p) => ["clients.create", "clients.update"].includes(p))).toBe(true);
    expect(checkPermissionRule(rule, (p) => p === "clients.read")).toBe(false);
  });

  it("evaluates all() rule with logical AND behavior", () => {
    const rule = all("properties.update", "clients.update");

    expect(checkPermissionRule(rule, (p) => p === "properties.update")).toBe(false);
    expect(checkPermissionRule(rule, (p) => p === "clients.update")).toBe(false);
    expect(
      checkPermissionRule(rule, (p) => ["properties.update", "clients.update"].includes(p))
    ).toBe(true);
  });

  it("evaluates nested either and all rules", () => {
    const nestedRule: PermissionRule = either(
      "system.create",
      all("clients.update", "billing.update")
    );

    expect(checkPermissionRule(nestedRule, (p) => p === "system.create")).toBe(true);
    expect(
      checkPermissionRule(nestedRule, (p) => ["clients.update", "billing.update"].includes(p))
    ).toBe(true);
    expect(checkPermissionRule(nestedRule, (p) => p === "clients.update")).toBe(false);
    expect(checkPermissionRule(nestedRule, (p) => p === "clients.read")).toBe(false);
  });

  it("resolves capabilities mapped to rules", () => {
    const hasOnlyCreate = (p: string) => p === "clients.create";
    const hasOnlyUpdate = (p: string) => p === "clients.update";
    const hasNeither = () => false;

    expect(checkPermissionRule(CAPABILITIES["client.archive"], hasOnlyCreate)).toBe(true);
    expect(checkPermissionRule(CAPABILITIES["client.archive"], hasOnlyUpdate)).toBe(true);
    expect(checkPermissionRule(CAPABILITIES["client.archive"], hasNeither)).toBe(false);

    expect(checkPermissionRule("client.archive", hasOnlyCreate)).toBe(true);
    expect(checkPermissionRule("client.edit", hasOnlyCreate)).toBe(false);
    expect(checkPermissionRule("client.edit", hasOnlyUpdate)).toBe(true);

    const lifecycleIntent = either("client.archive", "client.delete");
    expect(checkPermissionRule(lifecycleIntent, hasOnlyCreate)).toBe(true);
    expect(checkPermissionRule(lifecycleIntent, (p) => p === "clients.delete")).toBe(true);
    expect(checkPermissionRule(lifecycleIntent, (p) => p === "clients.read")).toBe(false);
  });

  it("evaluates rules asynchronously with evaluateRuleAsync", async () => {
    const asyncPerms = new Set(["clients.update"]);
    const hasPermAsync = async (p: string) => asyncPerms.has(p);

    const archiveAllowed = await evaluateRuleAsync(
      CAPABILITIES["client.archive"],
      hasPermAsync
    );
    expect(archiveAllowed).toBe(true);

    const deleteAllowed = await evaluateRuleAsync(
      CAPABILITIES["client.delete"],
      hasPermAsync
    );
    expect(deleteAllowed).toBe(false);
  });
});
