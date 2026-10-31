import type { Address, DemoUser, L10n } from '../types'

export const DEMO_USER: DemoUser = {
  id: 5550001,
  firstName: 'Aziz',
  lastName: 'Karimov',
  username: 'aziz_demo',
  phone: '+998901234567',
  photoUrl: null,
  memberSince: '2025-03-12',
}

export const REGIONS: L10n[] = [
  { ru: 'Ташкент', uz: 'Toshkent shahri' },
  { ru: 'Ташкентская область', uz: 'Toshkent viloyati' },
  { ru: 'Самаркандская область', uz: 'Samarqand viloyati' },
  { ru: 'Бухарская область', uz: 'Buxoro viloyati' },
  { ru: 'Андижанская область', uz: 'Andijon viloyati' },
  { ru: 'Ферганская область', uz: 'Fargʻona viloyati' },
  { ru: 'Наманганская область', uz: 'Namangan viloyati' },
  { ru: 'Навоийская область', uz: 'Navoiy viloyati' },
  { ru: 'Кашкадарьинская область', uz: 'Qashqadaryo viloyati' },
  { ru: 'Сурхандарьинская область', uz: 'Surxondaryo viloyati' },
  { ru: 'Хорезмская область', uz: 'Xorazm viloyati' },
  { ru: 'Джизакская область', uz: 'Jizzax viloyati' },
  { ru: 'Сырдарьинская область', uz: 'Sirdaryo viloyati' },
  { ru: 'Республика Каракалпакстан', uz: 'Qoraqalpogʻiston Respublikasi' },
]

export const SEED_ADDRESSES: Address[] = [
  {
    id: 'addr-home',
    label: { ru: 'Дом', uz: 'Uy' },
    region: REGIONS[0],
    city: 'Юнусабадский район',
    street: 'ул. Ахмада Дониша, 12',
    apartment: 'кв. 45, подъезд 2',
    recipient: 'Aziz Karimov',
    phone: '+998901234567',
    isDefault: true,
  },
  {
    id: 'addr-work',
    label: { ru: 'Работа', uz: 'Ish' },
    region: REGIONS[0],
    city: 'Мирабадский район',
    street: 'ул. Нукус, 7',
    apartment: 'офис 304',
    recipient: 'Aziz Karimov',
    phone: '+998901234567',
    isDefault: false,
  },
  {
    id: 'addr-parents',
    label: { ru: 'Родители', uz: 'Ota-onam' },
    region: REGIONS[2],
    city: 'Самарканд',
    street: 'ул. Регистан, 23',
    recipient: 'Karima Karimova',
    phone: '+998915550123',
    isDefault: false,
  },
]

/** "+998 90 123 45 67" */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '')
  if (d.length !== 12) return p
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`
}

export const isValidUzPhone = (p: string) => /^\+?998\d{9}$/.test(p.replace(/[\s()-]/g, ''))
