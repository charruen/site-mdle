import { NextResponse } from 'next/server'
import { calculateSubmissionTotal, ProjectFormConfig } from '@/lib/projects'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

type SubmissionInput = {
  buyerFirstname?: unknown
  buyerLastname?: unknown
  buyerClass?: unknown
  receiverFirstname?: unknown
  receiverLastname?: unknown
  receiverClass?: unknown
  selectedOptions?: unknown
  quantity?: unknown
  isAnonymous?: unknown
  hasMessage?: unknown
  message?: unknown
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function selectedOptionsFrom(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, string>
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
  }

  try {
    const input = await request.json() as SubmissionInput
    const supabase = getSupabaseAdmin()
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, slug, is_active, form_config')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Cette opération est indisponible.' }, { status: 404 })
    }

    const config = (project.form_config ?? {}) as ProjectFormConfig
    const buyerFirstname = cleanText(input.buyerFirstname, 80)
    const buyerLastname = cleanText(input.buyerLastname, 80)
    const buyerClass = cleanText(input.buyerClass, 40)
    const receiverFirstname = cleanText(input.receiverFirstname, 80)
    const receiverLastname = cleanText(input.receiverLastname, 80)
    const receiverClass = cleanText(input.receiverClass, 40)
    const message = cleanText(input.message, 300)
    const selectedOptions = selectedOptionsFrom(input.selectedOptions)
    const quantityInput = Number(input.quantity)
    const quantity = config.allow_quantity ? Math.min(Math.max(Number.isInteger(quantityInput) ? quantityInput : 1, 1), 50) : 1
    const hasMessage = Boolean(config.allow_message && input.hasMessage === true && message.length > 0)

    if (!buyerFirstname || !buyerLastname || !buyerClass) {
      return NextResponse.json({ error: 'Prénom, nom et classe sont obligatoires.' }, { status: 400 })
    }

    if (config.has_receiver && (!receiverFirstname || !receiverLastname || !receiverClass)) {
      return NextResponse.json({ error: 'Les informations du destinataire sont obligatoires.' }, { status: 400 })
    }

    const allowedOptions: Record<string, string> = {}
    for (const option of config.options ?? []) {
      const selectedChoice = selectedOptions[option.id]
      const validChoice = option.choices.find((choice) => choice.name === selectedChoice)
      if (!validChoice) {
        return NextResponse.json({ error: 'Un choix de formulaire est invalide.' }, { status: 400 })
      }
      allowedOptions[option.id] = validChoice.name
    }

    const totalPrice = calculateSubmissionTotal(config, allowedOptions, quantity)
    const { error: insertError } = await supabase.from('project_submissions').insert({
      project_id: project.id,
      project_slug: project.slug,
      buyer_firstname: buyerFirstname,
      buyer_lastname: buyerLastname,
      buyer_class: buyerClass,
      receiver_firstname: config.has_receiver ? receiverFirstname : null,
      receiver_lastname: config.has_receiver ? receiverLastname : null,
      receiver_class: config.has_receiver ? receiverClass : null,
      selected_options: allowedOptions,
      quantity,
      is_anonymous: config.allow_anonymous && input.isAnonymous === true,
      message: hasMessage ? message : null,
      total_price: totalPrice,
      is_paid: false,
      is_delivered: false,
    })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ success: true, totalPrice })
  } catch (error) {
    console.error('Enregistrement de réservation impossible :', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer la réservation. Réessaie dans quelques instants.' }, { status: 500 })
  }
}
