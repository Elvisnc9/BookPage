declare namespace App {
  interface Locals {
    /** The signed-in owner on app-host pages (set by middleware). */
    me?: import('./lib/api').Me;
  }
}
