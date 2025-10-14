"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Tooltip,
  Legend,
  Cell,
} from "recharts"
import { useState } from "react" // Import useState
import { toast } from "@/hooks/use-toast"

type Patient = {
  nama: string
  umur?: number
  umurBulan?: number
  gravida?: number
  paritas?: number
  abortus?: number
  usiaKehamilanMinggu?: number
  waktuMasuk?: string
  diagnosaMasuk?: string
  noReg?: string
  noRekMed?: string
  gedungRuangan?: string
  tanggal?: string
  ketubanPecah?: string
  dpjp?: string
  hamilMinggu?: number
  penjamin?: string
  mules?: string
}

type FetalReading = {
  t: number // ms timestamp
  djj: number
  air: "utuh" | "jernih" | "mekonium" | "berdarah"
  molase: "0" | "1" | "2" | "3" | "tidak ada"
}

type LaborProgress = {
  t: number
  pembukaan: number // 0-10 cm
  station: 0 | 1 | 2 | 3 | 4 | 5 // Turunnya kepala (0–5)
  kontraksiFreq: number // per 10 menit
  kontraksiDurasi: "≤20" | "20–40" | ">40"
}

type MaternalVital = {
  t: number
  sys: number
  dia: number
  nadi: number
  suhu: number
  rr?: number
  spo2?: number
  urineVol?: number
  urineProtein?: string
  urineAseton?: string
}

type UrineEntry = {
  t: number
  volume?: number
  protein?: string
  aseton?: string
}

type Therapy = {
  t: number
  infus?: string
  oksitosinDosis?: string
  oksitosinMulai?: string
  obatLain?: string
  tetesPerMenit?: number
}

type ContractionEntry = {
  t: number
  freq: number
  durasi: "≤20" | "20–40" | ">40"
}

function formatHour(base: number, t: number) {
  const h = (t - base) / 3600000
  return `${h.toFixed(1)}`
}

