/**
 * Role enum - shared between client and server
 * Must match the Prisma Role enum
 */
export enum Role {
  ADMIN = "ADMIN",
  DEVELOPER = "DEVELOPER",
  USER = "USER",
}

/**
 * Type guard to check if a value is a valid Role
 */
export function isValidRole(value: unknown): value is Role {
  return (
    typeof value === "string" &&
    Object.values(Role).includes(value as Role)
  );
}
