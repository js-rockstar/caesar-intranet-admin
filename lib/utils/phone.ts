export function formatCanadianPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")

  // Format as XXX-XXX-XXXX
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Format as +1-XXX-XXX-XXXX for 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  return phone // Return original if doesn't match expected patterns
}

export function formatPhoneNumber(phone: string): string {
  if (!phone || phone.trim() === "") {
    return phone
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")

  // Handle different phone number lengths
  if (digits.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    // Format as +1 (XXX) XXX-XXXX
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 7) {
    // Format as XXX-XXXX (local number)
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }

  // If it's already in a common format, try to standardize it
  const commonFormats = [
    /^\(\d{3}\)\s?\d{3}-\d{4}$/, // (XXX) XXX-XXXX
    /^\d{3}-\d{3}-\d{4}$/, // XXX-XXX-XXXX
    /^\d{3}\.\d{3}\.\d{4}$/, // XXX.XXX.XXXX
    /^\d{3}\s\d{3}\s\d{4}$/, // XXX XXX XXXX
    /^\+1\s?\(\d{3}\)\s?\d{3}-\d{4}$/, // +1 (XXX) XXX-XXXX
    /^\+1\s?\d{3}-\d{3}-\d{4}$/, // +1 XXX-XXX-XXXX
  ]

  for (const format of commonFormats) {
    if (format.test(phone.trim())) {
      // Extract digits and reformat to standard (XXX) XXX-XXXX
      const cleanDigits = phone.replace(/\D/g, "")
      if (cleanDigits.length === 10) {
        return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`
      }
      if (cleanDigits.length === 11 && cleanDigits.startsWith("1")) {
        return `+1 (${cleanDigits.slice(1, 4)}) ${cleanDigits.slice(4, 7)}-${cleanDigits.slice(7)}`
      }
    }
  }

  // Return original if we can't format it
  return phone
}

export function validateCanadianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || phone.trim() === "") {
    return false
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")
  
  // Check for obviously invalid numbers
  if (digits.length < 7) {
    return false // Too short to be a valid phone number
  }
  
  // Check for numbers that are all the same digit (like "0000000000" or "1111111111")
  if (/^(\d)\1+$/.test(digits)) {
    return false
  }
  
  // Check for numbers that are all zeros
  if (digits === "0" || digits === "00" || digits === "000" || digits === "0000" || 
      digits === "00000" || digits === "000000" || digits === "0000000" || 
      digits === "00000000" || digits === "000000000" || digits === "0000000000" ||
      digits === "00000000000") {
    return false
  }
  
  // Check for numbers that start with 0 (except for some international formats)
  if (digits.startsWith("0") && digits.length > 1) {
    // Allow if it's a valid international format (like +1-0xx-xxx-xxxx)
    if (digits.length === 11 && digits.startsWith("01")) {
      return true
    }
    return false
  }
  
  // Standard validation for 7, 10, or 11 digit numbers
  return digits.length === 7 || digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
}
