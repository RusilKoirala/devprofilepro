	import { numbersIn } from "@/lib/record/verify" 

const FILLER = new Set( ["a", "an", "the", "in", "with", "of", "and", "at", "for", "on", "to", "from", "by", "as", "is", "was", "using", "via", "my", "i"])
  const SIMILAR=0.8

function tokens(text: string): Set<string> {    
  const words = text.toLowerCase().normalize("NFKC").match(/[a-z]+/g) ?? []
  return new Set(words.map((w)=>w.replace(/s$/, "")).filter((w) => !FILLER.has(w))) 
}

  function numbers(text: string): string {
  return numbersIn(text).map((n) => n.replace(/[–—]/g, "-")).sort().join("|")
}

  export function sameFact(a: string, b: string): boolean {
  if (numbers(a) !== numbers(b)) return false

  const ta = tokens(a)
  const tb = tokens( b)
  if (!ta.size || !tb.size) return a.trim().toLowerCase() === b.trim().toLowerCase()
let shared = 0
for (const t of ta) if (tb.has(t)) shared++  
return shared / (ta.size + tb.size - shared) >= SIMILAR
}

  export interface FactLike {
  id: string  
 item_id: string
  text: string 
}

export function findDuplicateFacts(facts: FactLike[], citations: Map<string,number> = new Map()): Map<string, string> {
  const merge = new Map<string,string>( )
  const byItem = new Map<string, FactLike[]>()


  for (const f of facts) byItem.set(f.item_id,[...(byItem.get(f.item_id) ?? []), f])

  for (const group of byItem.values()) {
    const keepers: FactLike[]=[]
       const ranked =  [...group].map((f, order) => ({ f, order })).sort((x, y) => (citations.get(y.f.id) ?? 0) - (citations.get(x.f.id) ?? 0) || x.order - y.order)
    for ( const { f } of ranked) {
      const keep = keepers.find((k) => sameFact(k.text, f.text))
      if ( keep) merge.set(f.id, keep.id)
         else keepers.push(f)
   }
    }
  return merge    
}
