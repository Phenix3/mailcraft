import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { loginUser, registerUser } from "./auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import type { User } from "../drizzle/schema";
import { marketingRouter } from "./routers/marketing";

/** Session-safe user payload (never expose passwordHash to the client). */
const publicUser = (user: User) => ({
  id: user.id,
  openId: user.openId,
  name: user.name,
  email: user.email,
  loginMethod: user.loginMethod,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastSignedIn: user.lastSignedIn,
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts =>
      opts.ctx.user ? publicUser(opts.ctx.user) : null
    ),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().max(120).optional(),
          email: z.string().trim().toLowerCase().email().max(320),
          password: z.string().min(8).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await registerUser({
          name: input.name ?? "",
          email: input.email,
          password: input.password,
        });
        if ("error" in result) {
          throw new TRPCError({
            code:
              result.error === "email_taken"
                ? "CONFLICT"
                : result.error === "password_too_short"
                  ? "BAD_REQUEST"
                  : "INTERNAL_SERVER_ERROR",
            message:
              result.error === "email_taken"
                ? "Un compte existe déjà avec cet email."
                : result.error === "password_too_short"
                  ? "Le mot de passe doit contenir au moins 8 caractères."
                  : "Impossible de créer le compte pour le moment.",
          });
        }
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        return publicUser(result.user);
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().toLowerCase().max(320),
          password: z.string().min(1).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await loginUser(input.email, input.password);
        if ("error" in result) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou mot de passe incorrect.",
          });
        }
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        return publicUser(result.user);
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  marketing: marketingRouter,
});

export type AppRouter = typeof appRouter;
