import { beforeEach, describe, expect, it } from "vitest";

import {
  getSellerApplication,
  readSellerApplications,
  reviewSellerApplication,
  submitSellerApplication,
} from "@/lib/seller-applications";

const draft = {
  email: "  New.Seller@Example.com ",
  name: "New Seller",
  storeName: "New Seller Studio",
  phone: "+234 800 000 0000",
  productDescription: "Handmade goods.",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("seller applications", () => {
  it("does not seed a seller application", () => {
    expect(readSellerApplications()).toHaveLength(0);
  });

  it("drops the retired Shewa application from stored data", () => {
    window.localStorage.setItem(
      "suprecart-seller-applications",
      JSON.stringify([
        {
          email: "shewa@gmail.com",
          name: "Bello-lawal Dorcas",
          storeName: "Shewa Studio",
          phone: "+234 803 000 0000",
          productDescription: "Considered footwear and everyday accessories.",
          status: "approved",
          submittedAt: "2026-08-28T09:30:00.000Z",
        },
      ]),
    );

    expect(readSellerApplications()).toHaveLength(0);
  });

  it("submits a normalized pending application", () => {
    const application = submitSellerApplication(draft);

    expect(application).toMatchObject({
      email: "new.seller@example.com",
      status: "pending",
    });
    expect(application.reviewedAt).toBeUndefined();
    expect(application.reviewNote).toBeUndefined();
    expect(readSellerApplications()).toHaveLength(1);
  });

  it("replaces an existing application when it is resubmitted", () => {
    submitSellerApplication(draft);
    submitSellerApplication({ ...draft, storeName: "Renamed Studio" });

    expect(readSellerApplications()).toHaveLength(1);
    expect(getSellerApplication(draft.email)).toMatchObject({
      storeName: "Renamed Studio",
      status: "pending",
    });
  });

  it("approves an application with a review note", () => {
    submitSellerApplication(draft);
    const reviewed = reviewSellerApplication(draft.email, "approved", " Approved for testing. ");

    expect(reviewed).toMatchObject({
      status: "approved",
      reviewNote: "Approved for testing.",
    });
    expect(reviewed?.reviewedAt).toBeTruthy();
    expect(getSellerApplication(draft.email)?.status).toBe("approved");
  });

  it("rejects an application and clears a previous review note", () => {
    submitSellerApplication(draft);
    reviewSellerApplication(draft.email, "approved", "Approved for testing.");
    const reviewed = reviewSellerApplication(draft.email, "rejected");

    expect(reviewed).toMatchObject({ status: "rejected" });
    expect(reviewed?.reviewNote).toBeUndefined();
  });

  it("returns null when reviewing an unknown application", () => {
    expect(reviewSellerApplication("unknown@example.com", "approved")).toBeNull();
  });
});
