export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="container-x flex min-h-dvh flex-col items-start justify-center gap-6 py-20">
      <h1 className="text-5xl md:text-7xl">You are offline</h1>
      <p className="max-w-md text-lg">The wick is still warm. Check your connection and try again — your bag is saved on this device.</p>
      <a href="/" className="btn btn-primary">Try again</a>
    </main>
  );
}
