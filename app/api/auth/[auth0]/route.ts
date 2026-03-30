import { handleAuth } from "@auth0/nextjs-auth0";

const authHandler = handleAuth();

export const GET = authHandler;
export const POST = authHandler;
