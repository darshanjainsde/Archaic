export function AuthShell({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <main className="container-x grid gap-10 py-12 md:py-20 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4 lg:pt-6">
        <h1 className="text-5xl md:text-7xl">{title}</h1>
        {text && <p className="max-w-md text-lg">{text}</p>}
      </div>
      <div className="w-full max-w-md bg-surface p-6 md:p-8 lg:justify-self-end" style={{ borderRadius: "var(--radius)" }}>{children}</div>
    </main>
  );
}
