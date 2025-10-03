import type { Metadata } from "next"
import PartografApp from "@/components/partograf-app"

export const metadata: Metadata = {
  title: "Partograf Digital",
  description: "Mockup aplikasi medis untuk monitoring persalinan",
}

export default function Page() {
  return (
    <main className="min-h-dvh">
      <PartografApp />
    </main>
  )
}
