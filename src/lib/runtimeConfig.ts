const REQUIRED_PUBLIC_VARS = [
  'VITE_SUPABASE_URL',
] as const;

export function getMissingPublicConfig(): string[] {
  const missing = REQUIRED_PUBLIC_VARS.filter(
    (key) => !import.meta.env[key]
  );
  
  // Check if either ANON_KEY or PUBLISHABLE_KEY is present
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }
  
  return missing;
}
