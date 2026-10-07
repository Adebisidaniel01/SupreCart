<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Use TanStack Start React routes with Tailwind v4; the hosted environment does not support a Python web server.
- Keep demo catalog data in a shared browser-safe module and share storefront controls across home and shop routes so shopping state stays consistent.
- Shopping and newsletter controls are preview-only until real inventory, checkout, and subscriptions are connected; never claim an order or subscription was processed.
