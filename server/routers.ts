import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const passwordHash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const passwordMatches = (password: string, stored: string | null) => {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
};
const credentials = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(200),
});
export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    setupStatus: publicProcedure.query(async () => ({
      configured: (await db.countLocalUsers()) > 0,
    })),
    setupAdmin: publicProcedure
      .input(credentials.extend({ name: z.string().trim().min(2).max(120) }))
      .mutation(async ({ input, ctx }) => {
        if ((await db.countLocalUsers()) > 0)
          throw new TRPCError({
            code: "CONFLICT",
            message: "O administrador inicial já foi configurado.",
          });
        const user = await db.createLocalUser({
          username: input.username,
          name: input.name,
          role: "admin",
          passwordHash: passwordHash(input.password),
        });
        if (!user)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível criar o administrador.",
          });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(
          COOKIE_NAME,
          await sdk.createSessionToken(user.openId, {
            name: user.name ?? input.username,
          }),
          cookieOptions
        );
        return { success: true } as const;
      }),
    loginPassword: publicProcedure
      .input(credentials)
      .mutation(async ({ input, ctx }) => {
        const user = await db.getLocalUserByUsername(input.username);
        if (
          !user ||
          !user.isActive ||
          !passwordMatches(input.password, user.passwordHash)
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Usuário ou senha inválidos.",
          });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(
          COOKIE_NAME,
          await sdk.createSessionToken(user.openId, {
            name: user.name ?? user.username ?? input.username,
          }),
          cookieOptions
        );
        return { success: true } as const;
      }),
    localUsers: adminProcedure.query(() => db.listLocalUsers()),
    createLocalUser: adminProcedure
      .input(
        credentials.extend({
          name: z.string().trim().min(2).max(120),
          role: z.enum(["user", "admin"]),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await db.createLocalUser({
            username: input.username,
            name: input.name,
            role: input.role,
            passwordHash: passwordHash(input.password),
          });
          return { success: true } as const;
        } catch {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Não foi possível criar o acesso. O usuário pode já existir.",
          });
        }
      }),
    toggleLocalUser: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => db.setLocalUserActive(input.id, input.isActive)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
