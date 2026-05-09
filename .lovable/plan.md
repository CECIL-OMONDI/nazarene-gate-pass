## Remaining Phase 2 Items (17)

Group the work into 3 migrations + edge functions + UI updates.

### Migration A — Schema & audit
- `audit_logs` table (actor, action, entity, entity_id, payload jsonb, created_at) + RLS read-only for admin/engineer.
- `order_comments` table (order_id, user_id, body, created_at) + RLS for order participants.
- `material_transfers` table (from_site, to_site, material_id, qty, status, created_by, approved_by) + RPCs `request_transfer`, `approve_transfer`.
- `materials`: add `sku`, `supplier`.
- `sites`: add `progress_stage` enum (planning, foundation, walling, roofing, finishing, handover) + `progress_notes`.
- `profiles`: add `is_active boolean default true`, `last_login_at timestamptz`.
- `orders`: add `cancellation_reason`, `cancelled_at`, `cancelled_by` (post-dispatch reversal).
- New RPCs: `cancel_dispatched_order` (returns goods to yard), `set_site_progress`, `deactivate_user`, `reactivate_user`, `change_password_self`, `transfer_material`.
- Quantity sanity: trigger on `order_items` rejecting qty > 100000.

### Migration B — Audit triggers
- Generic trigger logging insert/update/delete on `orders`, `order_items`, `materials`, `sites`, `tools`, `user_roles` into `audit_logs`.

### Edge functions
- `signup-request`: hash password with bcrypt before storing (replaces plaintext). `approve-signup` updated to verify hash + create auth user with original password (kept in encrypted form using a server-side secret) — alternative: store as bcrypt and require user to set new password on first login. **Decision needed below.**
- `change-password`: authenticated, calls `auth.admin.updateUserById`.
- `deactivate-user` / `reactivate-user`: admin-only.
- `update-last-login`: trigger via auth hook on sign-in (or client-side rpc on app load).
- Phone normalization helper (server side in `signup-request` and a new `normalize-phones` one-shot for existing rows).

### UI
- **AppShell**: dark/light theme toggle (persisted), last-login chip, "Change Password" item in user menu.
- **Admin**:
  - Audit Log tab (filter by entity/actor, CSV export).
  - Users tab: deactivate/reactivate buttons (replace hard delete as default), shows last login.
  - Materials editor: SKU + supplier columns.
  - Sites: progress stage selector + notes.
  - Material transfers approval queue.
- **Yard**: cancel dispatched order (returns to yard) with reason; SKU shown in inventory; search/filter on alerts.
- **Site Keeper**: realtime toast when an order is dispatched to their site (Supabase channel); request material transfer to other site.
- **Contractor**: order qty validator (warn >10000, block >100000); order comments thread; site progress badge; workers add/edit form (skilled/unskilled counts); request material transfer.
- **All long lists**: ensure search + sticky scroll containers (already partial).

### Decision needed
**Plaintext passwords in `signup_requests`** — two safe options:
1. **Hash on submit, force reset on approval** — admin approves, user receives a one-time link / must use "Forgot password" before first login. Most secure.
2. **Encrypt with server secret, decrypt at approval** — preserves chosen password but adds a secret-key dependency.

I'll default to **Option 1** unless you say otherwise.

### Out of scope / ask later
- SMS/push notifications (only in-app realtime toasts here).
- File uploads for delivery photos (would need storage bucket + UI; can add next round if wanted).
