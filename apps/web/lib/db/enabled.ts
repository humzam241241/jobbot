export const DB_ENABLED = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? '');
