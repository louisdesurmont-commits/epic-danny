import { supabase } from "../lib/supabase";

export type AppUser = {
  id: string;
  username: string;
};

function usernameToEmail(username: string) {
  const value = username.trim().toLowerCase();

  if (value.includes("@")) {
    return value;
  }

  return `${value}@app.local`;
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<AppUser> {
  const email = usernameToEmail(username);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw error ?? new Error("Connexion impossible.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    throw profileError ?? new Error("Profil utilisateur introuvable.");
  }

  return {
    id: data.user.id,
    username: profile.username,
  };
}

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getUser();

  if (!data.user) return null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("id", data.user.id)
    .single();

  if (error || !profile) return null;

  return {
    id: data.user.id,
    username: profile.username,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
