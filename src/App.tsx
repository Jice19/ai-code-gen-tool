function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">AI Code Gen</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Generate React components from natural language
        </p>
      </header>
      <main className="h-[calc(100vh-73px)] flex">
        <aside className="w-80 border-r border-zinc-800 p-4 flex flex-col gap-4">
          <div className="text-sm text-zinc-400">Input Panel</div>
        </aside>
        <section className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            <div className="text-sm text-zinc-400">Code Editor / Preview</div>
          </div>
        </section>
        <aside className="w-80 border-l border-zinc-800 p-4 flex flex-col gap-4">
          <div className="text-sm text-zinc-400">Chat Panel</div>
        </aside>
      </main>
    </div>
  )
}

export default App
