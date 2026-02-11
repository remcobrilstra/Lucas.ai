import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/db/prisma"
import { compare } from "bcryptjs"
import { loginSchema } from "@/lib/validators"
import { Role } from "@/lib/types/roles"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: Role
      organizationId?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role?: Role
    organizationId?: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) {
            return null
          }

          const isValidPassword = await compare(password, user.password)

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
      }

      // Fetch user's role and organization on every token refresh
      // or when explicitly triggered (e.g., after role update)
      if (token.id && (trigger === "signIn" || trigger === "update" || !token.role)) {
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: token.id },
          orderBy: { createdAt: "desc" }, // Get most recent org membership
          select: {
            role: true,
            organizationId: true,
          },
        })

        if (membership) {
          token.role = membership.role as Role
          token.organizationId = membership.organizationId
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role
        session.user.organizationId = token.organizationId
      }
      return session
    },
  },
})
