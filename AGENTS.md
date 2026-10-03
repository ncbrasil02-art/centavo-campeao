# Architecture rules

- Administrative authorization is stored in `public.user_roles` and checked through server-controlled database functions, preventing browser-side privilege escalation.