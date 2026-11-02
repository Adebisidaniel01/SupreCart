import { createContext, useContext } from "react";
import type { getAdminDashboard } from "@/lib/admin";
import type { AccountModerationStatus, DemoAccount } from "@/lib/demo-accounts";
import type { SellerApplication } from "@/lib/seller-applications";

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export type AdminPerson = DemoAccount & {
  avatar: string;
  status: AccountModerationStatus;
  reason: string;
};

export type PeopleFilter = "all" | "buyer" | "seller";

export type AdminWorkspaceValue = {
  dashboard: AdminDashboard;
  sellerApplications: SellerApplication[];
  pendingSellerApplications: number;
  reviewNotes: Record<string, string>;
  onReviewNoteChange: (email: string, value: string) => void;
  reviewApplication: (application: SellerApplication, status: "approved" | "rejected") => void;
  people: AdminPerson[];
  peopleFilter: PeopleFilter;
  onPeopleFilterChange: (filter: PeopleFilter) => void;
  moderationNotes: Record<string, string>;
  onModerationNoteChange: (email: string, value: string) => void;
  moderatePerson: (person: AdminPerson, status: AccountModerationStatus) => void;
  removePerson: (person: AdminPerson) => void;
  buyerCount: number;
  sellerCount: number;
  bannedCount: number;
  signOut: () => Promise<void>;
  signingOut: boolean;
};

export const AdminWorkspaceContext = createContext<AdminWorkspaceValue | null>(null);

export function useAdminWorkspace() {
  const workspace = useContext(AdminWorkspaceContext);
  if (!workspace) {
    throw new Error("useAdminWorkspace must be used inside the admin workspace layout.");
  }
  return workspace;
}
