"""Regression tests for SVG set-symbol scaling in PDFGenerator.

These exercise the *real* svg2rlg render path (not mocked), guarding against the
svglib 2.0 change where a drawing's coordinate space no longer equals the file
viewBox. The symbol scale must be derived from the rendered drawing's own size,
otherwise symbols print at the wrong physical size (~25% too small on svglib 2).
"""

import pytest
from svglib.svglib import svg2rlg

from src.services.helpers import get_svg_intrinsic_dimensions
from src.services.pdf_generator import PDFGenerator

# A viewBox (200) deliberately different from the width/height attrs (100). svglib
# renders content in the width/height coordinate space, not the viewBox — exactly
# the decoupling svglib 2.0 introduced for all SVGs (px -> pt). The old code scaled
# by the viewBox, mis-sizing the symbol.
_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" '
    'width="100" height="100"><rect x="20" y="20" width="160" height="160" '
    'fill="black"/></svg>'
)


def _write_svg(tmp_path) -> str:
    path = tmp_path / "symbol.svg"
    path.write_text(_SVG)
    return str(path)


def _capture_symbol_scale(generator, monkeypatch, svg_path, target_height) -> float:
    """Draw the symbol with the real render path, returning the scale factor the
    generator applied to the canvas (its first canvas.scale call)."""
    scale_calls: list[float] = []
    real_scale = generator.canvas.scale

    def spy_scale(sx, sy):
        scale_calls.append(sx)
        return real_scale(sx, sy)

    monkeypatch.setattr(generator.canvas, "scale", spy_scale)
    generator._draw_svg_symbol(svg_path, 0.0, 0.0, target_height, "TestSet")
    assert scale_calls, "expected the symbol to be scaled onto the canvas"
    return scale_calls[0]


def test_svg_symbol_scale_uses_drawing_coordinate_space(tmp_path, monkeypatch, sample_set_data):
    """Scale must come from the svg2rlg drawing's own size, not the file viewBox."""
    svg_path = _write_svg(tmp_path)
    generator = PDFGenerator(sample_set_data)
    target_height = 30.0

    applied = _capture_symbol_scale(generator, monkeypatch, svg_path, target_height)

    drawing = svg2rlg(svg_path)
    assert drawing is not None
    expected = min(
        target_height / drawing.height,
        generator.effective_symbol_width / drawing.width,
    )
    assert applied == pytest.approx(expected, rel=1e-3)

    # Regression guard: must NOT be the viewBox-based scale (the old, broken path).
    viewbox = get_svg_intrinsic_dimensions(svg_path)
    assert viewbox is not None
    vb_w, vb_h = viewbox
    viewbox_scale = min(target_height / vb_h, generator.effective_symbol_width / vb_w)
    assert applied != pytest.approx(viewbox_scale, rel=1e-3)


def test_svg_symbol_physical_size_is_svglib_version_invariant(
    tmp_path, monkeypatch, sample_set_data
):
    """The rendered symbol's physical size must not depend on svglib's coordinate
    scaling: content_bbox_span * applied_scale stays constant regardless of whether
    the drawing reports 100-unit (svglib 1.x) or 75-unit (svglib 2.x) coordinates."""
    svg_path = _write_svg(tmp_path)
    generator = PDFGenerator(sample_set_data)
    target_height = 30.0

    applied = _capture_symbol_scale(generator, monkeypatch, svg_path, target_height)

    drawing = svg2rlg(svg_path)
    assert drawing is not None
    bounds = drawing.getBounds()
    content_h = bounds[3] - bounds[1]
    # The black rect covers 80% of the canvas in both svglib 1.x and 2.x, so the
    # printed height must be 0.8 * target_height (height-limited here).
    printed_height = content_h * applied
    assert printed_height == pytest.approx(0.8 * target_height, rel=1e-2)
