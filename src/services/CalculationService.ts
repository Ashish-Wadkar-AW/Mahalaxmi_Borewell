export class CalculationService {
  /**
   * Safely calculates item line total using integer-based arithmetic
   */
  public static calculateLineTotal(quantity: number, rate: number): number {
    const qty = Math.max(0, isNaN(quantity) ? 0 : quantity);
    const rt = Math.max(0, isNaN(rate) ? 0 : rate);
    // Multiply with rounded 2 decimal precision
    return Math.round(qty * rt * 100) / 100;
  }

  /**
   * Splits monetary amount into integer Rupees and two-digit Paise
   */
  public static splitRupeesAndPaise(amount: number): { rupees: number; paise: number } {
    const totalPaise = Math.round((isNaN(amount) ? 0 : amount) * 100);
    const rupees = Math.floor(totalPaise / 100);
    const paise = totalPaise % 100;
    return { rupees, paise };
  }

  /**
   * Calculates grand total from quotation item list
   */
  public static calculateGrandTotal(
    items: Array<{ quantity: number; rate: number; total?: number }>,
  ): number {
    let sumPaise = 0;
    for (const item of items) {
      const lineTotal = CalculationService.calculateLineTotal(item.quantity, item.rate);
      sumPaise += Math.round(lineTotal * 100);
    }
    return sumPaise / 100;
  }

  /**
   * Formats a numeric amount in standard Indian numbering format (e.g. ₹ 1,25,450.00)
   */
  public static formatIndianCurrency(amount: number, includeSymbol = true): string {
    const val = isNaN(amount) ? 0 : amount;
    const isNegative = val < 0;
    const absoluteVal = Math.abs(val);

    const parts = absoluteVal.toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    // Indian comma separator rule: last 3 digits, then every 2 digits
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
      intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }

    const formatted = `${intPart}.${decPart}`;
    const sign = isNegative ? '-' : '';
    return includeSymbol ? `${sign}₹ ${formatted}` : `${sign}${formatted}`;
  }

  /**
   * Converts numbers to English words (Indian numbering system: Lakhs, Crores)
   */
  public static numberToWordsIndian(amount: number): string {
    if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

    const units = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const tens = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];

    const convertChunk = (n: number): string => {
      let str = '';
      if (n >= 100) {
        str += units[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += units[n] + ' ';
      }
      return str.trim();
    };

    const totalPaise = Math.round(Math.abs(amount) * 100);
    const rupees = Math.floor(totalPaise / 100);
    const paise = totalPaise % 100;

    let words = '';
    let rem = rupees;

    const crore = Math.floor(rem / 10000000);
    rem %= 10000000;
    if (crore > 0) words += `${convertChunk(crore)} Crore `;

    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    if (lakh > 0) words += `${convertChunk(lakh)} Lakh `;

    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    if (thousand > 0) words += `${convertChunk(thousand)} Thousand `;

    const hundred = Math.floor(rem / 100);
    rem %= 100;
    if (hundred > 0) words += `${convertChunk(hundred)} Hundred `;

    if (rem > 0) {
      if (words !== '') words += 'and ';
      words += `${convertChunk(rem)} `;
    }

    words = words.trim() + ' Rupees';

    if (paise > 0) {
      words += ` and ${convertChunk(paise)} Paise`;
    }

    return words.trim() + ' Only';
  }
}
