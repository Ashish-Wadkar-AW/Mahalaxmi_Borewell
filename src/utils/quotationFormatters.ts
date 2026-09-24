/**
 * Utilities for formatting Mahalaxmi Borewell quotation line items and Marathi currency text.
 */

export interface FormattedParticulars {
  title: string;
  specsSubtitle?: string;
  fullText: string;
}

export function formatParticularsText(
  srNo: number,
  specs: Record<string, any> = {},
  language: 'mr' | 'en' = 'mr',
): FormattedParticulars {
  const isMarathi = language === 'mr';

  switch (srNo) {
    case 1: {
      const title = isMarathi
        ? 'सबमर्सिबल पंपसेट सिकॉन, चॅम्पियन, जलसन'
        : 'Submersible Pumpset Secon, Champion, Jalsan';

      const parts: string[] = [];
      if (specs.make) parts.push(isMarathi ? `मेक: ${specs.make}` : `Make: ${specs.make}`);
      if (specs.inch) parts.push(isMarathi ? `इंची: ${specs.inch}` : `Inch: ${specs.inch}`);
      if (specs.hp) parts.push(isMarathi ? `हाँ.पाँ.: ${specs.hp}` : `H.P.: ${specs.hp}`);
      if (specs.stage) parts.push(isMarathi ? `स्टेज: ${specs.stage}` : `Stage: ${specs.stage}`);
      if (specs.phase) parts.push(isMarathi ? `फेज: ${specs.phase}` : `Phase: ${specs.phase}`);

      const specsSubtitle = parts.length > 0 ? parts.join(' | ') : undefined;
      const fullText = specsSubtitle ? `${title} (${specsSubtitle})` : title;
      return { title, specsSubtitle, fullText };
    }

    case 2: {
      const pType = specs.row2Type === 'monoblock'
        ? (isMarathi ? 'मोनोब्लॉक पंपसेट' : 'Monoblock Pumpset')
        : (isMarathi ? 'ओपनवेल पंपसेट' : 'Openwell Pumpset');

      const parts: string[] = [];
      if (specs.row2Make) parts.push(isMarathi ? `${specs.row2Make} मेक` : `${specs.row2Make} Make`);
      if (specs.row2Hp) parts.push(isMarathi ? `${specs.row2Hp} हाँ.पाँ.` : `${specs.row2Hp} H.P.`);
      if (specs.row2Phase) parts.push(isMarathi ? `${specs.row2Phase} फेज` : `${specs.row2Phase} Phase`);

      const prefix = parts.length > 0 ? parts.join(' ') + ' ' : '';
      const fullText = `${prefix}${pType}`.trim();
      return {
        title: fullText,
        fullText,
      };
    }

    case 3: {
      const parts: string[] = [];
      if (specs.cableSqMm) parts.push(isMarathi ? `${specs.cableSqMm} स्क्वे. एम.एम.` : `${specs.cableSqMm} Sq. mm.`);
      if (specs.cableIsiMark) parts.push(isMarathi ? 'ISI मार्क' : 'ISI Mark');
      if (specs.cableCore) parts.push(isMarathi ? `${specs.cableCore} कोर` : `${specs.cableCore} Core`);

      const specsStr = parts.length > 0 ? parts.join(' ') + ' ' : '';
      const fullText = isMarathi
        ? `${specsStr}सबमर्सिबल केबल`.trim()
        : `${specsStr}Submersible Cable`.trim();

      return {
        title: fullText,
        fullText,
      };
    }

    case 4: {
      const mmStr = specs.nylonWireRopeMm ? `${specs.nylonWireRopeMm} ` : '';
      const unit = isMarathi ? 'एम.एम. नायलॉन वायर रोप' : 'mm. Nylon Wire Rope';
      const fullText = `${mmStr}${unit}`.trim();
      return {
        title: fullText,
        fullText,
      };
    }

    case 5: {
      const inchStr = specs.deliveryPipeInch
        ? (isMarathi ? `${specs.deliveryPipeInch} इंची ` : `${specs.deliveryPipeInch} Inch `)
        : '';
      const mat = specs.deliveryPipeMaterial || 'H.D.P.E.';
      const fullText = isMarathi
        ? `${inchStr}डिलिव्हरी पाईप (${mat})`.trim()
        : `${inchStr}Delivery Pipe (${mat})`.trim();
      return {
        title: fullText,
        fullText,
      };
    }

    case 6: {
      const base = isMarathi
        ? 'कंट्रोल पॅनल स्टार्टर, मेनस्वीच, वोल्ट मीटर, अॅमीटर, ऑटो स्वीच'
        : 'Control Panel Starter, Main switch, Volt meter, Ammeter, Auto switch';
      const detail = specs.controlPanelDetails ? ` (${specs.controlPanelDetails})` : '';
      const fullText = `${base}${detail}`;
      return {
        title: base,
        specsSubtitle: specs.controlPanelDetails || undefined,
        fullText,
      };
    }

    case 7: {
      const base = isMarathi ? 'फिटींग सेट' : 'Fitting Set';
      const detail = specs.fittingSetDetails ? ` (${specs.fittingSetDetails})` : '';
      const fullText = `${base}${detail}`;
      return {
        title: base,
        specsSubtitle: specs.fittingSetDetails || undefined,
        fullText,
      };
    }

    case 8: {
      const base = isMarathi ? 'फिटींग चार्जेस व वाहतूक' : 'Fitting Charges & Transportation';
      const subParts: string[] = [];
      if (specs.fittingChargesDetails) subParts.push(specs.fittingChargesDetails);
      if (specs.transportationDetails) subParts.push(specs.transportationDetails);

      const detail = subParts.length > 0 ? ` (${subParts.join(', ')})` : '';
      const fullText = `${base}${detail}`;
      return {
        title: base,
        specsSubtitle: subParts.length > 0 ? subParts.join(', ') : undefined,
        fullText,
      };
    }

    case 9: {
      const base = isMarathi ? 'इतर खर्च' : 'Other Expenses';
      const detail = specs.otherExpensesDetails ? ` (${specs.otherExpensesDetails})` : '';
      const fullText = `${base}${detail}`;
      return {
        title: base,
        specsSubtitle: specs.otherExpensesDetails || undefined,
        fullText,
      };
    }

    default:
      return {
        title: isMarathi ? 'तपशील' : 'Particulars',
        fullText: isMarathi ? 'तपशील' : 'Particulars',
      };
  }
}

