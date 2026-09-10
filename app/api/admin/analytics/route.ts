import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'day'
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const refDate = new Date(dateStr)
    if (isNaN(refDate.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }

    let startDate: Date
    let endDate: Date
    let currentLabel = ''
    let buckets: { label: string; views: number; uniquesSet: Set<string> }[] = []

    const MONTH_NAMES = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    const SHORT_MONTHS = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
    ]

    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

    if (period === 'day') {
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0)
      endDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999)

      const dayName = DAY_NAMES[startDate.getDay()]
      const monthName = MONTH_NAMES[startDate.getMonth()]
      currentLabel = `${dayName} ${startDate.getDate()} ${monthName} ${startDate.getFullYear()}`

      for (let h = 0; h < 24; h++) {
        const label = `${h.toString().padStart(2, '0')}h`
        buckets.push({ label, views: 0, uniquesSet: new Set() })
      }
    } else if (period === 'week') {
      const dayOfWeek = refDate.getDay() // 0 = Sun, 1 = Mon...
      const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMon, 0, 0, 0, 0)
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999)

      const startMonth = MONTH_NAMES[startDate.getMonth()]
      const endMonth = MONTH_NAMES[endDate.getMonth()]
      currentLabel = startDate.getMonth() === endDate.getMonth()
        ? `Semaine du ${startDate.getDate()} au ${endDate.getDate()} ${startMonth} ${startDate.getFullYear()}`
        : `Semaine du ${startDate.getDate()} ${startMonth} au ${endDate.getDate()} ${endMonth} ${endDate.getFullYear()}`

      const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
        const label = `${weekDays[i]} ${d.getDate()}/${d.getMonth() + 1}`
        buckets.push({ label, views: 0, uniquesSet: new Set() })
      }
    } else if (period === 'month') {
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0)
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999)

      currentLabel = `${MONTH_NAMES[startDate.getMonth()]} ${startDate.getFullYear()}`

      const daysInMonth = endDate.getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const label = d.toString().padStart(2, '0')
        buckets.push({ label, views: 0, uniquesSet: new Set() })
      }
    } else { // year
      startDate = new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0)
      endDate = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999)

      currentLabel = `Année ${startDate.getFullYear()}`

      for (let m = 0; m < 12; m++) {
        buckets.push({ label: SHORT_MONTHS[m], views: 0, uniquesSet: new Set() })
      }
    }

    const supabase = getSupabaseAdmin()

    const { data: viewsData, error } = await supabase
      .from('page_views')
      .select('created_at, visitor_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (error) {
      console.error('Erreur requete analytics:', error)
      throw error
    }

    const globalUniquesSet = new Set<string>()

    if (viewsData) {
      viewsData.forEach(row => {
        const vDate = new Date(row.created_at)
        globalUniquesSet.add(row.visitor_id)

        let bucketIndex = -1

        if (period === 'day') {
          bucketIndex = vDate.getHours()
        } else if (period === 'week') {
          const diffDays = Math.floor((vDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
          bucketIndex = Math.min(Math.max(diffDays, 0), 6)
        } else if (period === 'month') {
          bucketIndex = vDate.getDate() - 1
        } else if (period === 'year') {
          bucketIndex = vDate.getMonth()
        }

        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
          buckets[bucketIndex].views += 1
          buckets[bucketIndex].uniquesSet.add(row.visitor_id)
        }
      })
    }

    let maxViews = 0
    let peakLabel = 'Aucune donnée'

    const chartData = buckets.map(b => {
      if (b.views > maxViews) {
        maxViews = b.views
        peakLabel = `${b.label} (${b.views} vue${b.views > 1 ? 's' : ''})`
      }
      return {
        label: b.label,
        views: b.views,
        uniques: b.uniquesSet.size
      }
    })

    return NextResponse.json({
      period,
      currentLabel,
      totalViews: viewsData ? viewsData.length : 0,
      totalUniques: globalUniquesSet.size,
      peakLabel,
      chartData
    })
  } catch (err) {
    console.error('Erreur API Analytics:', err)
    return NextResponse.json({ error: 'Erreur serveur analytics' }, { status: 500 })
  }
}
