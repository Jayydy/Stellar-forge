import type { TokenInfo, SortOrder } from '../types'

export function applyFilters(
  tokens: TokenInfo[] | null | undefined,
  search: string,
  creator: string,
  sort: SortOrder
): TokenInfo[] {
  let list = [...(tokens ?? [])]

  if (search) {
    const q = search.toLowerCase()
    list = list.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q)
    )
  }

  if (creator) {
    const c = creator.toLowerCase()
    list = list.filter(t => t.creator.toLowerCase().includes(c))
  }

  switch (sort) {
    case 'oldest':
      list = list.reverse()
      break
    case 'alphabetical':
      list = list.sort((a, b) => a.name.localeCompare(b.name))
      break
    // 'newest' is a no-op — parent provides tokens in newest-first order
  }

  return list
}