/**
 * Converts a number to standard Marathi currency words
 */
export function numberToWordsMarathi(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'शून्य रुपये फक्त';

  const ones: Record<number, string> = {
    0: '',
    1: 'एक',
    2: 'दोन',
    3: 'तीन',
    4: 'चार',
    5: 'पाच',
    6: 'सहा',
    7: 'सात',
    8: 'आठ',
    9: 'नऊ',
    10: 'दहा',
    11: 'अकरा',
    12: 'बारा',
    13: 'तेरा',
    14: 'चौदा',
    15: 'पंधरा',
    16: 'सोळा',
    17: 'सतरा',
    18: 'अठरा',
    19: 'एकोणीस',
    20: 'वीस',
    21: 'एकवीस',
    22: 'बावीस',
    23: 'तेवीस',
    24: 'चोवीस',
    25: 'पंचवीस',
    26: 'सव्वीस',
    27: 'सत्तावीस',
    28: 'अठ्ठावीस',
    29: 'एकोणतीस',
    30: 'तीस',
    31: 'एकतीस',
    32: 'बत्तीस',
    33: 'तेहेतीस',
    34: 'चौतीस',
    35: 'पस्तीस',
    36: 'छत्तीस',
    37: 'सदतीस',
    38: 'अडतीस',
    39: 'एकेचाळीस',
    40: 'चाळीस',
    41: 'एक्केचाळीस',
    42: 'बेचाळीस',
    43: 'त्रेचाळीस',
    44: 'चव्वेचाळीस',
    45: 'पंचेचाळीस',
    46: 'शेहेचाळीस',
    47: 'सत्तेचाळीस',
    48: 'अठ्ठेचाळीस',
    49: 'एकोणपन्नास',
    50: 'पन्नास',
    51: 'एक्कावन्न',
    52: 'बावन्न',
    53: 'त्रेपन्न',
    54: 'चौपन्न',
    55: 'पंचावन्न',
    56: 'छप्पन्न',
    57: 'सत्तावन्न',
    58: 'अठ्ठावन्न',
    59: 'एकोणसाठ',
    60: 'साठ',
    61: 'एकसष्ठ',
    62: 'पासष्ठ',
    63: 'त्रेसष्ठ',
    64: 'चौसष्ठ',
    65: 'पासष्ठ',
    66: 'सहासष्ठ',
    67: 'सदुसष्ठ',
    68: 'अडुसष्ठ',
    69: 'एकोणसत्तर',
    70: 'सत्तर',
    71: 'एकाहत्तर',
    72: 'बाहत्तर',
    73: 'त्र्याहत्तर',
    74: 'चौऱ्याहत्तर',
    75: 'पंच्याहत्तर',
    76: 'शहात्तर',
    77: 'सत्याहत्तर',
    78: 'अठ्ठ्याहत्तर',
    79: 'एकोणऐंशी',
    80: 'ऐंशी',
    81: 'एक्याऐंशी',
    82: 'ब्याऐंशी',
    83: 'त्र्याऐंशी',
    84: 'चौऱ्याऐंशी',
    85: 'पंच्याऐंशी',
    86: 'शहाऐंशी',
    87: 'सत्याऐंशी',
    88: 'अठ्ठ्याऐंशी',
    89: 'एकोणनव्वद',
    90: 'नव्वद',
    91: 'एक्क्याण्णव',
    92: 'ब्याण्णव',
    93: 'त्र्याण्णव',
    94: 'चौऱ्याण्णव',
    95: 'पंच्याण्णव',
    96: 'शहाण्णव',
    97: 'सत्त्याण्णव',
    98: 'अठ्ठ्याण्णव',
    99: 'नव्व्याण्णव',
    100: 'शंभर',
  };

  function convertTwoDigit(num: number): string {
    if (num <= 0) return '';
    return ones[num] || num.toString();
  }

  const abs = Math.abs(Math.round(amount * 100) / 100);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  let remaining = rupees;
  const parts: string[] = [];

  // Crores
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    parts.push(`${convertTwoDigit(crores)} कोटी`);
  }

  // Lakhs
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    remaining %= 100000;
    parts.push(`${convertTwoDigit(lakhs)} लाख`);
  }

  // Thousands
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    remaining %= 1000;
    parts.push(`${convertTwoDigit(thousands)} हजार`);
  }

  // Hundreds
  if (remaining >= 100) {
    const hundreds = Math.floor(remaining / 100);
    remaining %= 100;
    parts.push(`${convertTwoDigit(hundreds)} शे`);
  }

  // Remainder
  if (remaining > 0) {
    parts.push(convertTwoDigit(remaining));
  }

  let result = parts.join(' ').trim();
  if (!result) result = 'शून्य';

  let output = `${result} रुपये`;
  if (paise > 0) {
    output += ` आणि ${convertTwoDigit(paise)} पैसे`;
  }
  return `${output} फक्त`;
}
