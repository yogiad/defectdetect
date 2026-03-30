import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { 
  BarChart3, 
  FileDown, 
  AlertTriangle, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'

interface Inspection {
  id: string
  created_at: string
  item_type: string
  defect_type: string
  severity: string
  category: string
  description: string
  image_url: string
}

function App() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchInspections()
  }, [])

  async function fetchInspections() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInspections(data || [])
    } catch (err) {
      console.error('Error fetching inspections:', err)
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    const tableColumn = ["Date", "Item", "Defect", "Severity", "Category"]
    const tableRows: any[] = []

    inspections.forEach(insp => {
      const inspData = [
        format(new Date(insp.created_at), 'yyyy-MM-dd'),
        insp.item_type,
        insp.defect_type,
        insp.severity,
        insp.category
      ]
      tableRows.push(inspData)
    })

    doc.text("Property Maintenance Inspection Report", 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22)

    // @ts-ignore
    doc.autoTable(tableColumn, tableRows, { startY: 30 })
    doc.save(`inspection-report-${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  const filteredInspections = inspections.filter(insp => 
    insp.item_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insp.defect_type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Dynamic Stats
  const highSeverityCount = inspections.filter(i => i.severity?.includes('3')).length
  
  const avgSeverity = inspections.length > 0
    ? (inspections.reduce((acc, curr) => {
        const val = parseInt(curr.severity?.[0] || '1')
        return acc + val
      }, 0) / inspections.length).toFixed(1)
    : "0.0"

  const lastSyncText = inspections.length > 0 
    ? format(new Date(inspections[0].created_at), 'HH:mm')
    : "None"

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <BarChart3 size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">DefectDetect <span className="text-sm font-normal text-slate-500 italic">Admin</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchInspections}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-slate-600 transition-colors hover:bg-slate-50 active:scale-95 shadow-sm"
              title="Refresh Data"
            >
              <Clock size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={generatePDF}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-md"
            >
              <FileDown size={16} />
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <StatCard 
            title="Total Inspections" 
            value={inspections.length} 
            icon={<CheckCircle2 className="text-emerald-600" />} 
            color="bg-emerald-50"
          />
          <StatCard 
            title="Critical Issues" 
            value={highSeverityCount} 
            icon={<AlertTriangle className="text-rose-600" />} 
            color="bg-rose-50"
          />
          <StatCard 
            title="Avg. Severity" 
            value={`Score ${avgSeverity}`} 
            icon={<BarChart3 className="text-amber-600" />} 
            color="bg-amber-50"
          />
          <StatCard 
            title="Latest Sync" 
            value={lastSyncText} 
            icon={<Search className="text-sky-600" />} 
            color="bg-sky-50"
          />
        </div>

        {/* List Section */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col border-b p-6 gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800">Recent Detections</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {filteredInspections.length} Results
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search item or defect..." 
                  className="h-10 w-full rounded-lg border-slate-200 bg-slate-50 pl-10 pr-4 text-sm transition-focus focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-slate-600 hover:bg-slate-50 shadow-sm">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[13px] font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Item & Defect</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="h-16 px-6 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="text-slate-300" />
                        <p className="text-slate-500">No inspections found matching your search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((insp) => (
                    <tr key={insp.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{insp.item_type}</span>
                          <span className="text-sm text-slate-500">{insp.defect_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-600 border">
                          {insp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <SeverityBadge severity={insp.severity} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {format(new Date(insp.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a 
                          href={insp.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-400 opacity-0 transition-opacity hover:bg-white hover:text-blue-600 group-hover:opacity-100 shadow-sm"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const isHigh = severity?.includes('3')
  const isMed = severity?.includes('2')
  
  const colorClass = isHigh 
    ? 'bg-rose-50 text-rose-700 border-rose-100' 
    : isMed 
      ? 'bg-amber-50 text-amber-700 border-amber-100' 
      : 'bg-emerald-50 text-emerald-700 border-emerald-100'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {severity}
    </span>
  )
}

export default App
