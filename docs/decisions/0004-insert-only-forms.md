# 0004 · Forms write to an insert-only Supabase table

**Context.** Join requests and messages must be stored reliably, readable by the committee, and safe from abuse,
without running our own server or paying for one.

**Decision.** Submissions go to Supabase (Postgres). Row Level Security lets the public key only *insert* rows with
`status = 'new'`; reading happens only in the Supabase dashboard. A trigger limits submissions (3 per email and 60 per
form per hour) across all hosts. The API validates with the same code as the browser (`lib/validate.ts`), and a unit
test checks those options match the database constraints. Email notification (Gmail SMTP) is optional and never blocks
saving.

**Consequences.** The publishable key can safely be public, which is what lets the static backup post directly to the
database. No submission is lost if email fails. Supabase free projects pause after inactivity; the handover checklist
covers restoring them.
