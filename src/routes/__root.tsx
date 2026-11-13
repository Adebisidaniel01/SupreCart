import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import appThemeCss from "../app-theme.css?url";
import { trackException } from "../lib/analytics";
import { Analytics } from "../components/Analytics";
import { Storefront } from "../components/storefront";
import { CookieConsent } from "../components/CookieConsent";
import { Button } from "../components/ui/button";
import { THEME_INIT_SCRIPT } from "../lib/theme";

function NotFoundComponent() {
  return (
    <main id="main-content" tabIndex={-1} className="page-width info-page">
      <section className="info-card">
        <p className="eyebrow">404 · PAGE NOT FOUND</p>
        <h1>We couldn’t find that page.</h1>
        <p>
          The link may be broken, or the page may have moved. Head back to the marketplace to keep
          browsing independent finds.
        </p>
        <Button asChild>
          <Link to="/">Back to SupreCart</Link>
        </Button>
      </section>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    trackException(error, true);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="page-width info-page">
      <section className="info-card">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>This page didn’t load.</h1>
        <p>
          Something went wrong on our end. Try loading the page again, or head back to the
          marketplace.
        </p>
        <div className="info-card-actions">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SupreCart — Good finds, all in one place" },
      {
        name: "description",
        content:
          "Discover independent sellers and considered finds across fashion, footwear, home, tech, beauty and more.",
      },
      { name: "author", content: "SupreCart" },
      { property: "og:title", content: "SupreCart — Good finds, all in one place" },
      {
        property: "og:description",
        content: "Discover your kind of good across the SupreCart marketplace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0f1513" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: appThemeCss,
      },
      { rel: "icon", href: "/suprecart-favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      <Analytics />
      <CookieConsent policyHref="/info/cookies" />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/sellers") ? (
        <Outlet />
      ) : (
        <Storefront>
          <Outlet />
        </Storefront>
      )}
    </QueryClientProvider>
  );
}
