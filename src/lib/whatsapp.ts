/**
 * Build a WhatsApp deep-link URL
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  // Strip non-numeric chars except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function buildLeaveMessage(params: {
  employeeName: string
  employeeId?: string
  leaveDate: string
  leaveDays: number
  reason: string
}): string {
  const { employeeName, employeeId, leaveDate, leaveDays, reason } = params
  const idLine = employeeId ? `Employee ID: ${employeeId}\n` : ''
  return (
    `Leave Request\n\n` +
    `Employee Name: ${employeeName}\n` +
    idLine +
    `Date: ${leaveDate}\n` +
    `Days: ${leaveDays}\n` +
    `Reason: ${reason}\n\n` +
    `I kindly request approval for my leave.\n` +
    `Thank you.`
  )
}
