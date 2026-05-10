import type { LabelLayout, LabelElementPosition } from '../../types'

interface LabelPreviewProps {
  layout: LabelLayout
}

// Sample set icon SVG for preview
const SampleSetIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-mtg-text"
  >
    <path
      d="M16 2L4 8v8c0 8 5.33 14.93 12 17 6.67-2.07 12-9 12-17V8L16 2z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M16 6l-8 4v5.33c0 5.33 3.56 9.95 8 11.33 4.44-1.38 8-6 8-11.33V10l-8-4z"
      fill="currentColor"
      opacity="0.2"
    />
  </svg>
)

// Get CSS positioning classes for a position preset
function getPositionStyles(position: LabelElementPosition): React.CSSProperties {
  const styles: React.CSSProperties = {
    position: 'absolute',
  }

  // Vertical positioning
  if (position.startsWith('top-')) {
    styles.top = 0
  } else if (position.startsWith('middle-')) {
    styles.top = '50%'
    styles.transform = 'translateY(-50%)'
  } else {
    styles.bottom = 0
  }

  // Horizontal positioning
  if (position.endsWith('-left')) {
    styles.left = 0
  } else if (position.endsWith('-center')) {
    styles.left = '50%'
    if (styles.transform) {
      styles.transform = 'translate(-50%, -50%)'
    } else {
      styles.transform = 'translateX(-50%)'
    }
  } else {
    styles.right = 0
  }

  return styles
}

// Get text alignment based on horizontal position
function getTextAlign(position: LabelElementPosition): 'left' | 'center' | 'right' {
  if (position.endsWith('-left')) return 'left'
  if (position.endsWith('-center')) return 'center'
  return 'right'
}

// Map font family to CSS
function getFontFamily(fontFamily: string): string {
  const fontMap: Record<string, string> = {
    'Helvetica': 'Arial, Helvetica, sans-serif',
    'Helvetica-Bold': 'Arial, Helvetica, sans-serif',
    'Times-Roman': 'Times New Roman, Times, serif',
    'Times-Bold': 'Times New Roman, Times, serif',
    'Courier': 'Courier New, Courier, monospace',
    'Courier-Bold': 'Courier New, Courier, monospace',
  }
  return fontMap[fontFamily] || 'Arial, sans-serif'
}

function isBoldFont(fontFamily: string): boolean {
  return fontFamily.includes('Bold')
}

export function LabelPreview({ layout }: LabelPreviewProps) {
  // Preview dimensions (aspect ratio approximately 2.625:1 like a typical label)
  const previewWidth = 200
  const previewHeight = 76
  const paddingScale = layout.padding * 0.5 // Scale padding for preview

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label preview */}
      <div
        className="relative bg-white border border-gray-300 rounded overflow-hidden"
        style={{
          width: previewWidth,
          height: previewHeight,
          padding: paddingScale,
        }}
      >
        <div className="relative w-full h-full">
          {/* Set Icon */}
          {layout.setIcon.visible && (
            <div style={getPositionStyles(layout.setIcon.position)}>
              <SampleSetIcon size={Math.round((layout.setIcon.size / 100) * (previewHeight - paddingScale * 2))} />
            </div>
          )}

          {/* Set Name */}
          {layout.setName.visible && (
            <div
              style={{
                ...getPositionStyles(layout.setName.position),
                fontFamily: getFontFamily(layout.setName.fontFamily),
                fontSize: Math.max(6, Math.round(layout.setName.fontSize * 0.8)),
                fontWeight: isBoldFont(layout.setName.fontFamily) ? 'bold' : 'normal',
                textAlign: getTextAlign(layout.setName.position),
                color: '#1a1a1a',
                maxWidth: '60%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Dominaria
            </div>
          )}

          {/* Set Code */}
          {layout.setCode.visible && (
            <div
              style={{
                ...getPositionStyles(layout.setCode.position),
                fontFamily: getFontFamily(layout.setCode.fontFamily),
                fontSize: Math.max(5, Math.round(layout.setCode.fontSize * 0.8)),
                fontWeight: isBoldFont(layout.setCode.fontFamily) ? 'bold' : 'normal',
                textAlign: getTextAlign(layout.setCode.position),
                color: '#4a4a4a',
              }}
            >
              DOM
            </div>
          )}

          {/* Release Date */}
          {layout.releaseDate.visible && (
            <div
              style={{
                ...getPositionStyles(layout.releaseDate.position),
                fontFamily: getFontFamily(layout.releaseDate.fontFamily),
                fontSize: Math.max(5, Math.round(layout.releaseDate.fontSize * 0.8)),
                fontWeight: isBoldFont(layout.releaseDate.fontFamily) ? 'bold' : 'normal',
                textAlign: getTextAlign(layout.releaseDate.position),
                color: '#6a6a6a',
              }}
            >
              2018-04-27
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mtg-text-muted justify-center">
        {layout.setIcon.visible && <span>Icon: {layout.setIcon.position}</span>}
        {layout.setName.visible && <span>Name: {layout.setName.position}</span>}
        {layout.setCode.visible && <span>Code: {layout.setCode.position}</span>}
        {layout.releaseDate.visible && <span>Date: {layout.releaseDate.position}</span>}
      </div>
    </div>
  )
}
