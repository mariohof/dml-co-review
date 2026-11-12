import { DashboardDmrlList } from "@/components/dashboard/dmrl-list"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Überblick</p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-darkest">DMRL im Blick.</h1>
      </div>
      <DashboardDmrlList />
    </div>
  )
}
