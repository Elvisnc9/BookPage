declare namespace App {
  interface Locals {
    /** The signed-in owner on app-host pages (set by middleware). */
    me?: import('./lib/api').Me;
    /** The business slug on booking-page hosts (set by middleware). */
    slug?: string;
  }
}
