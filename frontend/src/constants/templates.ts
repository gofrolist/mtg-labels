import type { LabelTemplate } from '../types'

export const LABEL_TEMPLATES: Record<string, LabelTemplate> = {
  avery5160: {
    id: 'avery5160',
    name: 'Avery 5160/8460',
    dimensions: '1" x 2-5/8"',
    labels_per_page: 30,
    labels_per_row: 3,
    label_rows: 10,
  },
  averyl7160: {
    id: 'averyl7160',
    name: 'Avery L7160',
    dimensions: '63.5 x 38.1mm',
    labels_per_page: 21,
    labels_per_row: 3,
    label_rows: 7,
  },
  'avery64x30-r': {
    id: 'avery64x30-r',
    name: 'Avery 64x30-R',
    dimensions: '64 x 30mm',
    labels_per_page: 27,
    labels_per_row: 3,
    label_rows: 9,
  },
  averyj8158: {
    id: 'averyj8158',
    name: 'Avery J8158',
    dimensions: '64 x 26.7mm',
    labels_per_page: 30,
    labels_per_row: 3,
    label_rows: 10,
  },
  averyl7157: {
    id: 'averyl7157',
    name: 'Avery L7157',
    dimensions: '64 x 24.3mm',
    labels_per_page: 33,
    labels_per_row: 3,
    label_rows: 11,
  },
  avery94208: {
    id: 'avery94208',
    name: 'Avery 94208',
    dimensions: '2/3" x 1-3/4"',
    labels_per_page: 60,
    labels_per_row: 4,
    label_rows: 15,
  },
}

export const DEFAULT_TEMPLATE_ID = 'avery5160'

export function getTemplate(id: string): LabelTemplate | undefined {
  return LABEL_TEMPLATES[id]
}

export function getDefaultTemplate(): LabelTemplate {
  return LABEL_TEMPLATES[DEFAULT_TEMPLATE_ID]
}
