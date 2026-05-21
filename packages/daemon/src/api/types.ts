import type { Context } from "hono";

export type Env = {
  Variables: {
    userId: string;
    email: string;
  };
};

export type AppContext = Context<Env>;
