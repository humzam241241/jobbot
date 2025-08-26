import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      role: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}
