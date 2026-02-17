import type { CustomTemplateDimensions } from '../../types'
import { toPoints } from '../../utils/unitConversion'

interface PagePreviewProps {
  template: CustomTemplateDimensions
  fullscreen?: boolean
}

export function PagePreview({ template, fullscreen }: PagePreviewProps) {
  const u = template.unit
  const pageW = toPoints(template.pageWidth, u)
  const pageH = toPoints(template.pageHeight, u)
  const leftMargin = toPoints(template.marginLeft, u)
  const topMargin = toPoints(template.marginTop, u)
  const labelW = toPoints(template.labelWidth, u)
  const labelH = toPoints(template.labelHeight, u)
  const hGap = toPoints(template.horizontalGap, u)
  const vGap = toPoints(template.verticalGap, u)

  // Scale to fit container
  const maxWidth = fullscreen ? 500 : 200
  const maxHeight = fullscreen ? 700 : 280
  const scale = Math.min(maxWidth / pageW, maxHeight / pageH)

  const scaledW = pageW * scale
  const scaledH = pageH * scale

  const gridW = template.columns * labelW + (template.columns - 1) * hGap
  const gridH = template.rows * labelH + (template.rows - 1) * vGap

  return (
    <div
      className="relative bg-white border border-gray-300 dark:border-gray-600 mx-auto"
      style={{ width: scaledW, height: scaledH }}
    >
      {/* Grid area */}
      <div
        className="absolute"
        style={{
          left: leftMargin * scale,
          top: topMargin * scale,
          width: gridW * scale,
          height: gridH * scale,
        }}
      >
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${template.columns}, ${labelW * scale}px)`,
            gridTemplateRows: `repeat(${template.rows}, ${labelH * scale}px)`,
            columnGap: hGap * scale,
            rowGap: vGap * scale,
          }}
        >
          {Array.from({ length: template.columns * template.rows }).map((_, i) => (
            <div
              key={i}
              className="border border-blue-300 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
