"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart, Bar } from "recharts"

type Patient = {
  nama: string
  umur?: number
  gravida?: number
  paritas?: number
  usiaKehamilanMinggu?: number
  waktuMasuk?: string
  diagnosaMasuk?: string
}

type FetalReading = {
  t: number // ms timestamp
  djj: number
  air: "utuh" | "jernih" | "mekonium" | "berdarah"
  molase: "tidak ada" | "+" | "++" | "+++"
}

type LaborProgress = {
  t: number
  pembukaan: number // 0-10 cm
  station: -3 | -2 | -1 | 0 | 1 | 2
  kontraksiFreq: number // per 10 menit
  kontraksiDurasi: "≤20" | "20–40" | ">40"
}

type MaternalVital = {
  t: number
  sys: number
  dia: number
  nadi: number
  suhu: number
  urineVol?: number
  urineProtein?: string
  urineAseton?: string
}

type Therapy = {
  t: number
  infus?: string
  oksitosinDosis?: string
  oksitosinMulai?: string
  obatLain?: string
}

function formatHour(base: number, t: number) {
  const h = (t - base) / 3600000
  return `${h.toFixed(1)}`
}

export default function PartografApp() {
  // Global state
  const [patient, setPatient] = React.useState<Patient>({ nama: "" })
  const [fetal, setFetal] = React.useState<FetalReading[]>([])
  const [labor, setLabor] = React.useState<LaborProgress[]>([])
  const [maternal, setMaternal] = React.useState<MaternalVital[]>([])
  const [therapy, setTherapy] = React.useState<Therapy[]>([])

  const startTime = React.useMemo(() => {
    // anchor for charts; if any data, use earliest timestamp
    const all = [...fetal, ...labor, ...maternal, ...therapy].map((d) => d.t)
    return all.length ? Math.min(...all) : Date.now()
  }, [fetal, labor, maternal, therapy])

  // Alerts computation
  const alerts = React.useMemo(() => {
    const a: string[] = []
    const lastF = fetal.at(-1)
    if (lastF && (lastF.djj < 120 || lastF.djj > 160)) {
      a.push(`DJJ ${lastF.djj} bpm di luar rentang 120–160`)
    }
    const lastM = maternal.at(-1)
    if (lastM && (lastM.sys >= 140 || lastM.dia >= 90)) {
      a.push(`Tekanan darah tinggi: ${lastM.sys}/${lastM.dia} mmHg`)
    }
    if (lastM && lastM.suhu >= 38) {
      a.push(`Suhu tinggi: ${lastM.suhu.toFixed(1)}°C`)
    }
    // Simple action line check for dilation: slope 1 cm/jam, action line 4 jam di kanan alert line
    if (labor.length >= 1) {
      const first = labor[0]
      const last = labor.at(-1)!
      const hoursSince = (last.t - first.t) / 3600000
      const alertExpected = Math.max(0, first.pembukaan + hoursSince) // 1 cm/jam
      const actionExpected = alertExpected - 4 // 4 jam ke kanan dari alert line
      if (last.pembukaan < actionExpected) {
        a.push("Kemajuan pembukaan melewati action line")
      }
    }
    return a
  }, [fetal, maternal, labor])

  // Reusable handlers with timestamp
  const now = () => Date.now()

  // Dummy data for demo
  const addDemoData = () => {
    const base = Date.now() - 3 * 3600000
    setPatient({
      nama: "Ny. Siti",
      umur: 28,
      gravida: 2,
      paritas: 1,
      usiaKehamilanMinggu: 39,
      waktuMasuk: new Date(base).toLocaleString(),
      diagnosaMasuk: "Inpartu kala I",
    })
    setLabor([
      { t: base + 0 * 3600000, pembukaan: 3, station: -2, kontraksiFreq: 2, kontraksiDurasi: "≤20" },
      { t: base + 1 * 3600000, pembukaan: 4, station: -2, kontraksiFreq: 3, kontraksiDurasi: "20–40" },
      { t: base + 2 * 3600000, pembukaan: 5, station: -1, kontraksiFreq: 4, kontraksiDurasi: "20–40" },
      { t: base + 3 * 3600000, pembukaan: 6, station: -1, kontraksiFreq: 5, kontraksiDurasi: ">40" },
    ])
    setFetal([
      { t: base + 0.5 * 3600000, djj: 140, air: "jernih", molase: "tidak ada" },
      { t: base + 1.0 * 3600000, djj: 145, air: "jernih", molase: "tidak ada" },
      { t: base + 1.5 * 3600000, djj: 165, air: "jernih", molase: "+" },
      { t: base + 2.5 * 3600000, djj: 150, air: "jernih", molase: "+" },
    ])
    setMaternal([
      { t: base + 0.2 * 3600000, sys: 120, dia: 78, nadi: 82, suhu: 36.9 },
      { t: base + 1.2 * 3600000, sys: 124, dia: 80, nadi: 88, suhu: 37.1 },
      { t: base + 2.2 * 3600000, sys: 142, dia: 92, nadi: 95, suhu: 37.9 },
    ])
    setTherapy([
      { t: base + 0.1 * 3600000, infus: "RL 20 tpm" },
      { t: base + 1.3 * 3600000, oksitosinDosis: "2 mU/menit", oksitosinMulai: "10:30" },
    ])
  }

  // PDF export
  const dashboardRef = React.useRef<HTMLDivElement | null>(null)
  const dilChartRef = React.useRef<HTMLDivElement | null>(null)
  const djjChartRef = React.useRef<HTMLDivElement | null>(null)
  const kontraksiChartRef = React.useRef<HTMLDivElement | null>(null)
  const vitalChartRef = React.useRef<HTMLDivElement | null>(null)

  function getExportColorOverrides() {
    return {
      "--background": "#ffffff",
      "--foreground": "#111827",
      "--card": "#ffffff",
      "--card-foreground": "#111827",
      "--popover": "#ffffff",
      "--popover-foreground": "#111827",
      "--primary": "#ea580c",
      "--primary-foreground": "#ffffff",
      "--secondary": "#f3f4f6",
      "--secondary-foreground": "#111827",
      "--muted": "#f3f4f6",
      "--muted-foreground": "#6b7280",
      "--accent": "#f3f4f6",
      "--accent-foreground": "#111827",
      "--destructive": "#ef4444",
      "--destructive-foreground": "#ffffff",
      "--border": "#e5e7eb",
      "--input": "#e5e7eb",
      "--ring": "#d1d5db",

      // chart tokens
      "--color-chart-1": "#2563eb",
      "--color-chart-2": "#10b981",
      "--color-chart-3": "#94a3b8",
      "--color-chart-4": "#f59e0b",
      "--color-chart-5": "#e11d48",

      // shadcn v4 semantic tokens used by classes like text-muted-foreground
      "--color-background": "#ffffff",
      "--color-foreground": "#111827",
      "--color-card": "#ffffff",
      "--color-card-foreground": "#111827",
      "--color-popover": "#ffffff",
      "--color-popover-foreground": "#111827",
      "--color-primary": "#ea580c",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#f3f4f6",
      "--color-secondary-foreground": "#111827",
      "--color-muted": "#f3f4f6",
      "--color-muted-foreground": "#6b7280",
      "--color-accent": "#f3f4f6",
      "--color-accent-foreground": "#111827",
      "--color-destructive": "#ef4444",
      "--color-destructive-foreground": "#ffffff",
      "--color-border": "#e5e7eb",
      "--color-input": "#e5e7eb",
      "--color-ring": "#d1d5db",
    } as Record<string, string>
  }

  function applyExportSafeColors(el: HTMLElement) {
    const overrides = getExportColorOverrides()
    const prev: Array<[string, string]> = []
    for (const [k, v] of Object.entries(overrides)) {
      prev.push([k, el.style.getPropertyValue(k)])
      el.style.setProperty(k, v)
    }
    return () => {
      for (const [k, val] of prev) {
        if (val) el.style.setProperty(k, val)
        else el.style.removeProperty(k)
      }
    }
  }

  const onExportPDF = async () => {
    if (!dashboardRef.current) return
    const target = dashboardRef.current
    const restore = applyExportSafeColors(target)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")])
      const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const ratio = pageWidth / canvas.width
      const imgHeight = canvas.height * ratio
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight)
      pdf.save(`partograf-digital-${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      restore()
    }
  }

  const onExportChart = async (node: HTMLElement, filename: string) => {
    const restore = applyExportSafeColors(node)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")])
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
      const imgData = canvas.toDataURL("image/png")
      const orientation = canvas.width > canvas.height ? "landscape" : "portrait"
      const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
      const imgW = canvas.width * ratio
      const imgH = canvas.height * ratio
      const x = (pageWidth - imgW) / 2
      const y = (pageHeight - imgH) / 2
      pdf.addImage(imgData, "PNG", x, y, imgW, imgH)
      pdf.save(filename)
    } finally {
      restore()
    }
  }

  const exportDilationPDF = () => {
    if (dilChartRef.current) {
      onExportChart(dilChartRef.current, `grafik-dilatasi-${new Date().toISOString().slice(0, 10)}.pdf`)
    }
  }
  const exportDJJPDF = () => {
    if (djjChartRef.current) {
      onExportChart(djjChartRef.current, `grafik-djj-${new Date().toISOString().slice(0, 10)}.pdf`)
    }
  }
  const exportKontraksiPDF = () => {
    if (kontraksiChartRef.current) {
      onExportChart(kontraksiChartRef.current, `grafik-kontraksi-${new Date().toISOString().slice(0, 10)}.pdf`)
    }
  }
  const exportVitalPDF = () => {
    if (vitalChartRef.current) {
      onExportChart(vitalChartRef.current, `grafik-vital-${new Date().toISOString().slice(0, 10)}.pdf`)
    }
  }

  // Derived data for charts
  const dilationData = labor.map((d) => ({
    x: formatHour(startTime, d.t),
    pembukaan: d.pembukaan,
  }))

  const djjData = fetal.map((d) => ({
    x: formatHour(startTime, d.t),
    djj: d.djj,
  }))

  const kontraksiData = labor.map((d) => ({
    x: formatHour(startTime, d.t),
    freq: d.kontraksiFreq,
  }))

  const vitalsData = maternal.map((d) => ({
    x: formatHour(startTime, d.t),
    nadi: d.nadi,
    sys: d.sys,
    dia: d.dia,
    suhu: d.suhu,
  }))

  const chartConfig = {
    pembukaan: { label: "Pembukaan (cm)", color: "var(--color-chart-1)" },
    djj: { label: "DJJ (bpm)", color: "var(--color-chart-1)" },
    freq: { label: "Kontraksi/10m", color: "var(--color-chart-1)" },
    nadi: { label: "Nadi", color: "var(--color-chart-1)" },
  } as const

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm text-muted-foreground"></p>
            <h1 className="text-pretty text-xl font-semibold md:text-2xl">Partograf Digital</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addDemoData}>
            Isi contoh data
          </Button>
          <Button onClick={onExportPDF}>Export PDF</Button>
        </div>
      </header>

      <Separator className="my-4" />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 grid gap-2">
          {alerts.map((msg, i) => (
            <Alert key={i} className="border-primary/30">
              <AlertTitle>Alert klinis</AlertTitle>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Layout: Forms + Dashboard */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Forms column */}
        <div className="grid gap-4">
          <Accordion type="multiple" className="w-full">
            {/* 1. Data Pasien */}
            <AccordionItem value="pasien">
              <AccordionTrigger>Data Pasien & Persalinan</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Identitas</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nama">Nama ibu</Label>
                      <Input
                        id="nama"
                        value={patient.nama}
                        onChange={(e) => setPatient({ ...patient, nama: e.target.value })}
                        placeholder="Nama lengkap"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Umur</Label>
                        <Input
                          type="number"
                          value={patient.umur ?? ""}
                          onChange={(e) => setPatient({ ...patient, umur: Number(e.target.value) })}
                          placeholder="tahun"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Usia kehamilan (minggu)</Label>
                        <Input
                          type="number"
                          value={patient.usiaKehamilanMinggu ?? ""}
                          onChange={(e) => setPatient({ ...patient, usiaKehamilanMinggu: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Gravida</Label>
                        <Input
                          type="number"
                          value={patient.gravida ?? ""}
                          onChange={(e) => setPatient({ ...patient, gravida: Number(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Paritas</Label>
                        <Input
                          type="number"
                          value={patient.paritas ?? ""}
                          onChange={(e) => setPatient({ ...patient, paritas: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Waktu masuk</Label>
                        <Input
                          value={patient.waktuMasuk ?? ""}
                          onChange={(e) => setPatient({ ...patient, waktuMasuk: e.target.value })}
                          placeholder="dd/mm/yyyy hh:mm"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Diagnosa masuk (opsional)</Label>
                        <Input
                          value={patient.diagnosaMasuk ?? ""}
                          onChange={(e) => setPatient({ ...patient, diagnosaMasuk: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Monitoring Janin */}
            <AccordionItem value="janin">
              <AccordionTrigger>Monitoring Janin</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Input pengukuran</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>DJJ (bpm)</Label>
                        <Input id="djj" type="number" placeholder="mis. 140" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Air ketuban</Label>
                        <Select defaultValue="jernih">
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="utuh">utuh</SelectItem>
                            <SelectItem value="jernih">jernih</SelectItem>
                            <SelectItem value="mekonium">mekonium</SelectItem>
                            <SelectItem value="berdarah">berdarah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Molase kepala</Label>
                      <Select defaultValue="tidak ada">
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tidak ada">tidak ada</SelectItem>
                          <SelectItem value="+">+</SelectItem>
                          <SelectItem value="++">++</SelectItem>
                          <SelectItem value="+++">+++</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          const form = e.currentTarget.closest("div")?.parentElement as HTMLElement
                          const djjInput = form.querySelector("#djj") as HTMLInputElement
                          const air = (form.querySelector('[data-state][role="combobox"]') as HTMLElement)?.innerText
                            ?.trim()
                            .toLowerCase() as FetalReading["air"] | undefined
                          const mol = (
                            form.querySelectorAll('[data-state][role="combobox"]')[1] as HTMLElement
                          )?.innerText?.trim() as FetalReading["molase"] | undefined
                          const djj = Number(djjInput?.value)
                          if (!Number.isFinite(djj)) return
                          setFetal((prev) => [
                            ...prev,
                            { t: now(), djj, air: air || "jernih", molase: mol || "tidak ada" },
                          ])
                          djjInput.value = ""
                        }}
                      >
                        Simpan (timestamp otomatis)
                      </Button>
                      <Badge variant="secondary">Interval anjur: tiap 30 menit</Badge>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Kemajuan Persalinan */}
            <AccordionItem value="persalinan">
              <AccordionTrigger>Kemajuan Persalinan</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Input kemajuan</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>Pembukaan (0–10 cm)</Label>
                        <Input id="pembukaan" type="number" placeholder="cm" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Station (-3 s/d +2)</Label>
                        <Input id="station" type="number" placeholder="-3 sampai 2" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Kontraksi/10 menit</Label>
                        <Input id="freq" type="number" placeholder="mis. 3" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Durasi kontraksi</Label>
                      <Select defaultValue="20–40">
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="≤20">≤20 detik</SelectItem>
                          <SelectItem value="20–40">20–40 detik</SelectItem>
                          <SelectItem value=">40">&gt;40 detik</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={(e) => {
                        const root = e.currentTarget.closest("div")?.parentElement as HTMLElement
                        const val = (id: string) => Number((root.querySelector(`#${id}`) as HTMLInputElement)?.value)
                        const pembukaan = val("pembukaan")
                        const station = Number(
                          (root.querySelector("#station") as HTMLInputElement)?.value,
                        ) as LaborProgress["station"]
                        const freq = val("freq")
                        const dur = ((
                          root.querySelector('[data-state][role="combobox"]') as HTMLElement
                        )?.innerText?.trim() || "20–40") as LaborProgress["kontraksiDurasi"]
                        if (!Number.isFinite(pembukaan)) return
                        setLabor((prev) => [
                          ...prev,
                          { t: now(), pembukaan, station, kontraksiFreq: freq, kontraksiDurasi: dur },
                        ])
                        ;["pembukaan", "station", "freq"].forEach((id) => {
                          const el = root.querySelector(`#${id}`) as HTMLInputElement
                          if (el) el.value = ""
                        })
                      }}
                    >
                      Simpan kemajuan
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* 4. Kondisi Ibu */}
            <AccordionItem value="ibu">
              <AccordionTrigger>Kondisi Ibu</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Tanda vital</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="grid gap-2">
                        <Label>TD Sistolik</Label>
                        <Input id="sys" type="number" placeholder="mmHg" />
                      </div>
                      <div className="grid gap-2">
                        <Label>TD Diastolik</Label>
                        <Input id="dia" type="number" placeholder="mmHg" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Nadi</Label>
                        <Input id="nadi" type="number" placeholder="x/menit" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Suhu (°C)</Label>
                        <Input id="suhu" type="number" step="0.1" placeholder="°C" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>Urine (ml)</Label>
                        <Input id="urinvol" type="number" placeholder="volume" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Protein</Label>
                        <Input id="urinprot" placeholder="neg/trace/+" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Aseton</Label>
                        <Input id="urinaset" placeholder="neg/trace/+" />
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        const root = e.currentTarget.closest("div")?.parentElement as HTMLElement
                        const val = (id: string) => Number((root.querySelector(`#${id}`) as HTMLInputElement)?.value)
                        const sys = val("sys"),
                          dia = val("dia"),
                          nadi = val("nadi"),
                          suhu = Number((root.querySelector("#suhu") as HTMLInputElement)?.value)
                        const urineVol = val("urinvol")
                        const urineProtein = (root.querySelector("#urinprot") as HTMLInputElement)?.value
                        const urineAseton = (root.querySelector("#urinaset") as HTMLInputElement)?.value
                        if (
                          !Number.isFinite(sys) ||
                          !Number.isFinite(dia) ||
                          !Number.isFinite(nadi) ||
                          !Number.isFinite(suhu)
                        )
                          return
                        setMaternal((prev) => [
                          ...prev,
                          { t: now(), sys, dia, nadi, suhu, urineVol, urineProtein, urineAseton },
                        ])
                        ;["sys", "dia", "nadi", "suhu", "urinvol", "urinprot", "urinaset"].forEach((id) => {
                          const el = root.querySelector(`#${id}`) as HTMLInputElement
                          if (el) el.value = ""
                        })
                      }}
                    >
                      Simpan tanda vital
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* 5. Terapi & Obat */}
            <AccordionItem value="terapi">
              <AccordionTrigger>Terapi & Obat</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Terapi yang diberikan</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>Cairan infus</Label>
                        <Input id="infus" placeholder="jenis + laju" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Oksitosin (dosis)</Label>
                        <Input id="oksidosis" placeholder="mis. 2 mU/menit" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Waktu mulai</Label>
                        <Input id="oksimulai" placeholder="hh:mm" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Obat lain</Label>
                      <Input id="obat" placeholder="nama & dosis" />
                    </div>
                    <Button
                      onClick={(e) => {
                        const root = e.currentTarget.closest("div")?.parentElement as HTMLElement
                        const infus = (root.querySelector("#infus") as HTMLInputElement)?.value
                        const obatLain = (root.querySelector("#obat") as HTMLInputElement)?.value
                        const oksitosinDosis = (root.querySelector("#oksidosis") as HTMLInputElement)?.value
                        const oksitosinMulai = (root.querySelector("#oksimulai") as HTMLInputElement)?.value
                        setTherapy((prev) => [...prev, { t: now(), infus, obatLain, oksitosinDosis, oksitosinMulai }])
                        ;["infus", "oksidosis", "oksimulai", "obat"].forEach((id) => {
                          const el = root.querySelector(`#${id}`) as HTMLInputElement
                          if (el) el.value = ""
                        })
                      }}
                    >
                      Simpan terapi
                    </Button>
                  </CardContent>
                </Card>
                {/* Therapy history table */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Riwayat terapi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="py-2 pr-3 text-left font-medium">Waktu</th>
                            <th className="py-2 pr-3 text-left font-medium">Infus</th>
                            <th className="py-2 pr-3 text-left font-medium">Oksitosin (dosis)</th>
                            <th className="py-2 pr-3 text-left font-medium">Mulai</th>
                            <th className="py-2 pr-0 text-left font-medium">Obat lain</th>
                          </tr>
                        </thead>
                        <tbody>
                          {therapy.length === 0 ? (
                            <tr>
                              <td className="py-3 text-muted-foreground" colSpan={5}>
                                Belum ada data terapi yang tersimpan.
                              </td>
                            </tr>
                          ) : (
                            therapy.map((row, idx) => {
                              const d = new Date(row.t)
                              const hh = String(d.getHours()).padStart(2, "0")
                              const mm = String(d.getMinutes()).padStart(2, "0")
                              const waktu = `${hh}:${mm}`
                              return (
                                <tr key={idx} className="border-b border-border">
                                  <td className="py-2 pr-3">{waktu}</td>
                                  <td className="py-2 pr-3">{row.infus || "-"}</td>
                                  <td className="py-2 pr-3">{row.oksitosinDosis || "-"}</td>
                                  <td className="py-2 pr-3">{row.oksitosinMulai || "-"}</td>
                                  <td className="py-2 pr-0">{row.obatLain || "-"}</td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Dashboard column */}
        <div ref={dashboardRef} className="grid gap-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <div className="text-muted-foreground">Nama ibu</div>
                <div className="font-medium">{patient.nama || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Usia kehamilan</div>
                <div className="font-medium">
                  {patient.usiaKehamilanMinggu ? `${patient.usiaKehamilanMinggu} mg` : "-"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Masuk</div>
                <div className="font-medium">{patient.waktuMasuk || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Diagnosa</div>
                <div className="font-medium">{patient.diagnosaMasuk || "-"}</div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Tabs defaultValue="dilatasi" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dilatasi">Dilatasi</TabsTrigger>
              <TabsTrigger value="djj">DJJ</TabsTrigger>
              <TabsTrigger value="kontraksi">Kontraksi</TabsTrigger>
              <TabsTrigger value="vital">Tanda Vital</TabsTrigger>
            </TabsList>

            {/* 6a. Grafik dilatasi serviks vs waktu + alert/action line */}
            <TabsContent value="dilatasi">
              <Card>
                <CardHeader className="flex items-center justify-between pb-2">
                  <CardTitle>Grafik Pembukaan Serviks</CardTitle>
                  <Button size="sm" variant="outline" onClick={exportDilationPDF}>
                    Export PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div ref={dilChartRef}>
                    <ChartContainer config={chartConfig} className="w-full">
                      <LineChart data={dilationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" tickLine={false} />
                        <YAxis domain={[0, 10]} tickLine={false} />
                        <ReferenceLine y={4} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                        <Line
                          type="monotone"
                          dataKey="pembukaan"
                          stroke="var(--color-chart-1)"
                          strokeWidth={3}
                          dot={false}
                          connectNulls
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6b. Grafik DJJ */}
            <TabsContent value="djj">
              <Card>
                <CardHeader className="flex items-center justify-between pb-2">
                  <CardTitle>Grafik DJJ</CardTitle>
                  <Button size="sm" variant="outline" onClick={exportDJJPDF}>
                    Export PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div ref={djjChartRef}>
                    <ChartContainer config={chartConfig}>
                      <LineChart data={djjData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" tickLine={false} />
                        <YAxis domain={[80, 200]} tickLine={false} />
                        <ReferenceLine y={120} stroke="#9ca3af" strokeDasharray="3 3" />
                        <ReferenceLine y={160} stroke="#9ca3af" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="djj" stroke="var(--color-chart-1)" strokeWidth={2} dot />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6c. Grafik kontraksi */}
            <TabsContent value="kontraksi">
              <Card>
                <CardHeader className="flex items-center justify-between pb-2">
                  <CardTitle>Frekuensi Kontraksi / 10 menit</CardTitle>
                  <Button size="sm" variant="outline" onClick={exportKontraksiPDF}>
                    Export PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div ref={kontraksiChartRef}>
                    <ChartContainer config={chartConfig}>
                      <BarChart data={kontraksiData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" tickLine={false} />
                        <YAxis domain={[0, 7]} tickLine={false} />
                        <Bar dataKey="freq" fill="var(--color-chart-1)" radius={4} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6d. Grafik tanda vital ibu (nadi + tekanan darah, suhu ditampilkan di tooltip) */}
            <TabsContent value="vital">
              <Card>
                <CardHeader className="flex items-center justify-between pb-2">
                  <CardTitle>Tanda Vital Ibu</CardTitle>
                  <Button size="sm" variant="outline" onClick={exportVitalPDF}>
                    Export PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div ref={vitalChartRef}>
                    <ChartContainer config={chartConfig}>
                      <LineChart data={vitalsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" tickLine={false} />
                        <YAxis tickLine={false} />
                        <Line type="monotone" dataKey="nadi" stroke="var(--color-chart-1)" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="sys" stroke="#374151" strokeWidth={1.5} dot />
                        <Line type="monotone" dataKey="dia" stroke="#9ca3af" strokeWidth={1.5} dot />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Tooltip menampilkan suhu (°C) pada setiap titik.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <footer className="mt-8 flex items-center justify-between border-t pt-6 text-xs text-muted-foreground">
        <span></span>
        <span></span>
      </footer>
    </div>
  )
}
