declare namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    DATABASE_URL: string;
    ALWAYS_SHOW_SIGNIN?: string;
    SKIP_DB?: string;
  }
}
