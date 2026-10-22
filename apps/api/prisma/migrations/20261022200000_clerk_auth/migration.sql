-- Clerk takes over sign-in: it owns sessions and cookies, so our sessions table
-- goes, and owners are matched by Clerk's user id instead of Google's.
-- Existing owners (pre-launch: the demo and test accounts) are linked by email
-- on their first Clerk sign-in.

DROP TABLE "sessions";

DROP INDEX "users_google_id_key";
ALTER TABLE "users" DROP COLUMN "google_id";
ALTER TABLE "users" ADD COLUMN "clerk_user_id" TEXT;
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");
