import { createRootRoute, Link, Outlet, useMatches } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeToggle } from '@/components/theme-toggle'
import { FileText } from 'lucide-react'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const matches = useMatches()
  const isEditorRoute = matches.some((m) => m.routeId.includes('editor'))

  // Don't show nav header on editor page
  if (isEditorRoute) {
    return <Outlet />
  }

  return (
    <>
      <nav className="bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
              >
                <FileText className="h-6 w-6" />
                PDF Editor
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  )
}
