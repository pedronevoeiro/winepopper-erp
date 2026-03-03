export interface OFXTransaction {
  type: string
  date: string
  amount: number
  memo: string
  fitid: string
}

export function parseOFX(content: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = []
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const block = match[1]
    const getTag = (tag: string) => {
      const m = new RegExp(`<${tag}>([^<\\n]+)`, 'i').exec(block)
      return m ? m[1].trim() : ''
    }
    const rawDate = getTag('DTPOSTED')
    const dateStr = rawDate.length >= 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : ''
    transactions.push({
      type: getTag('TRNTYPE'),
      date: dateStr,
      amount: parseFloat(getTag('TRNAMT')) || 0,
      memo: getTag('MEMO') || getTag('NAME'),
      fitid: getTag('FITID'),
    })
  }
  return transactions
}
