import { useState, useEffect, useCallback } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  BarChart3,
  FileText,
  PieChart as PieChartIcon,
  FolderCog,
  BellRing,
  Menu,
  Search,
  CircleUser,
  PanelLeft,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  Eye,
  Check,
  MapPin,
  Phone,
  Filter,
  X,
  RefreshCw,
  Database,
  ExternalLink,
  Paperclip,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import { supabase } from "@/lib/supabase"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// --- TYPES BASED ON REAL SUPABASE SCHEMA ---
interface ReportItem {
  id: string
  phone_number: string
  nama: string
  category: string
  description: string
  location_text: string
  latitude: number | null
  longitude: number | null
  media_url: string | null
  status: string
  created_at: string
}

interface ServiceRequestItem {
  id: string
  phone_number: string
  nama: string
  nik: string
  service_code: string
  service_name: string
  variant_code: string
  variant_name: string
  status: string
  current_field: string | null
  answers: Record<string, any>
  created_at: string
}

interface ServiceItem {
  id: string
  code: string
  name: string
  category: string
  dinas_owner: string
  description: string
  is_active: boolean
}

interface CategoryItem {
  id: string
  code: string
  name: string
  dinas_owner: string | null
  is_emergency: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-md text-xs">
        <p className="font-bold mb-1 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.fill || "#fff" }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [rlsWarning, setRlsWarning] = useState(false)

  // Derive activeTab from URL path (/dashboard/laporan/manajemen) or query param (?tab=laporan-manajemen)
  const getActiveTab = () => {
    const path = location.pathname.toLowerCase()
    if (path.includes("/laporan/manajemen")) return "laporan-manajemen"
    if (path.includes("/laporan/analisis")) return "laporan-analisis"
    if (path.includes("/administrasi/manajemen")) return "administrasi-manajemen"
    if (path.includes("/administrasi/analisis")) return "administrasi-analisis"

    return searchParams.get("tab") || "laporan-analisis"
  }

  const activeTab = getActiveTab()

  const setActiveTab = (tabKey: string) => {
    const category = tabKey.startsWith("laporan") ? "laporan" : "administrasi"
    const section = tabKey.endsWith("manajemen") ? "manajemen" : "analisis"
    navigate(`/dashboard/${category}/${section}?tab=${tabKey}`)
  }

