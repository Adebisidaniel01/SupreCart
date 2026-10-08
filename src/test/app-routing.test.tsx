import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it.each(["/", "/shop", "/login", "/signup", "/checkout", "/careers", "/info/contact", "/admin"])(
    "matches %s instead of falling back to not found",
    (path) => {
      const matches = router.matchRoutes(path);

      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    },
  );
});
