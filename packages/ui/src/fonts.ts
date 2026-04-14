/**
 * @monprojetpro/ui - Font configuration constants
 *
 * next/font/google can only be initialized in Next.js app code.
 * This file exports font variable names and config for consistency
 * across apps. Each app layout.tsx imports Poppins/Inter from
 * next/font/google and applies these variable names.
 */

/** CSS variable name for Poppins (headings/UI) */
export const FONT_VARIABLE_POPPINS = '--font-poppins'

/** CSS variable name for Inter (body text) */
export const FONT_VARIABLE_INTER = '--font-inter'

/** Poppins weights used across the platform */
export const POPPINS_WEIGHTS = ['400', '500', '600', '700'] as const

/** Inter weights used across the platform */
export const INTER_WEIGHTS = ['400', '500'] as const