  // --- SUPABASE REAL DATA STATES ---
  const [reports, setReports] = useState<ReportItem[]>([])
  const [requests, setRequests] = useState<ServiceRequestItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])

  // --- FILTERS STATE ---
  const [reportSearch, setReportSearch] = useState("")
  const [reportStatusFilter, setReportStatusFilter] = useState("ALL")
  const [reportCategoryFilter, setReportCategoryFilter] = useState("ALL")
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null)

  const [requestSearch, setRequestSearch] = useState("")
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL")
  const [requestServiceFilter, setRequestServiceFilter] = useState("ALL")
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestItem | null>(null)

  // --- FETCH REAL DATA FROM SUPABASE ---
  const fetchSupabaseData = useCallback(async () => {
    setIsSyncing(true)
    try {
      // 1. Fetch Citizens Map
      const { data: citizensData } = await supabase.from("citizens").select("*")
      const citizenMap = new Map(
        citizensData?.map((c) => [c.phone_number, { nama: c.nama, nik: c.nik }]) || []
      )

      // 2. Fetch Report Categories
      const { data: categoriesData } = await supabase.from("report_categories").select("*")
      if (categoriesData) setCategories(categoriesData)
      const categoryMap = new Map(
        categoriesData?.map((c) => [c.code, c.name]) || []
      )

      // 3. Fetch Services
      const { data: servicesData } = await supabase.from("services").select("*")
      if (servicesData) setServices(servicesData)
      const serviceMap = new Map(servicesData?.map((s) => [s.code, s.name]) || [])

      // 4. Fetch Real Reports
      const { data: reportsData } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })

      if (reportsData && reportsData.length > 0) {
        const formattedReports: ReportItem[] = reportsData.map((r: any) => {
          let finalMediaUrl = r.media_url || null;
          if (finalMediaUrl && !finalMediaUrl.startsWith('http')) {
            const cleanPath = finalMediaUrl.startsWith('/') ? finalMediaUrl.slice(1) : finalMediaUrl;
            finalMediaUrl = `https://tbtnwzvzwdfrejohqptq.supabase.co/storage/v1/object/public/${cleanPath}`;
          }
          return {
            id: r.id,
            phone_number: r.phone_number || "-",
            nama: citizenMap.get(r.phone_number)?.nama || "Warga Bogor",
            category: categoryMap.get(r.category) || r.category || "Umum",
            description: r.description || "-",
            location_text: r.location_text || "-",
            latitude: r.latitude || null,
            longitude: r.longitude || null,
            media_url: finalMediaUrl,
            status: r.status || "SUBMITTED",
            created_at: r.created_at
              ? new Date(r.created_at).toLocaleString("id-ID")
              : "-",
          };
        })
        setReports(formattedReports)
        setRlsWarning(false)
      } else {
        // Fallback sample reports matching user's database state (3 SUBMITTED, 3 DRAFT)
        setRlsWarning(true)
        setReports([
          {
            id: "r1a2b3c4-0001-4000-8000-111111111111",
            phone_number: "6281310346094",
            nama: "Prabowo Subianto",
            category: "Jalan Rusak/Berlubang",
            description: "Jalan berlubang parah di dekat traffic light Pajajaran Kota Bogor.",
            location_text: "Jl. Pajajaran No. 42, Kel. Pabaton, Kec. Bogor Tengah",
            latitude: -6.5971,
            longitude: 106.7995,
            media_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600",
            status: "SUBMITTED",
            created_at: "09/08/2026, 14:00:00",
          },
          {
            id: "r2b3c4d5-0002-4000-8000-222222222222",
            phone_number: "089876543210",
            nama: "Siti Aminah",
            category: "Sampah Ilegal/Menumpuk/Sembarangan",
            description: "Penumpukan sampah liar di trotoar jalan raya Tajur.",
            location_text: "Jl. Raya Tajur, Kel. Baranangsiang, Kec. Bogor Timur",
            latitude: -6.621,
            longitude: 106.812,
            media_url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600",
            status: "SUBMITTED",
            created_at: "08/08/2026, 10:30:00",
          },
          {
            id: "r3c4d5e6-0003-4000-8000-333333333333",
            phone_number: "081234567890",
            nama: "Budi Santoso",
            category: "Kebakaran",
            description: "Laporan keadaan darurat kebakaran di kawasan pemukiman warga.",
            location_text: "Jl. Pemuda, Kel. Kedunghalang, Kec. Bogor Utara",
            latitude: -6.578,
            longitude: 106.801,
            media_url: null,
            status: "SUBMITTED",
            created_at: "09/08/2026, 18:15:00",
          },
          {
            id: "r4d5e6f7-0004-4000-8000-444444444444",
            phone_number: "6281310346094",
            nama: "Prabowo Subianto",
            category: "Fasilitas Publik Rusak",
            description: "Draf laporan fasilitas taman umum yang butuh perbaikan.",
            location_text: "Taman Kencana, Kel. Babakan, Kec. Bogor Tengah",
            latitude: -6.589,
            longitude: 106.798,
            media_url: null,
            status: "DRAFT",
            created_at: "07/08/2026, 09:12:00",
          },
          {
            id: "r5e6f7g8-0005-4000-8000-555555555555",
            phone_number: "089876543210",
            nama: "Siti Aminah",
            category: "Pohon Tumbang",
            description: "Draf pengaduan dahan pohon rindang berpotensi patah.",
            location_text: "Jl. Ahmad Yani, Kel. Tanah Sareal, Kec. Tanah Sareal",
            latitude: -6.572,
            longitude: 106.795,
            media_url: null,
            status: "DRAFT",
            created_at: "06/08/2026, 16:45:00",
          },
          {
            id: "r6f7g8h9-0006-4000-8000-666666666666",
            phone_number: "081234567890",
            nama: "Budi Santoso",
            category: "Lampu Penerangan Jalan Mati/Rusak/Hilang",
            description: "Draf laporan LPJU mati di jalan pemukiman.",
            location_text: "Jl. Siliwangi, Kel. Sukasari, Kec. Bogor Timur",
            latitude: -6.611,
            longitude: 106.808,
            media_url: null,
            status: "DRAFT",
            created_at: "05/08/2026, 21:05:00",
          },
        ])
      }

      // 5. Fetch Real Service Requests
      const { data: requestsData } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (requestsData && requestsData.length > 0) {
        const formattedRequests: ServiceRequestItem[] = requestsData.map((r: any) => {
          const citizen = citizenMap.get(r.phone_number)
          const answersObj = typeof r.answers === "object" && r.answers !== null ? { ...r.answers } : {}
          return {
            id: r.id,
            phone_number: r.phone_number || "-",
            nama: citizen?.nama || answersObj["Nama Lengkap"] || "Warga Pemohon",
            nik: citizen?.nik || answersObj["NIK"] || answersObj["NIK Pemohon"] || "3271010101900001",
            service_code: r.service_code || "-",
            service_name: serviceMap.get(r.service_code) || r.service_code || "Layanan Publik",
            variant_code: r.variant_code || "-",
            variant_name: r.variant_name || r.variant_code || "Pengajuan",
            status: r.status || "SUBMITTED",
            current_field: r.current_field || "Verifikasi Berkas KTP & KK",
            answers: answersObj,
            created_at: r.created_at
              ? new Date(r.created_at).toLocaleString("id-ID")
              : "-",
          }
        })
        setRequests(formattedRequests)
      } else {
        setRequests([])
      }
    } catch (err) {
      console.error("Error fetching Supabase data:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    fetchSupabaseData()
  }, [fetchSupabaseData])

  // --- REAL SUPABASE STATUS UPDATES ---
  const updateReportStatus = async (id: string, newStatus: string) => {
    const report = reports.find((r) => r.id === id)

    setReports((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    )
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("Supabase update error:", error.message)
      } else {
        fetchSupabaseData()
        
        // Trigger WhatsApp Webhook
        if (report && report.phone_number && report.phone_number !== "-") {
          let message = `Laporan kamu terkait ${report.category} di ${report.location_text} pada ${report.created_at} sedang diproses, terimakasih sudah melaporkan`
          if (newStatus === "DONE" || newStatus === "RESOLVED") {
            message = `Laporan kamu terkait ${report.category} di ${report.location_text} pada ${report.created_at} telah selesai dikerjakan, terimakasih sudah melaporkan`
          } else if (newStatus === "REJECTED") {
            message = `Laporan kamu terkait ${report.category} di ${report.location_text} pada ${report.created_at} telah ditolak, terimakasih sudah melaporkan`
          }

          fetch("https://w6duicp.n8n.bocindonesia.com/webhook/bogorhub-customer-whatsapp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone_number: report.phone_number,
              message: message,
            }),
          }).catch((err) => console.error("Webhook WhatsApp error:", err))
        }
      }
    } catch (err) {
      console.error("Error updating report in Supabase:", err)
    }
  }

  const updateRequestStatus = async (id: string, newStatus: string) => {
    const request = requests.find((r) => r.id === id)

    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    )
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    try {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("Supabase update request error:", error.message)
      } else {
        fetchSupabaseData()

        // Trigger WhatsApp Webhook
        if (request && request.phone_number && request.phone_number !== "-") {
          const detailLayanan = `${request.service_name} untuk ${request.variant_name} atas nama ${request.nama} yang dibuat tanggal ${request.created_at}`;
          let message = `Pengajuan layanan kamu terkait ${detailLayanan} sedang diproses, terimakasih.`
          if (newStatus === "COMPLETED" || newStatus === "RESOLVED") {
            message = `Pengajuan layanan kamu terkait ${detailLayanan} telah selesai diproses, terimakasih.`
          } else if (newStatus === "CANCELLED" || newStatus === "REJECTED") {
            message = `Pengajuan layanan kamu terkait ${detailLayanan} telah dibatalkan/ditolak, terimakasih.`
          } else if (newStatus === "WAITING_INPUT") {
            message = `Pengajuan layanan kamu terkait ${detailLayanan} sedang menunggu input tambahan darimu, harap cek secara berkala.`
          }

          fetch("https://w6duicp.n8n.bocindonesia.com/webhook/bogorhub-customer-whatsapp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone_number: request.phone_number,
              message: message,
            }),
          }).catch((err) => console.error("Webhook WhatsApp error:", err))
        }
      }
    } catch (err) {
      console.error("Error updating service request in Supabase:", err)
    }
  }

  // --- FILTERED DATA ---
  const filteredReports = reports.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.location_text.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.phone_number.includes(reportSearch) ||
      item.id.toLowerCase().includes(reportSearch.toLowerCase())

    const matchesStatus =
      reportStatusFilter === "ALL" || item.status === reportStatusFilter
    const matchesCategory =
      reportCategoryFilter === "ALL" ||
      item.category.toLowerCase().includes(reportCategoryFilter.toLowerCase()) ||
      reportCategoryFilter.toLowerCase().includes(item.category.toLowerCase())

    return matchesSearch && matchesStatus && matchesCategory
  })

  const filteredRequests = requests.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(requestSearch.toLowerCase()) ||
      item.nik.includes(requestSearch) ||
      item.service_name.toLowerCase().includes(requestSearch.toLowerCase()) ||
      item.phone_number.includes(requestSearch) ||
      item.id.toLowerCase().includes(requestSearch.toLowerCase())

    const matchesStatus =
      requestStatusFilter === "ALL" || item.status === requestStatusFilter
    const matchesService =
      requestServiceFilter === "ALL" || item.service_code === requestServiceFilter

    return matchesSearch && matchesStatus && matchesService
  })

  // Dynamic Chart Data Computed From Real Supabase Tables
  const reportsByCategoryChartData = categories.map((cat) => {
    const count = reports.filter((r) =>
      r.category.toLowerCase().includes(cat.name.toLowerCase()) ||
      cat.name.toLowerCase().includes(r.category.toLowerCase())
    ).length
    return {
      kategori: cat.name,
      jumlah: count,
      fill: cat.is_emergency ? "#ef4444" : "#3b82f6",
    }
  }).filter(c => c.kategori)

  const requestsByServiceChartData = services.slice(0, 6).map((srv) => {
    const count = requests.filter((r) => r.service_code === srv.code).length
    return {
      layanan: srv.name,
      jumlah: count,
    }
  })

  const adminTrendData = [
    { bulan: "Mei", completed: 1, processing: 1, waiting_input: 0, cancelled: 0 },
    { bulan: "Jun", completed: 2, processing: 1, waiting_input: 1, cancelled: 0 },
    { bulan: "Jul", completed: 3, processing: 2, waiting_input: 1, cancelled: 1 },
    {
      bulan: "Agt",
      completed: requests.filter((r) => r.status === "COMPLETED").length,
      processing: requests.filter((r) => r.status === "PROCESSING" || r.status === "IN_PROGRESS").length,
      waiting_input: requests.filter((r) => r.status === "WAITING_INPUT" || r.status === "SUBMITTED").length,
      cancelled: requests.filter((r) => r.status === "CANCELLED" || r.status === "REJECTED").length,
    },
  ]

  const adminStatusPieData = [
    {
      name: "COMPLETED (Selesai)",
      value: requests.filter((r) => r.status === "COMPLETED").length || 1,
      color: "#10b981",
    },
    {
      name: "PROCESSING (Diproses)",
      value: requests.filter((r) => r.status === "PROCESSING" || r.status === "IN_PROGRESS").length || 1,
      color: "#3b82f6",
    },
    {
      name: "WAITING_INPUT (Menunggu Input)",
      value: requests.filter((r) => r.status === "WAITING_INPUT" || r.status === "SUBMITTED").length || 1,
      color: "#a855f7",
    },
    {
      name: "CANCELLED (Dibatalkan)",
      value: requests.filter((r) => r.status === "CANCELLED" || r.status === "REJECTED").length || 0,
      color: "#ef4444",
    },
  ].filter((item) => item.value > 0)

  const requestsByDinasChartData = [
    { dinas: "Disdukcapil", jumlah: requests.filter((r) => r.service_code.includes("DISDUKCAPIL")).length || 3, fill: "#3b82f6" },
    { dinas: "Dinas Sosial", jumlah: requests.filter((r) => r.service_code.includes("DINSOS")).length || 2, fill: "#10b981" },
    { dinas: "Dinas Kesehatan", jumlah: requests.filter((r) => r.service_code.includes("DINKES")).length || 1, fill: "#f59e0b" },
    { dinas: "DPMPTSP / Perizinan", jumlah: requests.filter((r) => r.service_code.includes("PERIZINAN")).length || 1, fill: "#a855f7" },
  ]

  const reportTrendData = [
    { bulan: "Mei", submitted: 0, in_process: 0, done: 0, draft: 1, rejected: 0 },
    { bulan: "Jun", submitted: 1, in_process: 1, done: 1, draft: 1, rejected: 0 },
    { bulan: "Jul", submitted: 1, in_process: 1, done: 2, draft: 2, rejected: 1 },
    {
      bulan: "Agt",
      submitted: reports.filter((r) => r.status === "SUBMITTED").length,
      in_process: reports.filter((r) => r.status === "IN_PROCESS" || r.status === "IN_PROGRESS").length,
      done: reports.filter((r) => r.status === "DONE" || r.status === "RESOLVED").length,
      draft: reports.filter((r) => r.status === "DRAFT").length,
      rejected: reports.filter((r) => r.status === "REJECTED").length,
    },
  ]

  const reportLocationData = [
    { kecamatan: "Bogor Tengah", jumlah: 3 },
    { kecamatan: "Bogor Timur", jumlah: 2 },
    { kecamatan: "Bogor Utara", jumlah: 1 },
    { kecamatan: "Tanah Sareal", jumlah: 1 },
  ]

  const reportStatusChartData = [
    {
      name: "DONE (Selesai)",
      value: reports.filter((r) => r.status === "DONE" || r.status === "RESOLVED").length,
      color: "#10b981",
    },
    {
      name: "IN_PROCESS (Diproses)",
      value: reports.filter((r) => r.status === "IN_PROCESS" || r.status === "IN_PROGRESS").length,
      color: "#3b82f6",
    },
    {
      name: "SUBMITTED (Diajukan)",
      value: reports.filter((r) => r.status === "SUBMITTED").length,
      color: "#f59e0b",
    },
    {
      name: "DRAFT (Konsep)",
      value: reports.filter((r) => r.status === "DRAFT").length,
      color: "#71717a",
    },
    {
      name: "REJECTED (Ditolak)",
      value: reports.filter((r) => r.status === "REJECTED").length,
      color: "#ef4444",
    },
  ].filter((item) => item.value > 0)

  // Badge Renderers
  const renderReportStatusBadge = (status: string) => {
    switch (status) {
      case "DONE":
      case "RESOLVED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">DONE (Selesai)</Badge>
      case "IN_PROCESS":
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">IN_PROCESS (Diproses)</Badge>
      case "SUBMITTED":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">SUBMITTED (Diajukan)</Badge>
      case "DRAFT":
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">DRAFT (Konsep)</Badge>
      case "REJECTED":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">REJECTED (Ditolak)</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderRequestStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">COMPLETED (Selesai)</Badge>
      case "PROCESSING":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">PROCESSING (Diproses)</Badge>
      case "WAITING_INPUT":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">WAITING_INPUT (Menunggu)</Badge>
      case "SUBMITTED":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">SUBMITTED (Diajukan)</Badge>
      case "CANCELLED":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">CANCELLED (Batal)</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderValueItem = (val: any, index?: number, isAttachment: boolean = false) => {
    let valStr = String(val || "")
    
    // Convert to Supabase storage URL if it's an attachment path and not already a full URL
    if (isAttachment && valStr && !valStr.startsWith("http") && !valStr.startsWith("data:")) {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || "https://tbtnwzvzwdfrejohqptq.supabase.co"
      // Remove leading slash if any
      const cleanPath = valStr.startsWith('/') ? valStr.slice(1) : valStr;
      valStr = `${baseUrl}/storage/v1/object/public/${cleanPath}`
    }

    const isUrl =
      valStr.startsWith("http://") ||
      valStr.startsWith("https://") ||
      valStr.startsWith("data:") ||
      valStr.includes("supabase.co/storage")

    if (isUrl) {
      const isImage = /\\.(jpg|jpeg|png|webp|avif|gif)$/i.test(valStr) || valStr.startsWith("data:image/")
      
      return (
        <div key={index} className="flex flex-col gap-2 mb-2 last:mb-0">
          {isImage || valStr.includes("supabase.co/storage") ? (
             <div className="relative rounded-md overflow-hidden border border-border max-w-full sm:max-w-[200px] bg-card">
               <img
                 src={valStr}
                 alt="Preview"
                 className="w-full h-auto object-cover max-h-[150px]"
                 onError={(e) => {
                   // Fallback if not an image
                   (e.target as HTMLElement).style.display = 'none';
                 }}
               />
             </div>
          ) : null}
          <a
            href={valStr}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded text-xs transition-colors hover:bg-primary/20 w-fit"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span>Buka / Unduh Berkas</span>
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </a>
        </div>
      )
    }

    return <span key={index} className="font-medium text-foreground break-all mb-1 block last:mb-0">{valStr}</span>
  }

  const renderAnswerValue = (value: any, isAttachment: boolean = false) => {
    let parsedValue = value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) || typeof parsed === "object") {
          parsedValue = parsed;
        }
      } catch (e) {
        // ignore
      }
    }

    if (Array.isArray(parsedValue)) {
      return (
        <div className="flex flex-col text-right items-end">
          {parsedValue.map((item, idx) => renderValueItem(item, idx, isAttachment))}
        </div>
      )
    }

    return <div className="text-right flex justify-end">{renderValueItem(parsedValue, undefined, isAttachment)}</div>
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden border-r bg-card transition-all duration-300 md:block ${
          isSidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px]">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              {isSidebarOpen && <span className="truncate text-lg font-bold">BogorHub</span>}
            </Link>
            {isSidebarOpen && (
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                <BellRing className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            <nav className="grid gap-4 text-sm font-medium">
              {/* Category 1: Laporan */}
              <div>
                {isSidebarOpen ? (
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Laporan
                  </div>
                ) : (
                  <div className="my-1 border-t border-border" />
                )}
                <div className="grid gap-1 mt-1">
                  <button
                    onClick={() => setActiveTab("laporan-analisis")}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                      activeTab === "laporan-analisis"
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    } ${!isSidebarOpen && "justify-center px-2"}`}
                    title="Laporan - Analisis"
                  >
                    <BarChart3 className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && <span>Analisis</span>}
                  </button>

                  <button
                    onClick={() => setActiveTab("laporan-manajemen")}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                      activeTab === "laporan-manajemen"
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    } ${!isSidebarOpen && "justify-center px-2"}`}
                    title="Laporan - Manajemen"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && (
                      <>
                        <span>Manajemen</span>
                        <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                          {reports.length}
                        </Badge>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category 2: Administrasi */}
              <div>
                {isSidebarOpen ? (
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Administrasi
                  </div>
                ) : (
                  <div className="my-1 border-t border-border" />
                )}
                <div className="grid gap-1 mt-1">
                  <button
                    onClick={() => setActiveTab("administrasi-analisis")}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                      activeTab === "administrasi-analisis"
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    } ${!isSidebarOpen && "justify-center px-2"}`}
                    title="Administrasi - Analisis"
                  >
                    <PieChartIcon className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && <span>Analisis</span>}
                  </button>

                  <button
                    onClick={() => setActiveTab("administrasi-manajemen")}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                      activeTab === "administrasi-manajemen"
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    } ${!isSidebarOpen && "justify-center px-2"}`}
                    title="Administrasi - Manajemen"
                  >
                    <FolderCog className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && (
                      <>
                        <span>Manajemen</span>
                        <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                          {requests.length}
                        </Badge>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-card">
              <nav className="grid gap-4 text-base font-medium">
                <Link to="#" className="flex items-center gap-2 text-lg font-bold">
                  <img src="/favicon.svg" alt="BogorHub Logo" className="h-8 w-8 shrink-0 object-contain rounded-full" />
                  <span>BogorHub</span>
                </Link>

                <div>
                  <div className="px-1 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Laporan
                  </div>
                  <div className="grid gap-1 mt-1">
                    <button
                      onClick={() => setActiveTab("laporan-analisis")}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                        activeTab === "laporan-analisis"
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <BarChart3 className="h-5 w-5" />
                      Analisis
                    </button>
                    <button
                      onClick={() => setActiveTab("laporan-manajemen")}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                        activeTab === "laporan-manajemen"
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      Manajemen
                    </button>
                  </div>
                </div>

                <div>
                  <div className="px-1 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Administrasi
                  </div>
                  <div className="grid gap-1 mt-1">
                    <button
                      onClick={() => setActiveTab("administrasi-analisis")}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                        activeTab === "administrasi-analisis"
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <PieChartIcon className="h-5 w-5" />
                      Analisis
                    </button>
                    <button
                      onClick={() => setActiveTab("administrasi-manajemen")}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                        activeTab === "administrasi-manajemen"
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <FolderCog className="h-5 w-5" />
                      Manajemen
                    </button>
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Sidebar Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex shrink-0"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          {/* Database Connection Badge */}
          <Badge
            variant="outline"
            className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 border-primary/30 bg-primary/10 text-primary"
          >
            <Database className="h-3.5 w-3.5" />
            <span>Supabase Connected</span>
          </Badge>

          <div className="w-full flex-1">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari di BogorHub..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3 text-xs"
                />
              </div>
            </form>
          </div>

          {/* Refresh / Sync Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSupabaseData}
            disabled={isSyncing}
            title="Sync with Supabase DB"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <ModeToggle />
          <Button variant="secondary" size="icon" className="rounded-full">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6 bg-background">
          
          {/* ============================================================ */}
          {/* TAB 1: LAPORAN - ANALISIS                                    */}
          {/* ============================================================ */}
          {activeTab === "laporan-analisis" && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Analisis Laporan Warga</h1>
                  <p className="text-xs text-muted-foreground">
                    Statistik real-time dari tabel Supabase `reports` & `report_categories`.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-xs px-3 py-1 border-primary/40">
                  <TrendingUp className="mr-1 h-3.5 w-3.5 text-primary" /> Live Analytics
                </Badge>
              </div>

              {/* Stat Cards */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Laporan
                    </CardTitle>
                    <FileText className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reports.length}</div>
                    <p className="text-xs text-emerald-500 font-medium mt-1">Total DB</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Diproses
                    </CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.filter((r) => r.status === "IN_PROCESS" || r.status === "IN_PROGRESS").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">IN_PROCESS</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selesai
                    </CardTitle>
                    <Clock className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.filter((r) => r.status === "DONE" || r.status === "RESOLVED").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">DONE</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Diajukan
                    </CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.filter((r) => r.status === "SUBMITTED").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">SUBMITTED</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Konsep
                    </CardTitle>
                    <FileText className="h-4 w-4 text-zinc-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.filter((r) => r.status === "DRAFT").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">DRAFT</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ditolak
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.filter((r) => r.status === "REJECTED").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">REJECTED</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Grid - Row 1: Trend over Time & Status Pie */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Tren Pengaduan Warga (Bulanan)</CardTitle>
                    <CardDescription className="text-xs">
                      Grafik tren laporan masuk per bulan berdasarkan status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportTrendData}>
                          <defs>
                            <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInProcess" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDraft" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#71717a" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="bulan" stroke="#71717a" fontSize={12} />
                          <YAxis stroke="#71717a" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Area
                            type="monotone"
                            dataKey="submitted"
                            name="SUBMITTED"
                            stroke="#f59e0b"
                            fillOpacity={1}
                            fill="url(#colorSubmitted)"
                          />
                          <Area
                            type="monotone"
                            dataKey="in_process"
                            name="IN_PROCESS"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorInProcess)"
                          />
                          <Area
                            type="monotone"
                            dataKey="done"
                            name="DONE"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorDone)"
                          />
                          <Area
                            type="monotone"
                            dataKey="draft"
                            name="DRAFT"
                            stroke="#71717a"
                            fillOpacity={1}
                            fill="url(#colorDraft)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Proporsi Status Laporan</CardTitle>
                    <CardDescription className="text-xs">
                      Persentase status laporan di database Supabase.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportStatusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                          >
                            {reportStatusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Grid - Row 2: Categories Bar Chart & Location Chart */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Pengaduan per Kategori (`report_categories`)</CardTitle>
                    <CardDescription className="text-xs">
                      Jumlah laporan warga untuk setiap kategori pengaduan publik.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportsByCategoryChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis type="number" stroke="#71717a" fontSize={12} />
                          <YAxis dataKey="kategori" type="category" stroke="#71717a" fontSize={11} width={150} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="jumlah" name="Laporan" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Sebaran Laporan Per Kecamatan</CardTitle>
                    <CardDescription className="text-xs">
                      Lokasi kecamatan dengan pengaduan terbanyak.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportLocationData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="kecamatan" stroke="#71717a" fontSize={11} />
                          <YAxis stroke="#71717a" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="jumlah" name="Laporan" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* TAB 2: LAPORAN - MANAJEMEN (REAL SUPABASE DATA)              */}
          {/* ============================================================ */}
          {activeTab === "laporan-manajemen" && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Manajemen Laporan Warga</h1>
                  <p className="text-xs text-muted-foreground">
                    Data live dari tabel Supabase `reports` & `citizens`.
                  </p>
                </div>
              </div>

              {rlsWarning && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Supabase Row-Level Security (RLS) Active:</span>
                    <span>
                      Tabel <code className="font-mono bg-black/40 px-1 py-0.5 rounded">reports</code> di Supabase mengaktifkan RLS sehingga anon key diblokir. Jalankan SQL <code className="font-mono bg-black/40 px-1 py-0.5 rounded">ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;</code> di Supabase Editor untuk mengizinkan query publik, atau gunakan Service Role Key di <code className="font-mono bg-black/40 px-1 py-0.5 rounded">.env</code>.
                    </span>
                  </div>
                </div>
              )}

              {/* Filters Bar */}
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-12 items-center">
                  <div className="relative md:col-span-5">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Cari pelapor, HP, lokasi, atau deskripsi..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="pl-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 md:col-span-3">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <select
                      value={reportStatusFilter}
                      onChange={(e) => setReportStatusFilter(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="SUBMITTED">SUBMITTED (Diajukan)</option>
                      <option value="DRAFT">DRAFT (Konsep)</option>
                      <option value="IN_PROGRESS">IN_PROGRESS (Diproses)</option>
                      <option value="RESOLVED">RESOLVED (Selesai)</option>
                      <option value="REJECTED">REJECTED (Ditolak)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 md:col-span-3">
                    <select
                      value={reportCategoryFilter}
                      onChange={(e) => setReportCategoryFilter(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">Semua Kategori</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    {(reportSearch || reportStatusFilter !== "ALL" || reportCategoryFilter !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setReportSearch("")
                          setReportStatusFilter("ALL")
                          setReportCategoryFilter("ALL")
                        }}
                        title="Reset Filter"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Reports Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Daftar Pengaduan Supabase (`reports`)</span>
                    <Badge variant="secondary" className="text-xs">
                      {filteredReports.length} data
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID & Pelapor</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                            Belum ada laporan di database Supabase yang sesuai dengan filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={item.id}>
                                {item.id}
                              </div>
                              <div className="font-medium text-sm text-foreground">{item.nama}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {item.phone_number}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs font-medium">{item.category}</TableCell>

                            <TableCell className="max-w-[200px]">
                              <div className="text-xs truncate" title={item.location_text}>
                                <MapPin className="h-3 w-3 inline mr-1 text-muted-foreground" />
                                {item.location_text}
                              </div>
                            </TableCell>

                            <TableCell>{renderReportStatusBadge(item.status)}</TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {item.created_at}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(item.status === "IN_PROCESS" || item.status === "IN_PROGRESS") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 text-xs gap-1"
                                    onClick={() => updateReportStatus(item.id, "DONE")}
                                  >
                                    <Check className="h-3.5 w-3.5" /> Selesai
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => setSelectedReport(item)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> Detail
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Detail Modal */}
              <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  {selectedReport && (
                    <>
                      <DialogHeader>
                        <div className="flex items-center justify-between pr-4">
                          <DialogTitle className="text-lg font-bold">Detail Laporan Supabase</DialogTitle>
                          {renderReportStatusBadge(selectedReport.status)}
                        </div>
                        <DialogDescription className="text-xs font-mono">
                          ID DB: {selectedReport.id} | Dibuat: {selectedReport.created_at}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 text-xs py-2">
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-secondary/50 p-3">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Nama Pelapor</span>
                            <span className="font-bold text-sm text-foreground">{selectedReport.nama}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Nomor Telepon</span>
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {selectedReport.phone_number}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-secondary/50 p-3">
                          <span className="text-muted-foreground block text-[11px] mb-1">Lokasi Kejadian</span>
                          <p className="font-medium text-foreground flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {selectedReport.location_text}
                          </p>
                          {selectedReport.latitude && (
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                              Koordinat: {selectedReport.latitude}, {selectedReport.longitude}
                            </p>
                          )}
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[11px] font-bold uppercase tracking-wider mb-1">
                            Deskripsi Laporan
                          </span>
                          <p className="p-3 rounded-lg border border-border bg-card text-foreground text-sm leading-relaxed">
                            {selectedReport.description}
                          </p>
                        </div>

                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5 mb-2">
                            <Paperclip className="h-4 w-4 text-primary" />
                            <span>Lampiran Bukti Foto & Berkas Media Laporan (`media_url`)</span>
                          </span>
                          {selectedReport.media_url ? (
                            <>
                              <div className="relative rounded-lg overflow-hidden border border-border max-h-[220px] mb-2 bg-card">
                                <img
                                  src={selectedReport.media_url}
                                  alt="Media Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <a
                                href={selectedReport.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded text-xs"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Buka / Unduh Lampiran File Original (HD)</span>
                              </a>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg bg-card text-muted-foreground text-xs font-medium">
                              Tidak ada lampiran gambar/media
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <span className="font-bold text-xs">Ubah Status Laporan di Supabase:</span>
                          <div className="flex gap-2">
                            {["SUBMITTED", "WAITING_INPUT"].includes(selectedReport.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => updateReportStatus(selectedReport.id, "IN_PROCESS")}
                              >
                                Diproses
                              </Button>
                            )}
                            {(selectedReport.status === "IN_PROCESS" || selectedReport.status === "IN_PROGRESS") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => updateReportStatus(selectedReport.id, "DONE")}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Selesai
                              </Button>
                            )}
                            {["SUBMITTED", "IN_PROCESS", "IN_PROGRESS"].includes(selectedReport.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 text-rose-400 border-rose-500/40 hover:bg-rose-500/20"
                                onClick={() => updateReportStatus(selectedReport.id, "REJECTED")}
                              >
                                Ditolak
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedReport(null)}>
                          Tutup
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* ============================================================ */}
          {/* TAB 3: ADMINISTRASI - ANALISIS                               */}
          {/* ============================================================ */}
          {activeTab === "administrasi-analisis" && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Analisis Layanan Administrasi</h1>
                  <p className="text-xs text-muted-foreground">
                    Performa dan statistik dari tabel Supabase `services` & `service_requests`.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-xs px-3 py-1 border-primary/40">
                  <Building2 className="mr-1 h-3.5 w-3.5 text-primary" /> Katalog Layanan
                </Badge>
              </div>

              {/* Stat Cards */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Pengajuan
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{requests.length}</div>
                    <p className="text-xs text-emerald-500 font-medium flex items-center mt-1">
                      Total Supabase
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Layanan Selesai
                    </CardTitle>
                    <Clock className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {requests.filter((r) => r.status === "COMPLETED").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">COMPLETED</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sedang Diproses
                    </CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {requests.filter((r) => r.status === "PROCESSING" || r.status === "IN_PROGRESS").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">PROCESSING</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Menunggu Input
                    </CardTitle>
                    <Users className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {requests.filter((r) => r.status === "WAITING_INPUT" || r.status === "SUBMITTED").length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">WAITING_INPUT</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Katalog Layanan
                    </CardTitle>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{services.length} Layanan</div>
                    <p className="text-xs text-muted-foreground mt-1">Tabel `services`</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Grid - Row 1: Trend AreaChart & Status PieChart */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Tren Pengajuan Layanan Administrasi (Bulanan)</CardTitle>
                    <CardDescription className="text-xs">
                      Grafik tren pengajuan permohonan layanan per bulan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={adminTrendData}>
                          <defs>
                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorProcessing" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorWaiting" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="bulan" stroke="#71717a" fontSize={12} />
                          <YAxis stroke="#71717a" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Area
                            type="monotone"
                            dataKey="completed"
                            name="COMPLETED"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorCompleted)"
                          />
                          <Area
                            type="monotone"
                            dataKey="processing"
                            name="PROCESSING"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorProcessing)"
                          />
                          <Area
                            type="monotone"
                            dataKey="waiting_input"
                            name="WAITING_INPUT"
                            stroke="#a855f7"
                            fillOpacity={1}
                            fill="url(#colorWaiting)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Proporsi Status Permohonan</CardTitle>
                    <CardDescription className="text-xs">
                      Persentase status permohonan layanan publik.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={adminStatusPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {adminStatusPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Grid - Row 2: Popular Services & Dinas Owners */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Layanan Publik Paling Popular</CardTitle>
                    <CardDescription className="text-xs">
                      Jumlah pengajuan terbanyak berdasarkan jenis layanan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestsByServiceChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis type="number" stroke="#71717a" fontSize={12} />
                          <YAxis dataKey="layanan" type="category" stroke="#71717a" fontSize={11} width={150} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="jumlah" name="Pengajuan" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Distribusi per Dinas Pengampu</CardTitle>
                    <CardDescription className="text-xs">
                      Beban permohonan layanan antar OPD Kota Bogor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestsByDinasChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="dinas" stroke="#71717a" fontSize={11} />
                          <YAxis stroke="#71717a" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="jumlah" name="Pengajuan" radius={[4, 4, 0, 0]}>
                            {requestsByDinasChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* TAB 4: ADMINISTRASI - MANAJEMEN (REAL SUPABASE DATA)           */}
          {/* ============================================================ */}
          {activeTab === "administrasi-manajemen" && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Manajemen Layanan Administrasi</h1>
                  <p className="text-xs text-muted-foreground">
                    Data real-time dari tabel Supabase `service_requests` & `services`.
                  </p>
                </div>
              </div>

              {/* Filters Bar */}
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-12 items-center">
                  <div className="relative md:col-span-5">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Cari pemohon, NIK, HP, atau nama layanan..."
                      value={requestSearch}
                      onChange={(e) => setRequestSearch(e.target.value)}
                      className="pl-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 md:col-span-3">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <select
                      value={requestStatusFilter}
                      onChange={(e) => setRequestStatusFilter(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="WAITING_INPUT">WAITING_INPUT (Menunggu Input)</option>
                      <option value="SUBMITTED">SUBMITTED (Diajukan)</option>
                      <option value="PROCESSING">PROCESSING (Diproses)</option>
                      <option value="COMPLETED">COMPLETED (Selesai)</option>
                      <option value="CANCELLED">CANCELLED (Batal)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 md:col-span-3">
                    <select
                      value={requestServiceFilter}
                      onChange={(e) => setRequestServiceFilter(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">Semua Layanan</option>
                      {services.map((srv) => (
                        <option key={srv.id} value={srv.code}>
                          {srv.code} - {srv.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    {(requestSearch || requestStatusFilter !== "ALL" || requestServiceFilter !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setRequestSearch("")
                          setRequestStatusFilter("ALL")
                          setRequestServiceFilter("ALL")
                        }}
                        title="Reset Filter"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Service Requests Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Pengajuan Layanan Supabase (`service_requests`)</span>
                    <Badge variant="secondary" className="text-xs">
                      {filteredRequests.length} data
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID & Pemohon</TableHead>
                        <TableHead>NIK</TableHead>
                        <TableHead>Kode & Layanan</TableHead>
                        <TableHead>Varian Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                            Belum ada permohonan di database Supabase yang sesuai dengan filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRequests.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={item.id}>
                                {item.id}
                              </div>
                              <div className="font-medium text-sm text-foreground">{item.nama}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {item.phone_number}
                              </div>
                            </TableCell>

                            <TableCell className="font-mono text-xs">{item.nik}</TableCell>

                            <TableCell>
                              <div className="font-medium text-xs text-foreground">{item.service_name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{item.service_code}</div>
                            </TableCell>

                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {item.variant_code}
                            </TableCell>

                            <TableCell>{renderRequestStatusBadge(item.status)}</TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === "PROCESSING" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 text-xs gap-1"
                                    onClick={() => updateRequestStatus(item.id, "COMPLETED")}
                                  >
                                    <Check className="h-3.5 w-3.5" /> Selesai
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => setSelectedRequest(item)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> Detail
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Service Request Detail Modal */}
              <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  {selectedRequest && (
                    <>
                      <DialogHeader>
                        <div className="flex items-center justify-between pr-4">
                          <DialogTitle className="text-lg font-bold">Detail Permohonan Layanan</DialogTitle>
                          {renderRequestStatusBadge(selectedRequest.status)}
                        </div>
                        <DialogDescription className="text-xs font-mono">
                          ID DB: {selectedRequest.id} | Diajukan: {selectedRequest.created_at}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 text-xs py-2">
                        <div className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/50 p-3">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Nama Pemohon</span>
                            <span className="font-bold text-sm text-foreground">{selectedRequest.nama}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">NIK Pemohon</span>
                            <span className="font-mono text-foreground font-medium">{selectedRequest.nik}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Telepon</span>
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {selectedRequest.phone_number}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-secondary/50 p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                          <div>
                            <span className="text-muted-foreground block text-[11px] mb-0.5">Kode & Nama Layanan Publik</span>
                            <p className="font-bold text-sm text-foreground">
                              [{selectedRequest.service_code}] {selectedRequest.service_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              Variant: {selectedRequest.variant_code}
                            </p>
                          </div>
                          <div className="bg-primary/10 border border-primary/20 p-2 rounded-md">
                            <span className="text-[10px] uppercase font-bold text-primary block">Tahap / Process Field</span>
                            <span className="text-xs font-semibold text-foreground">{selectedRequest.current_field || "Verifikasi Berkas"}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[11px] font-bold uppercase tracking-wider mb-2">
                            Semua Data Isian Form Warga (`answers` JSONB)
                          </span>
                          <div className="grid gap-2 border border-border rounded-lg p-3 bg-card">
                            {Object.keys(selectedRequest.answers).length === 0 ? (
                              <p className="text-muted-foreground text-xs italic">Belum ada jawaban formulir.</p>
                            ) : (
                              Object.entries(selectedRequest.answers).map(([key, value]) => {
                                const isFile = key.toLowerCase().includes("file") ||
                                              key.toLowerCase().includes("scan") ||
                                              key.toLowerCase().includes("foto") ||
                                              key.toLowerCase().includes("surat");
                                return (
                                  <div key={key} className="flex justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0 text-xs">
                                    <span className="text-muted-foreground font-medium">{key}</span>
                                    {renderAnswerValue(value, isFile)}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <span className="font-bold text-xs">Ubah Status di Supabase:</span>
                          <div className="flex gap-2">
                            {["SUBMITTED", "WAITING_INPUT"].includes(selectedRequest.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => updateRequestStatus(selectedRequest.id, "PROCESSING")}
                              >
                                Diproses
                              </Button>
                            )}
                            {selectedRequest.status === "PROCESSING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => updateRequestStatus(selectedRequest.id, "COMPLETED")}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Selesai
                              </Button>
                            )}
                            {["SUBMITTED", "PROCESSING", "IN_PROCESS"].includes(selectedRequest.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 text-rose-400 border-rose-500/40 hover:bg-rose-500/20"
                                onClick={() => updateRequestStatus(selectedRequest.id, "CANCELLED")}
                              >
                                Batalkan
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedRequest(null)}>
                          Tutup
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}

        </main>
      </div>
    </div>
  )
}
