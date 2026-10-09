import { createFileRoute } from "@tanstack/react-router";
import SellerPortal from "../../seller-portal/src/SellerPortal";

export const Route = createFileRoute("/sellers")({
  head: () => ({
    meta: [
      { title: "Sell with SupreCart" },
      {
        name: "description",
        content: "Apply to sell on SupreCart, manage your products and track your sales.",
      },
    ],
  }),
  component: SellerPortal,
});
