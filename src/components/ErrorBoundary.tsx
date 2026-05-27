import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠</div>
            <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
            <p className="text-xs text-zinc-500 mb-6 font-mono bg-zinc-900 rounded-lg p-3 text-left overflow-auto max-h-32">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
