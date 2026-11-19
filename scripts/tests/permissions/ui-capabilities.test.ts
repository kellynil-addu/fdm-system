import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { hasPermission } from "@/lib/permissions";
import {
  loginAsAdmin,
  loginAs,
  logoutUser,
  createTemporaryUser,
  runTrackedCleanups,
  type TemporaryUser,
} from "../framework/session";

describe("Role UI Capabilities & Domain RBAC Evaluation", () => {
  let billingUser: TemporaryUser;
  let legalUser: TemporaryUser;
  let adminStaffUser: TemporaryUser;

  beforeAll(async () => {
    billingUser = await createTemporaryUser({
      emailPrefix: "test-ui-billing",
      roleNames: ["billing_staff"],
    });
    legalUser = await createTemporaryUser({
      emailPrefix: "test-ui-legal",
      roleNames: ["legal_staff"],
    });
    adminStaffUser = await createTemporaryUser({
      emailPrefix: "test-ui-admin-staff",
      roleNames: ["admin_staff"],
    });
  });

  beforeEach(async () => {
    await logoutUser();
  });

  afterAll(async () => {
    await logoutUser();
    await runTrackedCleanups();
  });

  it("verifies billing_staff has read-only access to clients and properties, but can update billing", async () => {
    await loginAs(billingUser.email, billingUser.password);

    expect(await hasPermission("clients.read")).toBe(true);
    expect(await hasPermission("clients.create")).toBe(false);
    expect(await hasPermission("clients.update")).toBe(false);
    expect(await hasPermission("clients.delete")).toBe(false);

    expect(await hasPermission("properties.read")).toBe(true);
    expect(await hasPermission("properties.create")).toBe(false);
    expect(await hasPermission("properties.update")).toBe(false);
    expect(await hasPermission("properties.delete")).toBe(false);

    expect(await hasPermission("billing.update")).toBe(true);
    expect(await hasPermission("legal.update")).toBe(false);
  });

  it("verifies legal_staff has read-only access to clients and properties, but can update legal", async () => {
    await loginAs(legalUser.email, legalUser.password);

    expect(await hasPermission("clients.read")).toBe(true);
    expect(await hasPermission("clients.create")).toBe(false);
    expect(await hasPermission("clients.update")).toBe(false);
    expect(await hasPermission("clients.delete")).toBe(false);

    expect(await hasPermission("properties.read")).toBe(true);
    expect(await hasPermission("properties.create")).toBe(false);
    expect(await hasPermission("properties.update")).toBe(false);
    expect(await hasPermission("properties.delete")).toBe(false);

    expect(await hasPermission("legal.update")).toBe(true);
    expect(await hasPermission("billing.update")).toBe(false);
  });

  it("verifies admin_staff has create and update access across clients, properties, and workflows", async () => {
    await loginAs(adminStaffUser.email, adminStaffUser.password);

    expect(await hasPermission("clients.read")).toBe(true);
    expect(await hasPermission("clients.create")).toBe(true);
    expect(await hasPermission("clients.update")).toBe(true);
    expect(await hasPermission("clients.delete")).toBe(false);

    expect(await hasPermission("properties.read")).toBe(true);
    expect(await hasPermission("properties.create")).toBe(true);
    expect(await hasPermission("properties.update")).toBe(true);
    expect(await hasPermission("properties.delete")).toBe(false);

    expect(await hasPermission("billing.update")).toBe(true);
    expect(await hasPermission("legal.update")).toBe(true);
  });

  it("verifies system_admin has full access across all operations and deletions", async () => {
    await loginAsAdmin();

    expect(await hasPermission("clients.create")).toBe(true);
    expect(await hasPermission("clients.update")).toBe(true);
    expect(await hasPermission("clients.delete")).toBe(true);

    expect(await hasPermission("properties.create")).toBe(true);
    expect(await hasPermission("properties.update")).toBe(true);
    expect(await hasPermission("properties.delete")).toBe(true);

    expect(await hasPermission("billing.update")).toBe(true);
    expect(await hasPermission("legal.update")).toBe(true);
  });
});
