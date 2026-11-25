import { getSupabaseAdmin } from './supabaseAdmin'
import { isOrdersOpenOverride } from './config'

/**
 * Récupère le statut du mode testeur depuis la base Supabase (app_settings)
 * ou depuis la variable d'environnement ORDERS_OPEN_OVERRIDE.
 */
export async function isTestModeEnabled(): Promise<boolean> {
  // 1. Si la variable d'environnement force déjà l'ouverture
  if (isOrdersOpenOverride()) {
    return true
  }

  // 2. Vérification dans la table Supabase app_settings
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'orders_test_mode')
      .maybeSingle()

    if (error || !data) {
      return false
    }

    const val = data.value as { enabled?: boolean }
    return Boolean(val?.enabled)
  } catch (err) {
    console.warn('[Settings] Impossible de lire app_settings :', err)
    return false
  }
}

/**
 * Active ou désactive le mode testeur dans Supabase
 */
export async function setTestModeEnabled(enabled: boolean): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'orders_test_mode',
          value: { enabled },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (error) {
      console.error('[Settings] Erreur mise à jour orders_test_mode :', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[Settings] Exception setTestModeEnabled :', err)
    return false
  }
}
