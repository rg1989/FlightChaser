// shared/flightId.ts
// A flight as people type it: a ticket number (W4 3257, LY315: an airline's 2-character designator and a number) or a
// callsign (WMT7403, ELY315, N123AB: what the aircraft itself sends; an airline's is its 3-letter designator and a flight
// number). The search box asks the server about a text only when it reads as one (client/ui/searchBox.ts); the server looks
// it up (server/flightSearch.ts). Also here: which known ids are one slip of the keyboard away from a typed one.

export interface FlightId {
  id: string // as searched: upper case, no spaces or hyphens ('W43257')
  callsign: string | null // the id itself when an aircraft can send it as it is (ELY315, N123AB); null for a ticket number
  ticket: { airline: string; number: string } | null // a ticket number's parts ('W4', '3257'); null for a callsign
}

const ID = /^[A-Z0-9]{3,8}$/ // ADS-B carries 8 characters at most
const AIRLINE_CALLSIGN = /^[A-Z]{3}\d[A-Z0-9]{0,4}$/ // as shared/airlines.ts FLIGHT_ID
// A ticket number: the designator is two characters with a letter (W4, U2, LY, 5F), the number 1 to 4 digits and at most
// one letter after them (BA12A).
const TICKET = /^([A-Z][A-Z0-9]|\d[A-Z])(\d{1,4}[A-Z]?)$/
// An aircraft type's designator, which people type to find such aircraft: A320, B738, E190, C172, A21N, B38M, B77W.
const TYPE_LIKE = /^[A-Z]\d{2}[A-Z0-9]$/

/**
 * The flight a text names, or null when it does not read as one: 3 to 8 letters and digits with at least one of each, with
 * at most one space or hyphen inside ('w4 3257', 'LY-315'; 'tel aviv 1' is words).
 */
export function parseFlightId(text: string): FlightId | null {
  const parts = /^([A-Z0-9]+)[\s-]?([A-Z0-9]*)$/.exec(text.trim().toUpperCase())
  if (parts === null) return null
  const id = parts[1] + parts[2]
  if (!ID.test(id) || !/[A-Z]/.test(id) || !/\d/.test(id)) return null
  if (AIRLINE_CALLSIGN.test(id)) return { id, callsign: id, ticket: null }
  const t = TICKET.exec(id)
  if (t !== null) return { id, callsign: null, ticket: { airline: t[1], number: t[2] } }
  return { id, callsign: id, ticket: null }
}

/** Whether the id reads as an aircraft type too (A320, B738): the search box then looks it up only when asked. */
export const typeLike = (id: string): boolean => TYPE_LIKE.test(id)

/** A ticket number as it is printed: 'W4 3257'. */
export const ticketText = (t: { airline: string; number: string }): string => `${t.airline} ${t.number}`

/**
 * Whether b is one slip from a (and not a itself): one character wrong, missing or extra, or two neighbours swapped.
 * (Damerau–Levenshtein distance 1, without building the table.)
 */
export function oneSlip(a: string, b: string): boolean {
  if (a === b) return false
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  if (l.length - s.length > 1) return false
  let i = 0
  while (i < s.length && s[i] === l[i]) i++
  if (s.length === l.length) {
    if (s.slice(i + 1) === l.slice(i + 1)) return true // one wrong
    return s[i] === l[i + 1] && s[i + 1] === l[i] && s.slice(i + 2) === l.slice(i + 2) // two swapped
  }
  return s.slice(i) === l.slice(i + 1) // one missing
}

/** Those of `known` one slip from id, at most max of them, in known's order. */
export function slips(id: string, known: Iterable<string>, max: number): string[] {
  const out: string[] = []
  for (const k of known) {
    if (out.length >= max) break
    if (oneSlip(id, k)) out.push(k)
  }
  return out
}
