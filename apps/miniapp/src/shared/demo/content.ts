import type { Banner, CategoryId, L10n } from '../types'

/** Marketing copy for the demo home screen (shared by all variants; each variant styles it). */
export const BANNERS: Array<Omit<Banner, 'image'> & { imageFrom: { categoryId: CategoryId; rank?: number } }> = [
  {
    id: 'poizon-originals',
    title: { ru: 'Оригиналы с проверкой POIZON', uz: 'POIZON tekshiruvidan oʻtgan originallar' },
    subtitle: { ru: 'Кроссовки и бренды из Китая — до 40% дешевле', uz: 'Xitoydan krossovka va brendlar — 40% gacha arzon' },
    cta: { ru: 'Смотреть', uz: 'Koʻrish' },
    tone: 'dark',
    link: { kind: 'category', categoryId: 'shoes' },
    imageFrom: { categoryId: 'shoes' },
  },
  {
    id: 'electronics-week',
    title: { ru: 'Неделя электроники', uz: 'Elektronika haftaligi' },
    subtitle: { ru: 'Смартфоны и гаджеты напрямую с Alibaba', uz: 'Smartfon va gadjetlar toʻgʻridan-toʻgʻri Alibabadan' },
    cta: { ru: 'К скидкам', uz: 'Chegirmalarga' },
    tone: 'cool',
    link: { kind: 'category', categoryId: 'electronics' },
    imageFrom: { categoryId: 'electronics' },
  },
  {
    id: 'home-1688',
    title: { ru: 'Дом и кухня по ценам фабрик', uz: 'Uy va oshxona — fabrika narxlarida' },
    subtitle: { ru: 'Тысячи товаров 1688 с доставкой в Ташкент', uz: '1688 dagi minglab mahsulotlar Toshkentga yetkazib beriladi' },
    cta: { ru: 'Выбрать', uz: 'Tanlash' },
    tone: 'warm',
    link: { kind: 'category', categoryId: 'home' },
    imageFrom: { categoryId: 'home' },
  },
  {
    id: 'beauty',
    title: { ru: 'Красота из Китая', uz: 'Xitoydan goʻzallik' },
    subtitle: { ru: 'Уход и ароматы: оригиналы и новинки', uz: 'Parvarish va atirlar: originallar va yangiliklar' },
    cta: { ru: 'Открыть', uz: 'Ochish' },
    tone: 'primary',
    link: { kind: 'category', categoryId: 'beauty' },
    imageFrom: { categoryId: 'beauty' },
  },
]

export const TRENDING: L10n[] = [
  { ru: 'кроссовки', uz: 'krossovka' },
  { ru: 'наушники', uz: 'quloqchin' },
  { ru: 'iPhone', uz: 'iPhone' },
  { ru: 'часы', uz: 'soat' },
  { ru: 'сумка', uz: 'sumka' },
  { ru: 'парфюм', uz: 'atir' },
  { ru: 'платье', uz: 'koʻylak' },
  { ru: 'посуда', uz: 'idish' },
]

/** Synonym groups for the demo search (ru / uz / en / brand words). */
export const SYNONYMS: string[][] = [
  ['кроссовк', 'кед', 'krossovk', 'sneaker', 'обув', 'poyabzal', 'shoe'],
  ['наушник', 'quloqchin', 'airpods', 'headphone', 'earbud', 'гарнитур'],
  ['телефон', 'смартфон', 'smartfon', 'phone', 'iphone', 'galaxy', 'redmi', 'oppo', 'vivo', 'realme'],
  ['часы', 'soat', 'watch'],
  ['сумк', 'sumka', 'bag', 'рюкзак', 'ryukzak', 'backpack'],
  ['ноутбук', 'noutbuk', 'laptop', 'macbook'],
  ['планшет', 'planshet', 'tablet', 'ipad'],
  ['плать', 'koʻylak', 'koylak', 'dress'],
  ['рубаш', 'shirt', 'футболк', 'futbolka', 'топ'],
  ['духи', 'парфюм', 'аромат', 'atir', 'perfume', 'fragrance', 'туалетн'],
  ['очки', 'koʻzoynak', 'kozoynak', 'sunglass'],
  ['чехол', 'gʻilof', 'gilof', 'case'],
  ['зарядк', 'zaryad', 'charger', 'кабел', 'kabel', 'power'],
  ['посуд', 'idish', 'кастрюл', 'сковород', 'tova', 'кухн', 'oshxona', 'kitchen'],
  ['крем', 'krem', 'уход', 'skin', 'сыворот', 'serum', 'косметик', 'kosmetika'],
  ['мебел', 'mebel', 'кресл', 'kreslo', 'стул', 'диван', 'стол', 'furniture'],
  ['спорт', 'sport', 'фитнес', 'fitnes', 'мяч', 'koptok', 'ball'],
  ['украшен', 'jewel', 'серьг', 'кольц', 'zargarlik', 'taqinchoq'],
]
