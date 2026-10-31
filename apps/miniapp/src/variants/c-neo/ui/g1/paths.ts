import { searchPath } from '../../lib/util'

/** Budget shelf: cheapest first, capped at 150 000 UZS (the search screen reads `max`). */
export const BUDGET_MAX = 150_000
export const budgetPath = () => `${searchPath({ sort: 'price_asc' })}&max=${BUDGET_MAX}`
