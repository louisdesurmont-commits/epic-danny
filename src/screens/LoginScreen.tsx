import { useState } from "react";
import { signInWithUsername, type AppUser } from "../services/authService";

type Props = {
  onLogin: (user: AppUser) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!username.trim() || !password) {
      alert("Nom d'utilisateur et mot de passe obligatoires.");
      return;
    }

    try {
      setIsLoading(true);
      const user = await signInWithUsername(username, password);
      onLogin(user);
    } catch (error) {
      console.error(error);
      alert("Identifiants incorrects.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto mt-20 max-w-sm rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Connexion</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nom d'utilisateur
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Mot de passe
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
