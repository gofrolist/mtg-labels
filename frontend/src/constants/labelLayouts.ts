import type { LabelLayout } from '../types/labelLayout'

/**
 * Default label layouts that ship with the application.
 * Users can use these as-is or as a starting point for custom layouts.
 */

export const DEFAULT_LABEL_LAYOUTS: Record<string, LabelLayout> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    isDefault: true,
    setIcon: {
      visible: true,
      position: 'middle-left',
      size: 70, // 70% of label height
    },
    setName: {
      visible: true,
      position: 'top-right',
      fontFamily: 'EBGaramondBold',
      fontSize: 8,
    },
    setCode: {
      visible: true,
      position: 'middle-right',
      fontFamily: 'SourceSansProRegular',
      fontSize: 7,
    },
    releaseDate: {
      visible: false,
      position: 'bottom-right',
      fontFamily: 'SourceSansProRegular',
      fontSize: 6,
    },
    padding: 4,
  },

  iconOnly: {
    id: 'iconOnly',
    name: 'Icon Only',
    isDefault: true,
    setIcon: {
      visible: true,
      position: 'middle-center',
      size: 90, // Large centered icon
    },
    setName: {
      visible: false,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 6,
    },
    setCode: {
      visible: false,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 6,
    },
    releaseDate: {
      visible: false,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 6,
    },
    padding: 2,
  },

  textOnly: {
    id: 'textOnly',
    name: 'Text Only',
    isDefault: true,
    setIcon: {
      visible: false,
      position: 'middle-left',
      size: 50,
    },
    setName: {
      visible: true,
      position: 'middle-center',
      fontFamily: 'Helvetica-Bold',
      fontSize: 9,
    },
    setCode: {
      visible: true,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 7,
    },
    releaseDate: {
      visible: false,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 6,
    },
    padding: 4,
  },

  iconTop: {
    id: 'iconTop',
    name: 'Icon Top',
    isDefault: true,
    setIcon: {
      visible: true,
      position: 'top-center',
      size: 50,
    },
    setName: {
      visible: true,
      position: 'bottom-center',
      fontFamily: 'Helvetica-Bold',
      fontSize: 7,
    },
    setCode: {
      visible: true,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 6,
    },
    releaseDate: {
      visible: false,
      position: 'bottom-center',
      fontFamily: 'Helvetica',
      fontSize: 5,
    },
    padding: 3,
  },

  compact: {
    id: 'compact',
    name: 'Compact',
    isDefault: true,
    setIcon: {
      visible: true,
      position: 'middle-left',
      size: 50, // Smaller icon
    },
    setName: {
      visible: false,
      position: 'middle-right',
      fontFamily: 'Helvetica',
      fontSize: 6,
    },
    setCode: {
      visible: true,
      position: 'middle-right',
      fontFamily: 'Helvetica-Bold',
      fontSize: 8,
    },
    releaseDate: {
      visible: false,
      position: 'bottom-right',
      fontFamily: 'Helvetica',
      fontSize: 5,
    },
    padding: 2,
  },
}

export const DEFAULT_LAYOUT_ID = 'standard'

export function getDefaultLayout(): LabelLayout {
  return DEFAULT_LABEL_LAYOUTS[DEFAULT_LAYOUT_ID]
}

export function getLayout(id: string): LabelLayout | undefined {
  return DEFAULT_LABEL_LAYOUTS[id]
}

export function getAllDefaultLayouts(): LabelLayout[] {
  return Object.values(DEFAULT_LABEL_LAYOUTS)
}
