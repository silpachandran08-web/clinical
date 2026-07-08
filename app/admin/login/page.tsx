import { login } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="container" style={{ maxWidth: 360, marginTop: 80 }}>
      <div className="card">
        <h1>Clinic Admin</h1>
        <p className="muted">Sign in to manage departments, doctors, and appointments.</p>
        <form action={login} className="stack" style={{ marginTop: 16 }}>
          <label>
            Password
            <input type="password" name="password" required autoFocus />
          </label>
          {params.error && <p className="error">Incorrect password.</p>}
          <button type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
