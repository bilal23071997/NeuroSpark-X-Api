/** The names of the static roles stored in the `roles` table. Only staff sign in. */
export enum Role {
  Admin = 'admin',
  Editor = 'editor',
}

/** Every role can sign in to the admin portal; a route with no @Roles() allows all of them. */
export const STAFF_ROLES = Object.values(Role);
