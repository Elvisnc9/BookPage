/// <reference types="@clerk/astro/env" />

declare namespace App {
  interface Locals {
    /** The signed-in owner on app-host pages (set by middleware). */
    me?: import('./lib/api').Me;
    /** The owner's Clerk session token for API calls (app host only; short-lived). */
    apiToken?: string | null;
    /** The business slug on booking-page hosts (set by middleware). */
    slug?: string;
  }
}
