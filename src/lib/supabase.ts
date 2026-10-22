/**
 * Supabase has been fully disconnected from SupreCart.
 *
 * `supabase` is always `null`, so every legacy Supabase call site short-circuits
 * on its `if (!supabase)` guard and never runs. The shapes below only exist so
 * those guarded branches keep compiling until they are removed.
 *
 * Sign-in, sign-up and seller applications now run on local, on-device preview
 * accounts — see `src/lib/demo-accounts.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type User = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  user_metadata: Record<string, string>;
};

export type Session = {
  user: User;
  access_token: string;
};

export type SupabaseError = {
  message: string;
  code?: string;
};

export type SupabaseResult = {
  data: any;
  error: SupabaseError | null;
};

type SupabaseQuery = PromiseLike<SupabaseResult> & {
  select: (...args: any[]) => SupabaseQuery;
  insert: (...args: any[]) => SupabaseQuery;
  upsert: (...args: any[]) => SupabaseQuery;
  update: (...args: any[]) => SupabaseQuery;
  delete: (...args: any[]) => SupabaseQuery;
  eq: (...args: any[]) => SupabaseQuery;
  gt: (...args: any[]) => SupabaseQuery;
  in: (...args: any[]) => SupabaseQuery;
  order: (...args: any[]) => SupabaseQuery;
  single: () => Promise<SupabaseResult>;
  maybeSingle: () => Promise<SupabaseResult>;
};

type SupabaseAuth = {
  getSession: () => Promise<{ data: { session: Session | null }; error: SupabaseError | null }>;
  getUser: () => Promise<{ data: { user: User }; error: SupabaseError | null }>;
  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ data: { session: Session | null }; error: SupabaseError | null }>;
  signUp: (credentials: {
    email: string;
    password: string;
    options?: Record<string, any>;
  }) => Promise<{ data: { session: Session | null; user?: User | null }; error: SupabaseError | null }>;
  signOut: (options?: { scope?: string }) => Promise<{ error: SupabaseError | null }>;
  updateUser: (attributes: { email?: string; password?: string }) => Promise<{
    error: SupabaseError | null;
  }>;
  resend: (params: { type: string; email: string }) => Promise<{ error: SupabaseError | null }>;
  resetPasswordForEmail: (
    email: string,
    options?: Record<string, any>,
  ) => Promise<{ error: SupabaseError | null }>;
};

type SupabaseStorageBucket = {
  upload: (
    path: string,
    body: any,
    options?: Record<string, any>,
  ) => Promise<{ error: SupabaseError | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  createSignedUrl: (
    path: string,
    expiresIn: number,
  ) => Promise<{ data: { signedUrl: string }; error: SupabaseError | null }>;
  remove: (paths: string[]) => Promise<{ error: SupabaseError | null }>;
};

type SupabaseChannel = {
  on: (...args: any[]) => SupabaseChannel;
  subscribe: (callback?: (status: string) => void) => SupabaseChannel;
};

export type SupabaseClient = {
  auth: SupabaseAuth;
  storage: { from: (bucket: string) => SupabaseStorageBucket };
  from: (table: string) => SupabaseQuery;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<SupabaseResult>;
  channel: (name: string) => SupabaseChannel;
  removeChannel: (channel: SupabaseChannel) => Promise<unknown>;
};

export const supabase: SupabaseClient | null = null;
