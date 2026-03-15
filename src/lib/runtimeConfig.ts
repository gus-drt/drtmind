const REQUIRED_PUBLIC_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

export function getMissingPublicConfig(): string[] {
  return REQUIRED_PUBLIC_VARS.filter(
    (key) => !import.meta.env[key]
  );
}
