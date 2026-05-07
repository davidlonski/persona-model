export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">PersonaModel</h1>
      <p className="text-lg text-gray-600 mb-8">
        Cross-device AI reminder agent
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <Card
          title="Today"
          description="Your P0 and P1 reminders for today"
          href="/dashboard"
        />
        <Card
          title="Timeline"
          description="Week and month view of upcoming items"
          href="/timeline"
        />
        <Card
          title="Settings"
          description="Data sources, delivery, and preferences"
          href="/settings"
        />
      </div>
    </main>
  );
}

function Card({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-6 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-500">{description}</p>
    </a>
  );
}
