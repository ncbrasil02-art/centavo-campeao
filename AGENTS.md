# Architecture rules

- Administrative authorization is stored in `public.user_roles` and checked through server-controlled database functions, preventing browser-side privilege escalation.
- Public visual theming is driven by semantic CSS tokens and tenant settings so administrators can customize branding without component rewrites.