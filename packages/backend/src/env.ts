const getEnv = (name: string): string => {
  const maybeEnv = process.env[name];
  if (maybeEnv === undefined) {
    throw new Error(`Environment variable ${name} is not defined.`);
  }
  return maybeEnv;
};

export const dbPort = parseInt(getEnv("DB_PORT"));
export const dbUser = getEnv("DB_USER");
export const dbName = getEnv("DB_NAME");
export const dbPassword = getEnv("DB_PASS");
export const dbHost = getEnv("DB_HOST");

export const apiPort = parseInt(getEnv("API_PORT"));
