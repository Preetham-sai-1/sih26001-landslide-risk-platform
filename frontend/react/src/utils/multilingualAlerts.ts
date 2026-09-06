import { RiskZone, RiskLevel } from '../types';

export type AlertLanguage = 'en' | 'hi' | 'as' | 'bn' | 'lus' | 'kha' | 'ne';

export interface LanguageOption {
  code: AlertLanguage;
  name: string;
  nativeName: string;
  regionNote: string;
}

export const ALERT_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', regionNote: 'Official / National' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', regionNote: 'National Language' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', regionNote: 'Assam State' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', regionNote: 'Tripura & Barak Valley' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', regionNote: 'Mizoram State' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', regionNote: 'Meghalaya State' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', regionNote: 'Sikkim & Hill Sectors' },
];

export function generateLocalizedAlertMessage(
  zone: RiskZone,
  severity: RiskLevel,
  lang: AlertLanguage,
  shelterName?: string
): string {
  const shelter = shelterName || `${zone.district} District Relief Shelter`;

  switch (lang) {
    case 'hi':
      if (severity === 'VERY HIGH') {
        return `[आपातकालीन भूस्खलन चेतावनी] ${zone.district} (${zone.state}) के ${zone.name} क्षेत्र में भारी बारिश के कारण भूस्खलन का अत्यधिक खतरा है। कृपया तुरंत ढलानों से दूर हटें और निकटतम सुरक्षित आश्रय (${shelter}) में शरण लें। आपातकालीन सहायता: 1077 / 112.`;
      } else if (severity === 'HIGH') {
        return `[भूस्खलन चेतावनी] ${zone.district} में भारी वर्षा के कारण उच्च भूस्खलन जोखिम। पहाड़ी सड़कों पर गैर-जरूरी यात्रा से बचें और सुरक्षित स्थानों पर रहें।`;
      }
      return `[मौसम सूचना] ${zone.district} में भूस्खलन जोखिम सामान्य से अधिक है। सतर्क रहें।`;

    case 'as':
      if (severity === 'VERY HIGH') {
        return `[জৰুৰীকালীন ভূমিস্খলন সতৰ্কবাৰ্তা] ${zone.district} জিলাৰ ${zone.name} অঞ্চলত প্ৰৱল বৃষ্টিপাতৰ বাবে অতি উচ্চ ভূমিস্খলনৰ সম্ভাৱনা আছে। পাহাৰীয়া ঢালৰ পৰা আঁতৰি নিৰাপদ আশ্ৰয়স্থল (${shelter}) লৈ যাওক। হেল্পলাইন: 1077 / 112।`;
      } else if (severity === 'HIGH') {
        return `[ভূমিস্খলন সতৰ্কতা] ${zone.district} ত ধাৰাষাৰ বৰষুণৰ ফলত উচ্চ ভূমিস্খলনৰ আশংকা। পাহাৰীয়া পথত সতৰ্ক থাকক।`;
      }
      return `[বতৰ সতৰ্কবাৰ্তা] ${zone.district} ত ভূমিস্খলন নিৰীক্ষণ সক্ৰিয় হৈ আছে। সাৱধান হওক।`;

    case 'bn':
      if (severity === 'VERY HIGH') {
        return `[জরুরী ভূমিধস সতর্কতা] ${zone.district} জেলার ${zone.name} এলাকায় ভারী বৃষ্টির কারণে মারাত্মক ভূমিধসের আশঙ্কা রয়েছে। অনতিবিলম্বে ঝুঁকিপূর্ণ এলাকা ত্যাগ করে নিকটস্থ আশ্রয়কেন্দ্রে (${shelter}) যান। হেল্পলাইন: 1077 / 112।`;
      } else if (severity === 'HIGH') {
        return `[ভূমিধস সতর্কতা] ${zone.district} এলাকায় ভারী বর্ষণে উচ্চ ভূমিধস ঝুঁকি। পাহাড়ি রাস্তায় সাবধানে চলুন।`;
      }
      return `[সতর্কবার্তা] ${zone.district} এলাকায় ভূমিধস ঝুঁকি পর্যবেক্ষণ করা হচ্ছে।`;

    case 'lus':
      if (severity === 'VERY HIGH') {
        return `[TIHBAINA RANGVAWL] ${zone.district} huamchhung ${zone.name} ah ruahsur nasa avangin leimin hlauhawm zual a awm. Khawngaihin tlangkam hmun atangin insaseng ula, shelter (${shelter}) ah inthiarfihlim vat rawh u. Helpline: 1077 / 112.`;
      } else if (severity === 'HIGH') {
        return `[LEIMIN HLAUHAWM] ${zone.district} ah ruah a sur nasat avangin kawngpui leh tlangkam ah leimin a awm thei. Fimkhur rawh u.`;
      }
      return `[THUPEH] ${zone.district} ah leimin dinhmun vil mek a ni.`;

    case 'kha':
      if (severity === 'VERY HIGH') {
        return `[KHLUB JINGSYNDONG] Ha ${zone.district}, ${zone.name} don ka jingma kaba jur na ka daw jong u slap uba jur. Sngewbha phet noh na ki jaka ba thung lum sha ki jaka rieh (${shelter}). Helpline: 1077 / 112.`;
      } else if (severity === 'HIGH') {
        return `[JINGSYNDONG] Ka jingma na ka jingtwap khyndew ha ${zone.district}. Ki surok lum ki lah ban kylla ba ma.`;
      }
      return `[DAWK JINGMA] Ka jingma ha ${zone.district} lah shah pynkhreh.`;

    case 'ne':
      if (severity === 'VERY HIGH') {
        return `[आपतकालीन पहिरो चेतावनी] ${zone.district} को ${zone.name} क्षेत्रमा भारी वर्षाका कारण गम्भीर पहिरोको जोखिम छ। कृपया तुरुन्त सुरक्षित स्थान वा नजिकको आश्रयस्थल (${shelter}) तर्फ जानुहोस्। आपतकालीन सम्पर्क: 1077 / 112।`;
      } else if (severity === 'HIGH') {
        return `[पहिरो चेतावनी] ${zone.district} क्षेत्रमा लगातार वर्षाले पहिरोको उच्च जोखिम छ। राजमार्ग र भिरालो स्थानमा सावधानी अपनाउनुहोस्।`;
      }
      return `[सतर्कता सूचना] ${zone.district} मा पहिरो निगरानी सक्रिय छ।`;

    case 'en':
    default:
      if (severity === 'VERY HIGH') {
        return `EMERGENCY LANDSLIDE ALERT: Extremely High Risk in ${zone.district} (${zone.name} sector, ${zone.state}) due to intense rainfall. Evacuate unstable cut-slopes immediately to designated shelter (${shelter}). Emergency Helpline: 1077 / 112.`;
      } else if (severity === 'HIGH') {
        return `HIGH LANDSLIDE WARNING: High susceptibility in ${zone.district} (${zone.state}). Restrict non-essential highway travel and maintain vigilance along hill corridors.`;
      }
      return `LANDSLIDE ADVISORY: Elevated antecedent rainfall detected in ${zone.district}. Disaster cells actively monitoring slope stability.`;
  }
}
