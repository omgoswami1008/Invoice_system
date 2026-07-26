const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertGroup(n: number): string {
  let result = "";

  if (n >= 100) {
    result += ones[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }

  if (n >= 20) {
    result += tens[Math.floor(n / 10)] + " ";
    n %= 10;
  }

  if (n > 0) {
    result += ones[n] + " ";
  }

  return result.trim();
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const isNegative = num < 0;
  num = Math.abs(Math.round(num * 100));

  const paise = num % 100;
  num = Math.floor(num / 100);

  if (num === 0 && paise === 0) return "Zero";

  let result = "";

  if (num >= 10000000) {
    result += convertGroup(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }

  if (num >= 100000) {
    result += convertGroup(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }

  if (num >= 1000) {
    result += convertGroup(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }

  if (num > 0) {
    result += convertGroup(num);
  }

  result = result.trim();

  if (paise > 0) {
    result += " and " + convertGroup(paise) + " Paise";
  }

  result += " Only";

  if (isNegative) {
    result = "Minus " + result;
  }

  return result;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}
