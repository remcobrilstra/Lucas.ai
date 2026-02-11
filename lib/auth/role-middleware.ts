import { auth } from "@/lib/auth/config";
import { Role } from "@/lib/types/roles";
import { NextResponse } from "next/server";
import { Permission, hasPermission } from "./permissions";

export type AuthSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: Role;
    organizationId?: string;
  };
};

/**
 * Get the authenticated session and user role
 * Returns null if not authenticated
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session as AuthSession;
}

/**
 * Require authentication for an API route
 * Returns the session or sends a 401 response
 */
export async function requireAuth(): Promise<
  | { session: AuthSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await getAuthSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      ),
    };
  }

  return { session };
}

/**
 * Require a specific permission for an API route
 * Returns the session or sends a 401/403 response
 */
export async function requirePermission(
  permission: Permission
): Promise<
  | { session: AuthSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  const { session, error } = await requireAuth();

  if (error) {
    return { error };
  }

  if (!session.user.role) {
    return {
      error: NextResponse.json(
        { error: "User role not found. Please contact support." },
        { status: 403 }
      ),
    };
  }

  if (!hasPermission(session.user.role, permission)) {
    return {
      error: NextResponse.json(
        {
          error: "Forbidden. You don't have permission to perform this action.",
          requiredPermission: permission,
          userRole: session.user.role,
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * Require one of multiple roles for an API route
 * Returns the session or sends a 401/403 response
 */
export async function requireRole(
  allowedRoles: Role[]
): Promise<
  | { session: AuthSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  const { session, error } = await requireAuth();

  if (error) {
    return { error };
  }

  if (!session.user.role) {
    return {
      error: NextResponse.json(
        { error: "User role not found. Please contact support." },
        { status: 403 }
      ),
    };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return {
      error: NextResponse.json(
        {
          error: "Forbidden. You don't have permission to access this resource.",
          allowedRoles,
          userRole: session.user.role,
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * Require admin role for an API route
 */
export async function requireAdmin(): Promise<
  | { session: AuthSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  return requireRole([Role.ADMIN]);
}

/**
 * Require admin or developer role for an API route
 */
export async function requireDeveloper(): Promise<
  | { session: AuthSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  return requireRole([Role.ADMIN, Role.DEVELOPER]);
}
