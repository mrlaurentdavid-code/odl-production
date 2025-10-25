/**
 * Edge Function: Refresh Currency Rates
 *
 * Fetches daily exchange rates from Frankfurter API (ECB rates)
 * and stores them in currency_change table.
 *
 * Pairs: EUR→CHF, USD→CHF, GBP→CHF
 * Schedule: Daily at 2:00 AM (pg_cron)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CurrencyPair {
  base: string
  quote: string
}

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: {
    [key: string]: number
  }
}

serve(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Currency pairs to fetch
    const pairs: CurrencyPair[] = [
      { base: 'EUR', quote: 'CHF' },
      { base: 'USD', quote: 'CHF' },
      { base: 'GBP', quote: 'CHF' }
    ]

    const results: { [key: string]: number } = {}
    let errors: string[] = []

    // Fetch rates for each pair
    for (const { base, quote } of pairs) {
      try {
        console.log(`Fetching ${base}→${quote}...`)

        const response = await fetch(
          `https://api.frankfurter.app/latest?from=${base}&to=${quote}`
        )

        if (!response.ok) {
          throw new Error(`Frankfurter API error: ${response.status}`)
        }

        const data: FrankfurterResponse = await response.json()
        const rate = data.rates[quote]

        if (!rate) {
          throw new Error(`Rate not found for ${base}→${quote}`)
        }

        // Insert into database
        const { error } = await supabase
          .from('currency_change')
          .insert({
            date: data.date,
            base: base,
            quote: quote,
            rate: rate,
            source: 'frankfurter',
            fetched_at: new Date().toISOString()
          })

        if (error) {
          throw new Error(`Database insert error: ${error.message}`)
        }

        results[`${base}→${quote}`] = rate
        console.log(`✓ ${base}→${quote} = ${rate}`)

      } catch (error) {
        const errorMsg = `Failed to fetch ${base}→${quote}: ${error.message}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        timestamp: new Date().toISOString(),
        rates: results,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: errors.length === 0 ? 200 : 207, // 207 = Multi-Status (partial success)
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
