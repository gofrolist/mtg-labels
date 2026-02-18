import type { CustomTemplateDimensions } from '../../types'
import { toPoints } from '../../utils/unitConversion'

interface PagePreviewProps {
  template: CustomTemplateDimensions
  fullscreen?: boolean
  /** When provided, scale preview to fit this container (width, height in px). */
  containerSize?: { width: number; height: number }
}

export function PagePreview({ template, fullscreen, containerSize }: PagePreviewProps) {
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
  const maxWidth = fullscreen ? 500 : containerSize ? containerSize.width : 280
  const maxHeight = fullscreen ? 700 : containerSize ? containerSize.height : 400
  const scale = Math.min(maxWidth / pageW, maxHeight / pageH, fullscreen ? 2 : Infinity)

  const scaledW = pageW * scale
  const scaledH = pageH * scale

  const gridW = template.columns * labelW + (template.columns - 1) * hGap
  const gridH = template.rows * labelH + (template.rows - 1) * vGap

  const scaledLabelW = labelW * scale
  const scaledLabelH = labelH * scale
  const fontSize = Math.min(scaledLabelW, scaledLabelH) * 0.35
  const showNumbers = fontSize >= 5

  return (
    <div
      className="relative bg-white shadow-lg mx-auto"
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
            gridTemplateColumns: `repeat(${template.columns}, ${scaledLabelW}px)`,
            gridTemplateRows: `repeat(${template.rows}, ${scaledLabelH}px)`,
            columnGap: hGap * scale,
            rowGap: vGap * scale,
          }}
        >
          {Array.from({ length: template.columns * template.rows }).map((_, i) => (
            <div
              key={i}
              className="border border-dashed border-gray-300 bg-[#d4af37]/10 flex items-center justify-center overflow-hidden"
            >
              {showNumbers && (
                <span
                  className="text-gray-500 select-none"
                  style={{ fontSize: Math.max(fontSize, 6) }}
                >
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