// Replaced default export with a named component and added 'useState' import
function PartografApp() {
  // Global state
  const [patient, setPatient] = React.useState<Patient>({ nama: "" })
  const [fetal, setFetal] = React.useState<FetalReading[]>([])
  const [labor, setLabor] = React.useState<LaborProgress[]>([])
  const [maternal, setMaternal] = React.useState<MaternalVital[]>([])
  const [therapy, setTherapy] = React.useState<Therapy[]>([])
  const [kontraksi, setKontraksi] = React.useState<ContractionEntry[]>([])
  const [editingKontraksiIndex, setEditingKontraksiIndex] = React.useState<number | null>(null)
  const [activeTab, setActiveTab] = React.useState("janin")
  const [urine, setUrine] = React.useState<UrineEntry[]>([]) // new urine entries

  function formatDateTimeLabel(t: number) {
    try {
      return new Date(t).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return new Date(t).toLocaleString("id-ID")
    }
  }

  const startTime = React.useMemo(() => {
    const all = [...fetal, ...labor, ...maternal, ...therapy, ...urine].map((d: any) => d.t) // include urine
    return all.length ? Math.min(...all) : Date.now()
  }, [fetal, labor, maternal, therapy, urine])

  // Alerts computation
  const alerts = React.useMemo(() => {
    const a: string[] = []
    const lastF = fetal.at(-1)
    if (lastF && (lastF.djj < 100 || lastF.djj > 180)) {
      a.push(`DJJ ${lastF.djj} bpm di luar rentang 100–180`)
    }
    const lastM = maternal.at(-1)
    if (lastM && (lastM.sys >= 140 || lastM.dia >= 90)) {
      a.push(`Tekanan darah tinggi: ${lastM.sys}/${lastM.dia} mmHg`)
    }
    if (lastM && lastM.suhu >= 38) {
      a.push(`Suhu tinggi: ${lastM.suhu.toFixed(1)}°C`)
    }
    if (labor.length >= 1) {
      const first = labor[0]
      const last = labor.at(-1)!
      const hoursSince = (last.t - first.t) / 3600000
      const alertExpected = Math.max(0, first.pembukaan + hoursSince)
      const actionExpected = alertExpected - 4
      if (last.pembukaan < actionExpected) {
        a.push("Kemajuan pembukaan melewati action line")
      }
    }
    return a
  }, [fetal, maternal, labor])

  const now = () => Date.now()

  const addDemoData = () => {
    const base = Date.now() - 3 * 3600000
    setPatient({
      nama: "Ny. Siti",
      umur: 28,
      gravida: 2,
      paritas: 1,
      abortus: 0,
      usiaKehamilanMinggu: 39,
      waktuMasuk: new Date(base).toLocaleString(),
      diagnosaMasuk: "Inpartu kala I",
      noReg: "123456",
      noRekMed: "RM789012",
      gedungRuangan: "Kebidanan/A-101",
      tanggal: new Date().toLocaleDateString("id-ID"),
      ketubanPecah: new Date(base - 1 * 3600000).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      dpjp: "Dr. Ahmad",
      hamilMinggu: 39,
      penjamin: "BPJS",
      mules: new Date(base).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    })
    setLabor([
      { t: base + 0 * 3600000, pembukaan: 3, station: 2, kontraksiFreq: 2, kontraksiDurasi: "≤20" },
      { t: base + 1 * 3600000, pembukaan: 4, station: 2, kontraksiFreq: 3, kontraksiDurasi: "20–40" },
      { t: base + 2 * 3600000, pembukaan: 5, station: 3, kontraksiFreq: 4, kontraksiDurasi: "20–40" },
      { t: base + 3 * 3600000, pembukaan: 6, station: 3, kontraksiFreq: 5, kontraksiDurasi: ">40" },
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
    // demo data for kontraksi
    setKontraksi([
      { t: base + 1 * 3600000, freq: 2, durasi: "≤20" },
      { t: base + 1.5 * 3600000, freq: 3, durasi: "20–40" },
      { t: base + 2 * 3600000, freq: 4, durasi: "20–40" },
      { t: base + 2.5 * 3600000, freq: 5, durasi: ">40" },
    ])
    // demo data for urine
    setUrine([
      { t: base + 0.5 * 3600000, volume: 50, protein: "neg", aseton: "neg" },
      { t: base + 2.5 * 3600000, volume: 100, protein: "+", aseton: "neg" },
    ])
  }

   // PasienSection Component
  function PasienSection({
    patient,
    onPatientUpdate,
  }: { patient: Patient; onPatientUpdate: (updates: Partial<Patient>) => void }) {
    return (
      <Card className="border-2">
        <CardHeader className="bg-muted/30 pb-3">
          <CardTitle className="text-center text-xl font-bold">PARTOGRAF</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Patient Information */}
            <div className="space-y-4">
              {/* No.Reg/No.Rek.Med */}
              <div className="flex items-center gap-2">
                <Label htmlFor="noReg" className="w-32 text-sm font-medium">
                  No.Reg/No.Rek.Med
                </Label>
                <span>:</span>
                <div className="flex flex-1 gap-1">
                  <Input
                    id="noReg"
                    className="h-7 text-sm"
                    value={patient.noReg ?? ""}
                    onChange={(e) => onPatientUpdate({ noReg: e.target.value })}
                    placeholder=""
                  />
                  <span>/</span>
                  <Input
                    id="noRekMed"
                    className="h-7 text-sm"
                    value={patient.noRekMed ?? ""}
                    onChange={(e) => onPatientUpdate({ noRekMed: e.target.value })}
                    placeholder=""
                  />
                </div>
              </div>

              {/* Nama Pasien */}
              <div className="flex items-center gap-2">
                <Label htmlFor="nama" className="w-32 text-sm font-medium">
                  Nama Pasien
                </Label>
                <span>:</span>
                <Input
                  id="nama"
                  className="h-7 flex-1 text-sm"
                  value={patient.nama}
                  onChange={(e) => onPatientUpdate({ nama: e.target.value })}
                  placeholder=""
                />
              </div>

              {/* Umur & Gedung/Ruangan */}
              <div className="flex items-center gap-2">
                <Label htmlFor="umur" className="w-32 text-sm font-medium">
                  Umur
                </Label>
                <span>:</span>
                <div className="flex flex-1 gap-1">
                  <Input
                    id="umur"
                    type="number"
                    className="h-7 text-sm"
                    value={patient.umur ?? ""}
                    onChange={(e) => onPatientUpdate({ umur: Number(e.target.value) || undefined })}
                    placeholder=""
                  />
                  <span>/</span>
                  <Input
                    id="umurBulan"
                    type="number"
                    className="h-7 text-sm"
                    value={patient.umurBulan ?? ""}
                    onChange={(e) => onPatientUpdate({ umurBulan: Number(e.target.value) || undefined })}
                    placeholder=""
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="gedungRuangan" className="w-32 text-sm font-medium">
                  Gedung/Ruangan
                </Label>
                <span>:</span>
                <Input
                  id="gedungRuangan"
                  className="h-7 flex-1 text-sm"
                  value={patient.gedungRuangan ?? ""}
                  onChange={(e) => onPatientUpdate({ gedungRuangan: e.target.value })}
                  placeholder=""
                />
              </div>

              {/* Gravida, Paritas, Abortus */}
              <div className="flex items-center gap-2">
                <Label className="w-32 text-sm font-medium">Gravida</Label>
                <span>:</span>
                <Input
                  type="number"
                  className="h-7 w-16 text-sm"
                  value={patient.gravida ?? ""}
                  onChange={(e) => onPatientUpdate({ gravida: Number(e.target.value) || undefined })}
                  placeholder=""
                />

                <Label className="text-sm font-medium ml-2">Paritas</Label>
                <span>:</span>
                <Input
                  type="number"
                  className="h-7 w-16 text-sm"
                  value={patient.paritas ?? ""}
                  onChange={(e) => onPatientUpdate({ paritas: Number(e.target.value) || undefined })}
                  placeholder=""
                />

                <Label className="text-sm font-medium ml-2">Abortus</Label>
                <span>:</span>
                <Input
                  type="number"
                  className="h-7 w-16 text-sm"
                  value={patient.abortus ?? ""}
                  onChange={(e) => onPatientUpdate({ abortus: Number(e.target.value) || undefined })}
                  placeholder=""
                />
              </div>

              {/* Tanggal */}
              <div className="flex items-center gap-2">
                <Label htmlFor="tanggal" className="w-32 text-sm font-medium">
                  Tanggal
                </Label>
                <span>:</span>
                <Input
                  id="tanggal"
                  className="h-7 flex-1 text-sm"
                  value={patient.tanggal ?? ""}
                  onChange={(e) => onPatientUpdate({ tanggal: e.target.value })}
                  placeholder=""
                />
              </div>
            </div>

            {/* Right Column - Additional Information */}
            <div className="space-y-4">
              {/* Ketuban Pecah */}
              <div className="flex items-center gap-2">
                <Label htmlFor="ketubanPecah" className="w-40 text-sm font-medium">
                  Ketuban Pecah Tgl/Jam
                </Label>
                <span>:</span>
                <Input
                  id="ketubanPecah"
                  className="h-7 flex-1 text-sm"
                  value={patient.ketubanPecah ?? ""}
                  onChange={(e) => onPatientUpdate({ ketubanPecah: e.target.value })}
                  placeholder=""
                />
                <span className="text-sm">WIB</span>
              </div>

              {/* DPJP */}
              <div className="flex items-center gap-2">
                <Label htmlFor="dpjp" className="w-40 text-sm font-medium">
                  DPJP
                </Label>
                <span>:</span>
                <Input
                  id="dpjp"
                  className="h-7 flex-1 text-sm"
                  value={patient.dpjp ?? ""}
                  onChange={(e) => onPatientUpdate({ dpjp: e.target.value })}
                  placeholder=""
                />
              </div>

              {/* Hamil & Penjamin */}
              <div className="flex items-center gap-2">
                <Label htmlFor="hamilMinggu" className="w-40 text-sm font-medium">
                  Hamil
                </Label>
                <span>:</span>
                <Input
                  id="hamilMinggu"
                  type="number"
                  className="h-7 w-16 text-sm"
                  value={patient.hamilMinggu ?? ""}
                  onChange={(e) => onPatientUpdate({ hamilMinggu: Number(e.target.value) || undefined })}
                  placeholder=""
                />
                <span className="text-sm ml-1">Minggu</span>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="penjamin" className="w-40 text-sm font-medium">
                  Penjamin/Jenis Pasien
                </Label>
                <span>:</span>
                <Input
                  id="penjamin"
                  className="h-7 flex-1 text-sm"
                  value={patient.penjamin ?? ""}
                  onChange={(e) => onPatientUpdate({ penjamin: e.target.value })}
                  placeholder=""
                />
              </div>

              {/* Mules */}
              <div className="flex items-center gap-2">
                <Label htmlFor="mules" className="w-40 text-sm font-medium">
                  Mules Tgl/Jam
                </Label>
                <span>:</span>
                <Input
                  id="mules"
                  className="h-7 flex-1 text-sm"
                  value={patient.mules ?? ""}
                  onChange={(e) => onPatientUpdate({ mules: e.target.value })}
                  placeholder=""
                />
                <span className="text-sm">WIB</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // MonitoringKondisiJanin Component//
  function MonitoringKondisiJanin({
    fetal,
    onFetalAdd,
    onFetalUpdate, // baru
    startTime,
  }: {
    fetal: FetalReading[]
    onFetalAdd: (reading: Omit<FetalReading, "t">) => void
    onFetalUpdate: (index: number, reading: Omit<FetalReading, "t">) => void
    startTime: number
  }) {
    const [djjInput, setDjjInput] = React.useState("")
    const [airKetubanInput, setAirKetubanInput] = React.useState<FetalReading["air"]>("jernih")
    const [molaseInput, setMolaseInput] = React.useState<FetalReading["molase"]>("tidak ada")
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null)

    // Generate data points every 30 minutes from 0 to 960 (extended range)
    const djjData = React.useMemo(() => {
      const dataPoints: Array<{
        x: number
        xLabel: string
        djj: number | null
        time: string
        air: FetalReading["air"] | null
        molase: FetalReading["molase"] | null
        actualTime?: string
      }> = []

      for (let minutes = 0; minutes <= 960; minutes += 30) {
        // Changed range to 960
        dataPoints.push({
          x: minutes,
          xLabel: minutes.toString(),
          djj: null,
          time: minutes.toString(),
          air: null,
          molase: null,
        })
      }

      // Fill in actual data where available
      fetal.forEach((reading) => {
        const minutesFromStart = Math.floor((reading.t - startTime) / 60000)

        // Find the closest 30-minute interval
        const closestInterval = Math.round(minutesFromStart / 30) * 30

        // Only include if within our 0-960 range
        if (closestInterval >= 0 && closestInterval <= 960) {
          // Changed range to 960
          const dataPoint = dataPoints.find((point) => point.x === closestInterval)
          if (dataPoint) {
            dataPoint.djj = reading.djj
            dataPoint.air = reading.air
            dataPoint.molase = reading.molase
            dataPoint.actualTime = new Date(reading.t).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          }
        }
      })

      return dataPoints
    }, [fetal, startTime])

    const lastReading = fetal.length > 0 ? fetal[fetal.length - 1] : null

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      const djj = Number(djjInput)
      if (!Number.isFinite(djj) || djj < 80 || djj > 200) return

      // Changed to use onFetalUpdate if editing, otherwise onFetalAdd
      if (editingIndex !== null) {
        onFetalUpdate(editingIndex, { djj, air: airKetubanInput, molase: molaseInput })
      } else {
        onFetalAdd({ djj, air: airKetubanInput, molase: molaseInput })
      }

      setDjjInput("")
      setAirKetubanInput("jernih")
      setMolaseInput("tidak ada")
      setEditingIndex(null)
    }

    const handleEdit = (index: number) => {
      const reading = fetal[index]
      setDjjInput(reading.djj.toString())
      setAirKetubanInput(reading.air)
      setMolaseInput(reading.molase)
      setEditingIndex(index)
    }

    const handleCancelEdit = () => {
      setDjjInput("")
      setAirKetubanInput("jernih")
      setMolaseInput("tidak ada")
      setEditingIndex(null)
    }

    // Custom tick formatter untuk sumbu X - tampilkan menit saja
    const formatXAxisTick = (value: number) => {
      return value.toString() // Tampilkan angka menit langsung
    }

    return (
      <div className="space-y-6">
        {/* Current Status Display */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-primary">Monitoring Kondisi Janin</h2>
            </div>

            {lastReading ? (
              <div className="grid grid-cols-2 gap-6 text-center">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-muted-foreground">Denyut Jantung Janin</h3>
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <p className="text-3xl font-bold text-primary">{lastReading.djj}</p>
                    <p className="text-sm text-muted-foreground">x/menit</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-muted-foreground">Air Ketuban</h3>
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <p className="text-2xl font-bold text-primary capitalize">{lastReading.air}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Belum ada data monitoring janin</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Denyut Jantung Janin Input */}
              <div className="space-y-3">
                <Label htmlFor="djj" className="text-base font-semibold block mb-2">
                  Denyut Jantung Janin (x/menit)
                </Label>
                <Input
                  id="djj"
                  type="number"
                  value={djjInput}
                  onChange={(e) => setDjjInput(e.target.value)}
                  placeholder="Masukkan DJJ"
                  className="text-center text-lg py-2"
                  min="80"
                  max="200"
                  required
                />
              </div>

              <Separator />

              {/* Air Ketuban and Molase Inputs */}
              <div className="grid grid-cols-2 gap-6">
                {/* Air Ketuban */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold block mb-2">Air Ketuban</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">:</span>
                    <Select
                      value={airKetubanInput}
                      onValueChange={(value: FetalReading["air"]) => setAirKetubanInput(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utuh">U - Utuh</SelectItem>
                        <SelectItem value="jernih">J - Jernih</SelectItem>
                        <SelectItem value="mekonium">M - Mekonium</SelectItem>
                        <SelectItem value="berdarah">B - Berdarah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Molase Kepala */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold block mb-2">Molase (Penyusupan) Kepala</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">:</span>
                    <Select
                      value={molaseInput}
                      onValueChange={(value: FetalReading["molase"]) => setMolaseInput(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tidak ada">0</SelectItem>
                        <SelectItem value="+">1</SelectItem>
                        <SelectItem value="++">2</SelectItem>
                        <SelectItem value="+++">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" size="lg">
                  {editingIndex !== null ? "Update Data" : "Simpan Data"}
                </Button>
                {editingIndex !== null && (
                  <Button type="button" variant="outline" size="lg" onClick={handleCancelEdit}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Grafik DJJ dengan sumbu X 0-960 dan interval 30 menit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Grafik Denyut Jantung Janin (DJJ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <ChartContainer
                config={{ djj: { label: "DJJ (x/menit)", color: "var(--color-chart-1)" } }}
                className="min-w-[800px]"
              >
                <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }} width={800} height={300} data={djjData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, 960]} // Changed domain to 960
                    ticks={[
                      0,
                      30,
                      60,
                      90,
                      120,
                      150,
                      180,
                      210,
                      240,
                      270,
                      300,
                      330,
                      360,
                      390,
                      420,
                      450,
                      480,
                      510,
                      540,
                      570,
                      600,
                      630,
                      660,
                      690,
                      720,
                      750,
                      780,
                      810,
                      840,
                      870,
                      900,
                      930,
                      960, // Extended ticks to 960
                    ]}
                    tickFormatter={formatXAxisTick}
                    tickLine={false}
                    axisLine={{ stroke: "#ccc" }}
                    tick={{ fill: "#666", fontSize: 10 }}
                    height={20}
                    interval={0}
                    label={{
                      value: "Waktu (menit)",
                      position: "insideBottom",
                      offset: -5,
                      style: { textAnchor: "middle", fill: "#666", fontSize: 12 },
                    }}
                  />
                  <YAxis
                    domain={[80, 200]}
                    tickLine={false}
                    axisLine={{ stroke: "#ccc" }}
                    tick={{ fill: "#666", fontSize: 12 }}
                    label={{
                      value: "Denyut Jantung Janin (x/menit)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                    }}
                    width={100}
                  />
                  {/* Reference lines for normal DJJ range */}
                  <ReferenceLine y={100} stroke="#666" strokeWidth={2} />
                  <ReferenceLine y={180} stroke="#666" strokeWidth={2} />

                  {/* DJJ Line */}
                  <Line
                    type="monotone"
                    dataKey="djj"
                    stroke="#000"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (payload.djj !== null) {
                        return <circle cx={cx} cy={cy} r={4} fill="#000" />
                      }
                      return null
                    }}
                    connectNulls={true}
                    name="DJJ"
                  />

                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-yellow-300 border-2 border-black rounded p-2 shadow-lg">
                            <p className="font-bold text-xs">
                              Waktu: {label} menit
                              <br />
                              DJJ: {data.djj}x/menit
                              <br />
                              Air Ketuban:{" "}
                              {data.air === "jernih"
                                ? "Jernih"
                                : data.air === "mekonium"
                                  ? "Mekonium"
                                  : data.air === "utuh"
                                    ? "Utuh"
                                    : data.air === "berdarah"
                                      ? "Berdarah"
                                      : "-"}
                              <br />
                              Molase: {data.molase || "-"}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </LineChart>
              </ChartContainer>

              {/* Tabel Air Ketuban dan Penyusupan */}
              <div className="mt-0 border-t-2 border-black">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Row Air Ketuban */}
                    <tr>
                      <td className="border-2 border-black bg-gray-100 font-semibold text-sm px-2 py-2">Air Ketuban</td>
                      {djjData.map((point, idx) => {
                        const airValue = point.air
                        let bgColor = "bg-white"
                        let textColor = "text-black"
                        let displayText = ""

                        if (airValue === "utuh") {
                          bgColor = "bg-blue-300"
                          displayText = "U"
                        } else if (airValue === "jernih") {
                          bgColor = "bg-green-300"
                          displayText = "J"
                        } else if (airValue === "mekonium") {
                          bgColor = "bg-amber-600"
                          textColor = "text-white"
                          displayText = "M"
                        } else if (airValue === "berdarah") {
                          bgColor = "bg-red-500"
                          textColor = "text-white"
                          displayText = "B"
                        } else if (airValue === "kering") {
                          bgColor = "bg-gray-400"
                          displayText = "K"
                        }

                        return (
                          <td
                            key={idx}
                            className={`border border-gray-400 ${bgColor} ${textColor} text-center text-xs font-semibold h-10 min-w-[35px]`}
                          >
                            {displayText}
                          </td>
                        )
                      })}
                    </tr>

                    {/* Row Penyusupan */}
                    <tr>
                      <td className="border-2 border-black bg-gray-100 font-semibold text-sm px-2 py-2">Penyusupan</td>
                      {djjData.map((point, idx) => {
                        const molaseValue = point.molase
                        let displayText = ""

                        if (molaseValue === "tidak ada") {
                          displayText = "0"
                        } else if (molaseValue === "+") {
                          displayText = "1"
                        } else if (molaseValue === "++") {
                          displayText = "2"
                        } else if (molaseValue === "+++") {
                          displayText = "3"
                        }

                        return (
                          <td
                            key={idx}
                            className="border border-gray-400 bg-white text-center text-xs font-semibold h-10"
                          >
                            {displayText}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-[#666]"></div>
                <span className="text-muted-foreground">Rentang Normal DJJ: 100-180 x/menit</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-blue-300 border border-gray-400"></div>
                  <span className="text-xs">U - Utuh</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-green-300 border border-gray-400"></div>
                  <span className="text-xs">J - Jernih</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-amber-600 border border-gray-400"></div>
                  <span className="text-xs">M - Mekonium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-red-500 border border-gray-400"></div>
                  <span className="text-xs">B - Berdarah</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-gray-400 border border-gray-400"></div>
                  <span className="text-xs">K - Kering</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Penyusupan Kepala (Molase): 0 | 1 | 2 | 3</div>
            </div>
          </CardContent>
        </Card>

        {/* Riwayat Pengukuran */}
        {fetal.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Riwayat Monitoring Kondisi Janin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground bg-muted/30">
                    <tr className="border-b border-border">
                      <th className="py-3 px-4 text-left font-medium">Waktu</th>
                      <th className="py-3 px-4 text-left font-medium">Menit</th>
                      <th className="py-3 px-4 text-left font-medium">DJJ (x/menit)</th>
                      <th className="py-3 px-4 text-left font-medium">Air Ketuban</th>
                      <th className="py-3 px-4 text-left font-medium">Penyusupan Kepala (Molase)</th>
                      <th className="py-3 px-4 text-left font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...fetal].reverse().map((reading, index) => {
                      const originalIndex = fetal.length - 1 - index
                      const waktu = new Date(reading.t).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      const minutesFromStart = Math.floor((reading.t - startTime) / 60000)

                      return (
                        <tr key={originalIndex} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">{waktu}</td>
                          <td className="py-3 px-4 text-muted-foreground">{minutesFromStart} menit</td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold ${
                                reading.djj < 120 || reading.djj > 160 ? "text-red-500" : "text-green-600"
                              }`}
                            >
                              {reading.djj}
                            </span>
                          </td>
                          <td className="py-3 px-4 capitalize">{reading.air}</td>
                          <td className="py-3 px-4">
                            <Badge variant={reading.molase === "tidak ada" ? "secondary" : "outline"}>
                              {reading.molase}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(originalIndex)}
                              className="h-8 px-3"
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // kemajuan persalinan //
  function KemajuanPersalinan({
    labor,
    onLaborAdd,
    onLaborUpdateAt,
    onLaborDeleteAt,
    startTime,
  }: {
    labor: LaborProgress[]
    onLaborAdd: (progress: Omit<LaborProgress, "t">) => void
    onLaborUpdateAt: (index: number, updates: Omit<LaborProgress, "t"> & { t: number }) => void
    onLaborDeleteAt: (index: number) => void
    startTime: number
  }) {
    const [formData, setFormData] = useState({
      pembukaan: "",
      station: "", // Renamed from turunnyaKepala to station
      waktu: "",
    })

    const [editingIndex, setEditingIndex] = useState<number | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSave = () => {
      const pembukaan = Number(formData.pembukaan)
      const station = Number(formData.station)

      if (!Number.isFinite(pembukaan) || pembukaan < 0 || pembukaan > 10) {
        alert("Pembukaan harus antara 0 dan 10.")
        return
      }
      if (!Number.isFinite(station) || station < 0 || station > 5) {
        alert("Turunnya kepala (station) harus antara 0 dan 5.")
        return
      }
      if (!formData.waktu) {
        alert("Waktu harus diisi.")
        return
      }

      const timeInMinutes = formData.waktu
        .split(":")
        .reduce((acc, curr, i) => acc + Number.parseInt(curr) * (i === 0 ? 60 : 1), 0)
      const timestamp = startTime + timeInMinutes * 60000 // Convert minutes to ms

      if (editingIndex !== null) {
        onLaborUpdateAt(editingIndex, {
          t: timestamp,
          pembukaan: pembukaan,
          station: station as LaborProgress["station"], // Type assertion
          kontraksiFreq: 0, // Default, not edited here
          kontraksiDurasi: "≤20", // Default, not edited here
        })
        setEditingIndex(null)
      } else {
        onLaborAdd({
          t: timestamp,
          pembukaan: pembukaan,
          station: station as LaborProgress["station"], // Type assertion
          kontraksiFreq: 0, // Default, not edited here
          kontraksiDurasi: "≤20", // Default, not edited here
        })
      }

      setFormData({ pembukaan: "", station: "", waktu: "" })
    }

    const handleEdit = (index: number) => {
      const item = labor[index]
      setFormData({
        pembukaan: item.pembukaan.toString(),
        station: item.station.toString(),
        waktu: new Date(item.t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      })
      setEditingIndex(index)
    }

    const handleDelete = (index: number) => {
      onLaborDeleteAt(index)
      if (editingIndex === index) {
        setEditingIndex(null)
        setFormData({ pembukaan: "", station: "", waktu: "" })
      }
    }

    // Grafik Partograf emajuan persalinan
    const partografData = labor.map((item) => ({
      waktu: new Date(item.t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      menit: Math.floor((item.t - startTime) / 60000),
      pembukaan: item.pembukaan,
      station: item.station,
    }))

    // Calculate action and alert lines based on labor data
    const actionLine: { x: number; y: number }[] = []
    const alertLine: { x: number; y: number }[] = []

    if (labor.length > 0) {
      const firstLabor = labor[0]
      const firstTimeMinutes = Math.floor((firstLabor.t - startTime) / 60000)

      for (let i = 0; i < labor.length; i++) {
        const currentLabor = labor[i]
        const currentTimeMinutes = Math.floor((currentLabor.t - startTime) / 60000)

        // Action Line: Starts at 4cm, 1 hour after first labor, then 1cm/hour
        const actionY = Math.max(4, 4 + (currentTimeMinutes - firstTimeMinutes) / 60)
        actionLine.push({ x: currentTimeMinutes, y: actionY })

        // Alert Line: Starts at 2cm, 1 hour after first labor, then 1cm/hour
        const alertY = Math.max(2, 2 + (currentTimeMinutes - firstTimeMinutes) / 60)
        alertLine.push({ x: currentTimeMinutes, y: alertY })
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Kemajuan Persalinan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <ChartContainer
                config={{
                  pembukaan: { label: "Pembukaan (cm)", color: "var(--color-chart-1)" },
                  station: { label: "Turun Kepala", color: "var(--color-chart-2)" },
                }}
                className="min-w-[800px]"
              >
                <LineChart data={partografData} height={300}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="menit"
                    type="number"
                    domain={[0, 960]} // Partograf standard up to 24 hours = 1440 minutes, but 960 (16 hours) is more common in this context
                    ticks={[0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960]}
                    tickFormatter={(v) => `${v / 60}j`}
                    label={{ value: "Waktu (jam)", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                    label={{
                      value: "Pembukaan Serviks (cm)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                    }}
                  />

                  {/* Garis Pembukaan Serviks */}
                  <Line
                    type="monotone"
                    dataKey="pembukaan"
                    stroke="#007bff"
                    strokeWidth={2.5}
                    dot={{ fill: "#007bff", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Pembukaan (X)"
                  />

                  {/* Garis Turunnya Kepala */}
                  <Line
                    type="monotone"
                    dataKey="station"
                    stroke="#28a745"
                    strokeWidth={2.5}
                    dot={{ fill: "#28a745", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Turun Kepala (O)"
                  />

                  {/* Action Line */}
                  <Line
                    type="linear"
                    dataKey="y"
                    points={actionLine.map((p) => ({ x: p.x, y: p.y }))} // Use points for custom line
                    stroke="#ffc107" // Yellow
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Action Line"
                    isAnimationActive={false}
                    legendType="line"
                  />

                  {/* Alert Line */}
                  <Line
                    type="linear"
                    dataKey="y"
                    points={alertLine.map((p) => ({ x: p.x, y: p.y }))} // Use points for custom line
                    stroke="#dc3545" // Red
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Alert Line"
                    isAnimationActive={false}
                    legendType="line"
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-xs">
                              {data.waktu} ({data.menit} mnt)
                            </p>
                            <p className="font-bold text-xs" style={{ color: "#007bff" }}>
                              Pembukaan: {data.pembukaan} cm
                            </p>
                            <p className="font-bold text-xs" style={{ color: "#28a745" }}>
                              Turun Kepala: {data.station}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend wrapperStyle={{ padding: "10px" }} />
                </LineChart>
              </ChartContainer>
            </div>

            {/* Input & Riwayat */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Input & Riwayat</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div>
                  <Label className="block text-sm font-medium mb-1">Pembukaan serviks (0–10)</Label>
                  <Input
                    type="number"
                    name="pembukaan"
                    value={formData.pembukaan}
                    onChange={handleChange}
                    min={0}
                    max={10}
                    placeholder="0–10"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Turunnya kepala (0–5)</Label>
                  <Input
                    type="number"
                    name="station"
                    value={formData.station}
                    onChange={handleChange}
                    min={0}
                    max={5}
                    placeholder="0–5"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Waktu</Label>
                  <Input type="time" name="waktu" value={formData.waktu} onChange={handleChange} placeholder="hh:mm" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSave} className="flex-1">
                    {editingIndex !== null ? "Perbarui" : "Simpan"}
                  </Button>
                  {editingIndex !== null && (
                    <Button variant="outline" onClick={() => setEditingIndex(null)} className="flex-1">
                      Batal
                    </Button>
                  )}
                </div>
              </div>

              {/* Riwayat Data */}
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 px-3 font-medium">Waktu</th>
                    <th className="py-2 px-3 font-medium">Menit</th>
                    <th className="py-2 px-3 font-medium">Pembukaan (cm)</th>
                    <th className="py-2 px-3 font-medium">Turun Kepala</th>
                    <th className="py-2 px-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {labor.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground py-4 italic">
                        Belum ada data kemajuan persalinan.
                      </td>
                    </tr>
                  ) : (
                    [...labor]
                      .sort((a, b) => a.t - b.t) // Sort by time
                      .map((item, index) => {
                        const waktu = new Date(item.t).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        const minutesFromStart = Math.floor((item.t - startTime) / 60000)
                        return (
                          <tr key={item.t} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3">{waktu}</td>
                            <td className="py-2 px-3 text-muted-foreground">{minutesFromStart} menit</td>
                            <td className="py-2 px-3">{item.pembukaan}</td>
                            <td className="py-2 px-3">{item.station}</td>
                            <td className="py-2 px-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(index)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(index)}>
                                  Hapus
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // TTV Pasien //
  function TtvPasien({
    maternal,
    urine,
    onMaternalAdd,
    onMaternalUpdateAt,
    onMaternalDeleteAt,
    onUrineAdd,
    onUrineUpdateAt,
    onUrineDeleteAt,
    startTime,
  }: {
    maternal: MaternalVital[]
    urine: UrineEntry[]
    onMaternalAdd: (vital: Omit<MaternalVital, "t">, at?: number) => void
    onMaternalUpdateAt: (index: number, updates: Omit<MaternalVital, "t">, at?: number) => void
    onMaternalDeleteAt: (index: number) => void
    onUrineAdd: (u: Omit<UrineEntry, "t">, at?: number) => void
    onUrineUpdateAt: (index: number, updates: Omit<UrineEntry, "t">, at?: number) => void
    onUrineDeleteAt: (index: number) => void
    startTime: number
  }) {
    // const { toast } = require("@/hooks/use-toast")

    const vitalsData = maternal.map((d) => ({
      x: formatDateTimeLabel(d.t),
      nadi: d.nadi,
      sys: d.sys,
      dia: d.dia,
      suhu: d.suhu,
      rr: d.rr,
      spo2: d.spo2,
    }))

    // Vitals form refs
    const vitalsRef = React.useRef<HTMLDivElement>(null)
    const [editingVitalsIndex, setEditingVitalsIndex] = React.useState<number | null>(null)

    const getVitalsValues = () => {
      const root = vitalsRef.current as HTMLElement
      const getNum = (id: string) => {
        const el = root.querySelector(`#${id}`) as HTMLInputElement
        const v = el?.value
        return v === "" ? undefined : Number(v)
      }
      const sys = getNum("ttv-sys")
      const dia = getNum("ttv-dia")
      const nadi = getNum("ttv-nadi")
      const suhuStr = (root.querySelector("#ttv-suhu") as HTMLInputElement)?.value
      const suhu = suhuStr === "" ? undefined : Number(suhuStr)
      const rr = getNum("ttv-rr")
      const spo2 = getNum("ttv-spo2")
      const dtStr = (root.querySelector("#ttv-dt") as HTMLInputElement)?.value
      const at = dtStr ? new Date(dtStr).getTime() : Date.now()
      return { sys, dia, nadi, suhu, rr, spo2, at }
    }

    const clearVitals = () => {
      const root = vitalsRef.current as HTMLElement
      ;["ttv-sys", "ttv-dia", "ttv-nadi", "ttv-suhu", "ttv-rr", "ttv-spo2", "ttv-dt"].forEach((id) => {
        const el = root.querySelector(`#${id}`) as HTMLInputElement
        if (el) el.value = ""
      })
      setEditingVitalsIndex(null)
    }

    const saveVitals = () => {
      const { sys, dia, nadi, suhu, rr, spo2, at } = getVitalsValues()
      if (
        sys === undefined ||
        dia === undefined ||
        nadi === undefined ||
        suhu === undefined ||
        rr === undefined ||
        spo2 === undefined
      ) {
        toast?.({ title: "Lengkapi data TTV", description: "Semua kolom TTV wajib diisi." })
        return
      }
      // constraint suhu 30–40
      if (suhu < 30 || suhu > 40) {
        toast?.({ title: "Validasi suhu", description: "Suhu harus antara 30–40°C." })
        return
      }
      const payload = { sys, dia, nadi, suhu, rr, spo2 }
      if (editingVitalsIndex !== null) {
        onMaternalUpdateAt(editingVitalsIndex, payload, at)
      } else {
        onMaternalAdd(payload, at)
      }
      clearVitals()
    }

    // Urine form
    const urineRef = React.useRef<HTMLDivElement>(null)
    const [editingUrineIndex, setEditingUrineIndex] = React.useState<number | null>(null)
    const [proteinValue, setProteinValue] = React.useState<string>("")
    const [asetonValue, setAsetonValue] = React.useState<string>("")

    const getUrineValues = () => {
      const root = urineRef.current as HTMLElement
      const volumeStr = (root.querySelector("#urine-vol") as HTMLInputElement)?.value
      const dtStr = (root.querySelector("#urine-dt") as HTMLInputElement)?.value
      const at = dtStr ? new Date(dtStr).getTime() : Date.now()
      const volume = volumeStr === "" ? undefined : Number(volumeStr)
      return { volume, protein: proteinValue || undefined, aseton: asetonValue || undefined, at }
    }

    const clearUrine = () => {
      const root = urineRef.current as HTMLElement
      ;["urine-vol", "urine-dt"].forEach((id) => {
        const el = root.querySelector(`#${id}`) as HTMLInputElement
        if (el) el.value = ""
      })
      setProteinValue("")
      setAsetonValue("")
      setEditingUrineIndex(null)
    }

    const saveUrine = () => {
      const { volume, protein, aseton, at } = getUrineValues()
      const payload = { volume, protein, aseton }
      if (editingUrineIndex !== null) {
        onUrineUpdateAt(editingUrineIndex, payload, at)
      } else {
        onUrineAdd(payload, at)
      }
      clearUrine()
    }

    return (
      <div className="space-y-6">
        {/* Grafik TTV */}
        <Card>
          <CardHeader>
            <CardTitle>Grafik Tanda Vital Ibu</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sys: { label: "Tekanan Darah (Sys)", color: "#111827" },
              }}
            >
              <LineChart data={vitalsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" tickLine={false} />
                <YAxis tickLine={false} />
                {/* Plot dot at systolic; hide connecting line */}
                <Line
                  type="monotone"
                  dataKey="sys"
                  stroke="#111827"
                  strokeOpacity={0}
                  dot={{ r: 4, fill: "#111827" }}
                  activeDot={{ r: 5 }}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const d = payload[0].payload as {
                      x: string
                      sys?: number
                      dia?: number
                      suhu?: number
                      nadi?: number
                      rr?: number
                      spo2?: number
                    }
                    return (
                      <div className="border-border/50 bg-background rounded-md border px-2 py-1 text-xs shadow-xl">
                        <div className="font-medium">{d.x}</div>
                        <div>
                          TD: {d.sys ?? "-"}
                          {d.dia !== undefined ? `/${d.dia}` : ""} mmHg
                        </div>
                        <div>Suhu: {d.suhu ?? "-"} °C</div>
                        <div>Nadi: {d.nadi ?? "-"} x/menit</div>
                        <div>Respirasi: {d.rr ?? "-"} x/menit</div>
                        <div>SpO2: {d.spo2 ?? "-"}%</div>
                      </div>
                    )
                  }}
                />
              </LineChart>
            </ChartContainer>
            <p className="mt-2 text-xs text-muted-foreground">
              Arahkan kursor pada titik untuk melihat detail TTV (tanggal & waktu, nilai lengkap).
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* Transaction 1: Vitals Entry */}
        <Card ref={vitalsRef}>
          <CardHeader>
            <CardTitle>Input Tanda Vital Ibu</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-6 gap-3">
              <div className="grid gap-2">
                <Label>Tanggal & Waktu</Label>
                <Input id="ttv-dt" type="datetime-local" />
              </div>
              <div className="grid gap-2">
                <Label>TD Sistolik</Label>
                <Input id="ttv-sys" type="number" placeholder="mmHg" />
              </div>
              <div className="grid gap-2">
                <Label>TD Diastolik</Label>
                <Input id="ttv-dia" type="number" placeholder="mmHg" />
              </div>
              <div className="grid gap-2">
                <Label>Suhu (°C)</Label>
                <Input id="ttv-suhu" type="number" min={30} max={40} step="0.1" placeholder="30–40" />
              </div>
              <div className="grid gap-2">
                <Label>Nadi</Label>
                <Input id="ttv-nadi" type="number" placeholder="x/menit" />
              </div>
              <div className="grid gap-2">
                <Label>Respirasi</Label>
                <Input id="ttv-rr" type="number" placeholder="x/menit" />
              </div>
              <div className="grid gap-2">
                <Label>Saturasi Oksigen (%)</Label>
                <Input id="ttv-spo2" type="number" placeholder="%" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveVitals}>{editingVitalsIndex !== null ? "Perbarui TTV" : "Simpan TTV"}</Button>
              {editingVitalsIndex !== null && (
                <Button variant="secondary" onClick={() => clearVitals()}>
                  Batalkan
                </Button>
              )}
            </div>

            {/* Riwayat TTV */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-2 text-left">Waktu</th>
                    <th className="px-2 py-2 text-left">TD (sys/dia)</th>
                    <th className="px-2 py-2 text-left">Suhu</th>
                    <th className="px-2 py-2 text-left">Nadi</th>
                    <th className="px-2 py-2 text-left">Respirasi</th>
                    <th className="px-2 py-2 text-left">Saturasi Oksigen</th>
                    <th className="px-2 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maternal.map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-2">{formatDateTimeLabel(m.t)}</td>
                      <td className="px-2 py-2">{`${m.sys}/${m.dia}`}</td>
                      <td className="px-2 py-2">{m.suhu}</td>
                      <td className="px-2 py-2">{m.nadi}</td>
                      <td className="px-2 py-2">{m.rr ?? "-"}</td>
                      <td className="px-2 py-2">{m.spo2 ?? "-"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingVitalsIndex(i)
                              const root = vitalsRef.current as HTMLElement
                              ;(root.querySelector("#ttv-sys") as HTMLInputElement).value = String(m.sys)
                              ;(root.querySelector("#ttv-dia") as HTMLInputElement).value = String(m.dia)
                              ;(root.querySelector("#ttv-suhu") as HTMLInputElement).value = String(m.suhu)
                              ;(root.querySelector("#ttv-nadi") as HTMLInputElement).value = String(m.nadi)
                              ;(root.querySelector("#ttv-rr") as HTMLInputElement).value = m.rr ? String(m.rr) : ""
                              ;(root.querySelector("#ttv-spo2") as HTMLInputElement).value = m.spo2
                                ? String(m.spo2)
                                : ""
                              ;(root.querySelector("#ttv-dt") as HTMLInputElement).value = new Date(m.t)
                                .toISOString()
                                .slice(0, 16)
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onMaternalDeleteAt(i)}>
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {maternal.length === 0 && (
                    <tr>
                      <td className="px-2 py-4 text-muted-foreground" colSpan={7}>
                        Belum ada data TTV.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Transaction 2: Urine Entry */}
        <Card ref={urineRef}>
          <CardHeader>
            <CardTitle>Kondisi Urine</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label>Tanggal & Waktu</Label>
                <Input id="urine-dt" type="datetime-local" />
              </div>
              <div className="grid gap-2">
                <Label>Urine (ml)</Label>
                <Input id="urine-vol" type="number" placeholder="volume" />
              </div>
              <div className="grid gap-2">
                <Label>Urin (Protein)</Label>
                <Select value={proteinValue} onValueChange={setProteinValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negatif">Negatif</SelectItem>
                    <SelectItem value="trace">Trace</SelectItem>
                    <SelectItem value="positif 1">Positif 1</SelectItem>
                    <SelectItem value="positif 2">Positif 2</SelectItem>
                    <SelectItem value="positif 3">Positif 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Urin (Aseton)</Label>
                <Select value={asetonValue} onValueChange={setAsetonValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negatif">Negatif</SelectItem>
                    <SelectItem value="positif 1">Positif 1</SelectItem>
                    <SelectItem value="positif 2">Positif 2</SelectItem>
                    <SelectItem value="positif 3">Positif 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveUrine}>{editingUrineIndex !== null ? "Perbarui Urine" : "Simpan Urine"}</Button>
              {editingUrineIndex !== null && (
                <Button variant="secondary" onClick={() => clearUrine()}>
                  Batalkan
                </Button>
              )}
            </div>

            {/* Riwayat Urine */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-2 text-left">Waktu</th>
                    <th className="px-2 py-2 text-left">Volume (ml)</th>
                    <th className="px-2 py-2 text-left">Protein</th>
                    <th className="px-2 py-2 text-left">Aseton</th>
                    <th className="px-2 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {urine.map((u, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-2">{formatDateTimeLabel(u.t)}</td>
                      <td className="px-2 py-2">{u.volume ?? "-"}</td>
                      <td className="px-2 py-2">{u.protein ?? "-"}</td>
                      <td className="px-2 py-2">{u.aseton ?? "-"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingUrineIndex(i)
                              const root = urineRef.current as HTMLElement
                              ;(root.querySelector("#urine-vol") as HTMLInputElement).value = u.volume
                                ? String(u.volume)
                                : ""
                              setProteinValue(u.protein ?? "")
                              setAsetonValue(u.aseton ?? "")
                              ;(root.querySelector("#urine-dt") as HTMLInputElement).value = new Date(u.t)
                                .toISOString()
                                .slice(0, 16)
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onUrineDeleteAt(i)}>
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {urine.length === 0 && (
                    <tr>
                      <td className="px-2 py-4 text-muted-foreground" colSpan={5}>
                        Belum ada data urine.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catatan Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Makan Terakhir</Label>
                <Input id="last-meal" type="datetime-local" />
              </div>
              <div className="grid gap-2">
                <Label>Minum Terakhir</Label>
                <Input id="last-drink" type="datetime-local" />
              </div>
              {/* state lokal untuk ceklis */}
              {/*
                // state for checkboxes would go here if implemented
              */}
            </div>
            {/* kontrol ceklis (state dideklarasikan di atas komponen bila diinginkan) */}
            {/* Checkbox states would be declared here */}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Terapi & Obat //
  function TerapiObat({
    therapy,
    onTherapyAdd,
    onTherapyUpdateAt,
    onTherapyDeleteAt,
  }: {
    therapy: Therapy[]
    onTherapyAdd: (th: Omit<Therapy, "t">) => void
    onTherapyUpdateAt: (index: number, updates: Omit<Therapy, "t">) => void
    onTherapyDeleteAt: (index: number) => void
  }) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null)

    const getInputs = () => {
      const root = containerRef.current as HTMLElement
      return {
        oksiu: root.querySelector("#oksiu") as HTMLInputElement,
        waktu: root.querySelector("#waktu") as HTMLInputElement,
        cairan: root.querySelector("#cairan") as HTMLInputElement,
        tetes: root.querySelector("#tetes") as HTMLInputElement,
        obat: root.querySelector("#obat") as HTMLInputElement,
      }
    }

    const clearForm = () => {
      const { oksiu, waktu, cairan, tetes, obat } = getInputs()
      if (oksiu) oksiu.value = ""
      if (waktu) waktu.value = ""
      if (cairan) cairan.value = ""
      if (tetes) tetes.value = ""
      if (obat) obat.value = ""
      setEditingIndex(null)
    }

    const handleSubmit = () => {
      const { oksiu, waktu, cairan, tetes, obat } = getInputs()
      const oksitosinUI = oksiu?.value?.trim() || ""
      const waktuStr = waktu?.value?.trim() || ""
      const cairanIV = cairan?.value?.trim() || ""
      const tetesNum = tetes?.value ? Number(tetes.value) : Number.NaN
      const obatTxt = obat?.value?.trim() || ""

      // validation: tetes 1..60 only
      if (!Number.isFinite(tetesNum) || tetesNum < 1 || tetesNum > 60) {
        // simple inline alert; could be replaced with toast()
        window.alert("Jumlah tetes/menit.")
        return
      }
      // basic format hints (not strict): ok to save empty non-required fields
      const payload: Omit<Therapy, "t"> = {
        infus: cairanIV,
        oksitosinDosis: oksitosinUI,
        oksitosinMulai: waktuStr, // hh:mm
        obatLain: obatTxt,
        tetesPerMenit: tetesNum,
      }

      if (editingIndex !== null) {
        onTherapyUpdateAt(editingIndex, payload)
      } else {
        onTherapyAdd(payload)
      }
      clearForm()
    }

    const handleEdit = (idx: number) => {
      const row = therapy[idx]
      const { oksiu, waktu, cairan, tetes, obat } = getInputs()
      if (oksiu) oksiu.value = row.oksitosinDosis || ""
      if (waktu) waktu.value = row.oksitosinMulai || ""
      if (cairan) cairan.value = row.infus || ""
      if (tetes) tetes.value = row.tetesPerMenit?.toString() || ""
      if (obat) obat.value = row.obatLain || ""
      setEditingIndex(idx)
    }

    return (
      <div ref={containerRef} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Terapi &amp; Obat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Oksitosin U/I</Label>
                <Input id="oksiu" placeholder="mis. 5 U/I" />
              </div>
              <div className="grid gap-2">
                <Label>Cairan IV</Label>
                <Input id="cairan" placeholder="mis. RL, NS" />
              </div>
              <div className="grid gap-2">
                <Label>Waktu</Label>
                <Input id="waktu" type="time" placeholder="hh:mm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Jumlah tetes/menit</Label>
                <Input id="tetes" type="number" min={1} max={60} step={1} placeholder="1–60" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Obat</Label>
                <Input id="obat" placeholder="free text: nama & dosis" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmit}>{editingIndex !== null ? "Perbarui" : "Simpan"}</Button>
              {editingIndex !== null && (
                <Button variant="secondary" onClick={clearForm}>
                  Batal
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Terapi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 text-left font-medium">Waktu</th>
                    <th className="py-2 pr-3 text-left font-medium">Oksitosin U/I</th>
                    <th className="py-2 pr-3 text-left font-medium">Jumlah tetes/menit</th>
                    <th className="py-2 pr-3 text-left font-medium">Cairan IV</th>
                    <th className="py-2 pr-3 text-left font-medium">Obat</th>
                    <th className="py-2 pr-0 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {therapy.length === 0 ? (
                    <tr>
                      <td className="py-3 text-muted-foreground" colSpan={6}>
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
                          <td className="py-2 pr-3">{row.oksitosinDosis || "-"}</td>
                          <td className="py-2 pr-3">{row.tetesPerMenit ?? "-"}</td>
                          <td className="py-2 pr-3">{row.infus || "-"}</td>
                          <td className="py-2 pr-3">{row.obatLain || "-"}</td>
                          <td className="py-2 pr-0">
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary" onClick={() => handleEdit(idx)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onTherapyDeleteAt(idx)}>
                                Hapus
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // KontraksiUterusSection Component //
  function KontraksiUterusSection({
    entries,
    onSaveNew,
    onUpdateAt,
    onDeleteAt,
    startTime,
  }: {
    entries: ContractionEntry[]
    onSaveNew: (entry: Omit<ContractionEntry, "t">) => void
    onUpdateAt: (index: number, entry: Omit<ContractionEntry, "t">) => void
    onDeleteAt: (index: number) => void
    startTime: number
  }) {
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
    const [freqInput, setFreqInput] = React.useState("")
    const [durasiInput, setDurasiInput] = React.useState<ContractionEntry["durasi"]>("≤20")

    const handleSave = () => {
      const freq = Number(freqInput)
      if (!Number.isFinite(freq) || freq < 1 || freq > 5) {
        alert("Input kontraksi /10 menit harus antara 1 hingga 5.")
        return
      }

      if (editingIndex !== null) {
        onUpdateAt(editingIndex, { freq, durasi: durasiInput })
        setEditingIndex(null)
      } else {
        onSaveNew({ freq, durasi: durasiInput })
      }
      setFreqInput("")
      setDurasiInput("≤20")
    }

    const handleEdit = (index: number) => {
      const entry = entries[index]
      setEditingIndex(index)
      setFreqInput(entry.freq.toString())
      setDurasiInput(entry.durasi)
    }

    const handleCancelEdit = () => {
      setEditingIndex(null)
      setFreqInput("")
      setDurasiInput("≤20")
    }

    // warna batang berdasarkan durasi
    const getBarColor = (durasi: string) => {
      if (durasi === "≤20") return "#FFA500"
      if (durasi === "20–40") return "#FFD700"
      return "#FF0000"
    }

    // buat data chart (x-axis = waktu dari 0 ke 960 per 30 menit)
    const xAxisLabels = Array.from({ length: 33 }, (_, i) => i * 30) // [0, 30, 60, ..., 960]

    const chartData = xAxisLabels.map((minute, index) => {
      const entry = entries.find((e) => Math.floor((e.t - startTime) / 60000) === minute) // Find entry for this minute
      if (entry) {
        return {
          minute,
          freq: entry.freq,
          durasi: entry.durasi,
          color: getBarColor(entry.durasi),
        }
      }
      return { minute, freq: 0, durasi: "-", color: "#E5E7EB" } // abu-abu kosong
    })

    const ContractionTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
          <div className="bg-background border rounded-lg p-3 shadow-lg">
            <p className="font-medium text-xs">{data.minute} menit</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-xs" style={{ color: data.color }}>
                {data.freq}x/10m
              </p>
              <p className="text-xs text-muted-foreground">({data.durasi})</p>
            </div>
          </div>
        )
      }
      return null
    }

    return (
      <div className="p-6 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monitoring Kontraksi Uterus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col">
                <Label htmlFor="kontraksi-freq" className="text-sm mb-1">
                  Kontraksi / 10 Menit
                </Label>
                <Input
                  id="kontraksi-freq"
                  type="number"
                  placeholder="1–5"
                  value={freqInput}
                  onChange={(e) => setFreqInput(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm mb-1">Durasi Kontraksi</Label>
                <Select value={durasiInput} onValueChange={setDurasiInput}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih durasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="≤20">≤20 detik</SelectItem>
                    <SelectItem value="20–40">20–40 detik</SelectItem>
                    <SelectItem value=">40">&gt;40 detik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSave}>{editingIndex !== null ? "Perbarui" : "Simpan"}</Button>
                {editingIndex !== null && (
                  <Button variant="outline" className="ml-2 bg-transparent" onClick={handleCancelEdit}>
                    Batal
                  </Button>
                )}
              </div>
            </div>

            {/* Grafik */}
            <div className="mt-6">
              <h3 className="font-medium mb-2">Grafik Kontraksi</h3>
              <ChartContainer
                config={{
                  freq: { label: "Kontraksi/10m", color: "var(--color-chart-1)" },
                }}
                className="min-w-[800px] w-full"
              >
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="minute"
                    type="number"
                    domain={[0, 960]}
                    ticks={xAxisLabels}
                    tickFormatter={(v) => `${v}`}
                    label={{
                      value: "Menit",
                      position: "insideBottom",
                      offset: -5,
                      style: { textAnchor: "middle", fill: "#666", fontSize: 12 },
                    }}
                  />
                  <YAxis
                    domain={[1, 5]}
                    tickLine={false}
                    axisLine={{ stroke: "#ccc" }}
                    tick={{ fill: "#666", fontSize: 12 }}
                    label={{
                      value: "Frekuensi Kontraksi / 10 menit",
                      angle: -90,
                      position: "insideLeft",
                      offset: 15,
                      style: { textAnchor: "middle", fill: "#666", fontSize: 12 },
                    }}
                  />
                  <Bar dataKey="freq" radius={4}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                  <ChartTooltip content={<ContractionTooltip />} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Tabel Riwayat */}
            <div className="mt-8">
              <h3 className="font-medium mb-2">Riwayat Input</h3>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Waktu</th>
                    <th className="border p-2">Kontraksi /10 Menit</th>
                    <th className="border p-2">Durasi</th>
                    <th className="border p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-4 italic">
                        Belum ada data input kontraksi
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      const waktu = new Date(entry.t).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      return (
                        <tr key={index}>
                          <td className="border p-2">{waktu}</td>
                          <td className="border p-2">{entry.freq}</td>
                          <td className="border p-2">{entry.durasi}</td>
                          <td className="border p-2 text-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(index)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDeleteAt(index)}>
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  // Helper
  const saveKontraksiBaru = (entry: Omit<ContractionEntry, "t">) => {
    setKontraksi((prev) => [...prev, { ...entry, t: now() }])
  }
  const updateKontraksiAt = (index: number, entry: Omit<ContractionEntry, "t">) => {
    setKontraksi((prev) => prev.map((e, i) => (i === index ? { ...e, ...entry, t: now() } : e)))
  }
  const deleteKontraksiAt = (index: number) => {
    setKontraksi((prev) => prev.filter((_, i) => i !== index))
  }

  // Helper baru untuk labor
  const updateLaborAt = (index: number, updates: Omit<LaborProgress, "t"> & { t: number }) => {
    setLabor((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }
  const deleteLaborAt = (index: number) => {
    setLabor((prev) => prev.filter((_, i) => i !== index))
  }

  // Helper baru untuk urine
  const saveUrineBaru = (entry: Omit<UrineEntry, "t">) => {
    setUrine((prev) => [...prev, { ...entry, t: now() }])
  }
  const updateUrineAt = (index: number, entry: Omit<UrineEntry, "t">) => {
    setUrine((prev) => prev.map((e, i) => (i === index ? { ...e, ...entry, t: now() } : e)))
  }
  const deleteUrineAt = (index: number) => {
    setUrine((prev) => prev.filter((_, i) => i !== index))
  }

  const chartConfig = {
    pembukaan: { label: "Pembukaan (cm)", color: "var(--color-chart-1)" },
    djj: { label: "DJJ (bpm)", color: "var(--color-chart-1)" },
    freq: { label: "Kontraksi/10m", color: "var(--color-chart-1)" },
    nadi: { label: "Nadi", color: "var(--color-chart-1)" },
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-pretty text-xl font-semibold md:text-2xl">Partograf Digital</h1>
            <p className="text-sm text-muted-foreground">Monitoring Persalinan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addDemoData}>
            Isi contoh data
          </Button>
        </div>
      </header>

      <Separator className="my-4" />
      {/* Pasien Section - Selalu Terlihat */}
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
      {/* Main Content - Tabs untuk Section Lainnya */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {" "}
          {/* Changed to 5 columns */}
          <TabsTrigger value="janin" className="text-base font-semibold">
            Monitoring Kondisi Janin
          </TabsTrigger>
          <TabsTrigger value="persalinan" className="text-base font-semibold">
            Kemajuan Persalinan
          </TabsTrigger>
          <TabsTrigger value="kontraksi" className="text-base font-semibold">
            Kontraksi Uterus
          </TabsTrigger>
          <TabsTrigger value="terapi" className="text-base font-semibold">
            Terapi & Obat
          </TabsTrigger>
          <TabsTrigger value="ttv" className="text-base font-semibold">
            {" "}
            {/* Added TTV Tab */}
            TTV Pasien
          </TabsTrigger>
        </TabsList>

        <TabsContent value="janin" className="space-y-6">
          <MonitoringKondisiJanin
            fetal={fetal}
            onFetalAdd={(reading) => setFetal((prev) => [...prev, { ...reading, t: now() }])}
            onFetalUpdate={(
              index,
              reading, // Changed to use onFetalUpdate
            ) => setFetal((prev) => prev.map((r, i) => (i === index ? { ...r, ...reading } : r)))}
            startTime={startTime}
          />
        </TabsContent>

        <TabsContent value="persalinan" className="space-y-6">
          <KemajuanPersalinan
            labor={labor}
            onLaborAdd={(progress) => setLabor((prev) => [...prev, { ...progress, t: now() }])}
            onLaborUpdateAt={updateLaborAt}
            onLaborDeleteAt={deleteLaborAt}
            startTime={startTime}
          />
        </TabsContent>

        {/* konten tab Kontraksi Uterus (mengganti sebelumnya tab "ibu") */}
        <TabsContent value="kontraksi" className="space-y-6">
          <KontraksiUterusSection
            entries={kontraksi}
            onSaveNew={saveKontraksiBaru}
            onUpdateAt={updateKontraksiAt}
            onDeleteAt={deleteKontraksiAt}
            startTime={startTime}
          />
        </TabsContent>

        <TabsContent value="terapi" className="space-y-6">
          <TerapiObat
            therapy={therapy}
            onTherapyAdd={(th) => setTherapy((prev) => [...prev, { ...th, t: now() }])}
            onTherapyUpdateAt={(index, updates) =>
              setTherapy((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)))
            }
            onTherapyDeleteAt={(index) => setTherapy((prev) => prev.filter((_, i) => i !== index))}
          />
        </TabsContent>

        <TabsContent value="ttv" className="space-y-6">
          <TtvPasien
            maternal={maternal}
            urine={urine}
            startTime={startTime}
            onMaternalAdd={(v, at) => setMaternal((prev) => [...prev, { ...v, t: at ?? Date.now() }])}
            onMaternalUpdateAt={(index, updates, at) =>
              setMaternal((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates, t: at ?? m.t } : m)))
            }
            onMaternalDeleteAt={(index) => setMaternal((prev) => prev.filter((_, i) => i !== index))}
            onUrineAdd={(u, at) => setUrine((prev) => [...prev, { ...u, t: at ?? Date.now() }])}
            onUrineUpdateAt={(index, updates, at) =>
              setUrine((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates, t: at ?? m.t } : m)))
            }
            onUrineDeleteAt={(index) => setUrine((prev) => prev.filter((_, i) => i !== index))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default PartografApp // Export the renamed component
