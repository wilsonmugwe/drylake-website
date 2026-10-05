/*
 * Client status lifecycle rules (lib/clients/status.ts).
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CLIENT_STATUSES,
  availableStatusActions,
  checkClientStatusTransition,
  isClientOperational,
  isStatusSchemaRejection,
  isVisibleInDefaultClientList,
  parseClientStatus,
} from "../lib/clients/status.ts";

describe("parseClientStatus", () => {
  it("accepts the three lifecycle values in any casing", () => {
    assert.equal(parseClientStatus("active"), "ACTIVE");
    assert.equal(parseClientStatus(" Inactive "), "INACTIVE");
    assert.equal(parseClientStatus("ARCHIVED"), "ARCHIVED");
  });

  it("rejects anything else", () => {
    for (const value of ["", "DELETED", "PENDING", null, undefined, 1, {}]) {
      assert.equal(parseClientStatus(value), null);
    }
  });
});

describe("checkClientStatusTransition", () => {
  const allowed = [
    ["ACTIVE", "INACTIVE"],
    ["INACTIVE", "ACTIVE"],
    ["ACTIVE", "ARCHIVED"],
    ["INACTIVE", "ARCHIVED"],
    ["ARCHIVED", "ACTIVE"],
  ];

  for (const [from, to] of allowed) {
    it(`allows ${from} -> ${to}`, () => {
      assert.deepEqual(checkClientStatusTransition(from, to), { ok: true });
    });
  }

  it("refuses ARCHIVED -> INACTIVE (restore goes to ACTIVE)", () => {
    assert.equal(checkClientStatusTransition("ARCHIVED", "INACTIVE").ok, false);
  });

  it("refuses a no-op move", () => {
    for (const status of CLIENT_STATUSES) {
      assert.equal(checkClientStatusTransition(status, status).ok, false);
    }
  });

  it("refuses an unknown target", () => {
    assert.equal(checkClientStatusTransition("ACTIVE", "DELETED").ok, false);
  });

  it("lets a legacy or unknown current status be repaired", () => {
    assert.equal(checkClientStatusTransition("SUSPENDED", "ACTIVE").ok, true);
    assert.equal(checkClientStatusTransition(null, "ARCHIVED").ok, true);
  });
});

describe("availableStatusActions", () => {
  it("offers exactly the allowed targets", () => {
    assert.deepEqual(availableStatusActions("ACTIVE").map((a) => a.to), ["INACTIVE", "ARCHIVED"]);
    assert.deepEqual(availableStatusActions("INACTIVE").map((a) => a.to), ["ACTIVE", "ARCHIVED"]);
    assert.deepEqual(availableStatusActions("ARCHIVED").map((a) => a.to), ["ACTIVE"]);
  });

  it("requires confirmation only for archiving", () => {
    const archive = availableStatusActions("ACTIVE").find((a) => a.to === "ARCHIVED");
    const pause = availableStatusActions("ACTIVE").find((a) => a.to === "INACTIVE");

    assert.equal(archive.requiresConfirmation, true);
    assert.equal(pause.requiresConfirmation, false);
  });

  it("labels the way back from ARCHIVED as a restore", () => {
    assert.equal(availableStatusActions("ARCHIVED")[0].label, "Restore client");
  });

  it("never uses an em dash in user-visible copy", () => {
    for (const status of [...CLIENT_STATUSES, "LEGACY"]) {
      for (const action of availableStatusActions(status)) {
        assert.ok(!action.label.includes("—") && !action.description.includes("—"));
      }
    }
  });
});

describe("operational and list visibility", () => {
  it("only ACTIVE is operational", () => {
    assert.equal(isClientOperational("ACTIVE"), true);
    assert.equal(isClientOperational("INACTIVE"), false);
    assert.equal(isClientOperational("ARCHIVED"), false);
    assert.equal(isClientOperational("active"), false);
  });

  it("hides ARCHIVED from the default admin list only", () => {
    assert.equal(isVisibleInDefaultClientList("ARCHIVED"), false);
    assert.equal(isVisibleInDefaultClientList("archived"), false);
    assert.equal(isVisibleInDefaultClientList("INACTIVE"), true);
    assert.equal(isVisibleInDefaultClientList("ACTIVE"), true);
  });
});

describe("isStatusSchemaRejection", () => {
  it("recognises check and enum violations", () => {
    assert.equal(isStatusSchemaRejection({ code: "23514" }), true);
    assert.equal(isStatusSchemaRejection({ code: "22P02" }), true);
  });

  it("ignores other errors", () => {
    assert.equal(isStatusSchemaRejection({ code: "42501" }), false);
    assert.equal(isStatusSchemaRejection(null), false);
  });
});
