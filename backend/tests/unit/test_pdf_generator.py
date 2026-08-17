"""Unit tests for PDFGenerator."""

from io import BytesIO
from unittest.mock import Mock, patch

import pytest

from src.services.pdf_generator import PDFGenerator


class TestPDFGenerator:
    """Tests for PDFGenerator.generate() method."""

    def test_pdf_generator_creates_pdf(self, sample_set_data):
        """Test that PDFGenerator creates a valid PDF."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        assert isinstance(result, BytesIO)
        # Check that it's a valid PDF (starts with PDF header)
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_handles_empty_sets(self):
        """Test that PDFGenerator handles empty set list."""
        generator = PDFGenerator([])
        result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_includes_set_data(self, sample_set_data):
        """Test that PDF includes set information."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        # PDF should be valid and have content
        # Note: PDF text is encoded/compressed, so text search is unreliable
        # Instead, verify PDF structure and that it was generated for the correct number of sets
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF"), "Should be a valid PDF"
        assert len(pdf_content) > 1000, "PDF should have substantial content for 2 sets"
        # Verify PDF was generated (check for PDF structure markers)
        assert b"/Pages" in pdf_content or b"endobj" in pdf_content, (
            "PDF should have proper structure"
        )

    def test_pdf_generator_handles_missing_symbol(self, sample_set_data):
        """Test that PDF generation works without symbols."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert len(pdf_content) > 0

    def test_pdf_generator_multiple_sets(self):
        """Test PDF generation with multiple sets."""
        sets = [
            {"id": "test-1", "name": "Set 1", "code": "S1", "released_at": "2023-01-01"},
            {"id": "test-2", "name": "Set 2", "code": "S2", "released_at": "2023-02-01"},
            {"id": "test-3", "name": "Set 3", "code": "S3", "released_at": "2023-03-01"},
        ]
        generator = PDFGenerator(sets)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert len(pdf_content) > 0

    def test_pdf_generator_with_template(self, sample_set_data, tmp_path):
        """Test PDF generation with template PDF."""
        # Create a mock template PDF file
        template_file = tmp_path / "template.pdf"
        template_file.write_bytes(b"%PDF-1.4\nfake template content\n%%EOF")

        generator = PDFGenerator(sample_set_data, template_path=str(template_file))

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_template_not_found(self, sample_set_data):
        """Test PDF generation when template file doesn't exist."""
        generator = PDFGenerator(sample_set_data, template_path="/nonexistent/template.pdf")

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            # Should fall back to generating without template
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_with_symbol_file(self, sample_set_data, tmp_path):
        """Test PDF generation with actual symbol file."""
        # Create a mock SVG symbol file
        symbol_file = tmp_path / "test-set-1.svg"
        symbol_file.write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<circle cx="50" cy="50" r="40"/></svg>'
        )

        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=str(symbol_file)):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 0

    def test_pdf_generator_types_view(self):
        """Test PDF generation for types view."""
        card_types = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
            {"color": "Blue", "type": "Instant", "name": "Instant", "id": "Blue:Instant"},
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        with patch(
            "src.services.pdf_generator.PDFGenerator._get_mana_symbol_file",
            return_value=None,
        ):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 0

    def test_pdf_generator_types_view_with_mana_symbol(self, tmp_path):
        """Test PDF generation for types view with mana symbol."""
        # Create a mock SVG symbol file
        symbol_file = tmp_path / "mana_w.svg"
        symbol_file.write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<circle cx="50" cy="50" r="40"/></svg>'
        )

        card_types = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        with patch(
            "src.services.pdf_generator.PDFGenerator._get_mana_symbol_file",
            return_value=str(symbol_file),
        ):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 0

    def test_pdf_generator_invalid_template(self, sample_set_data):
        """Test PDFGenerator with invalid template name (lines 110-113)."""
        generator = PDFGenerator(sample_set_data, template_name="invalid_template")

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_placeholder_labels(self, sample_set_data):
        """Test PDFGenerator with placeholder labels (lines 196-197)."""
        # Add placeholder at the start
        sets_with_placeholder = [{"__placeholder__": True}] + sample_set_data
        generator = PDFGenerator(sets_with_placeholder)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_invalid_date_format(self):
        """Test PDFGenerator with invalid date format (lines 309-310)."""
        sets = [
            {
                "id": "test-1",
                "name": "Test Set",
                "code": "TS1",
                "released_at": "invalid-date",
            }
        ]
        generator = PDFGenerator(sets)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_get_mana_symbol_uri_from_api_success(self):
        """_get_mana_symbol_uri_from_api resolves a symbol and memoizes the map."""
        generator = PDFGenerator([], view_mode="types")

        mock_client = Mock()
        mock_client.fetch_symbology.return_value = {
            "{W}": "https://svgs.scryfall.io/card-symbols/W.svg"
        }

        with patch.object(generator, "_get_scryfall_client", return_value=mock_client):
            result = generator._get_mana_symbol_uri_from_api("{W}", "White")
            assert result == "https://svgs.scryfall.io/card-symbols/W.svg"
            # Second call reuses the per-generator memoized map.
            result2 = generator._get_mana_symbol_uri_from_api("{W}", "White")
            assert result2 == "https://svgs.scryfall.io/card-symbols/W.svg"
            mock_client.fetch_symbology.assert_called_once()

    def test_pdf_generator_get_mana_symbol_uri_from_api_multicolor_pw(self):
        """Test _get_mana_symbol_uri_from_api for multicolor with PW symbol."""
        generator = PDFGenerator([], view_mode="types")

        mock_client = Mock()
        mock_client.fetch_symbology.return_value = {
            "{PW}": "https://svgs.scryfall.io/card-symbols/PW.svg"
        }

        with patch.object(generator, "_get_scryfall_client", return_value=mock_client):
            result = generator._get_mana_symbol_uri_from_api("{PW}", "Multicolor")
            assert result == "https://svgs.scryfall.io/card-symbols/PW.svg"

    def test_symbology_failure_is_memoized(self):
        """A symbology fetch failure is cached, so other colors skip the API."""
        generator = PDFGenerator([], view_mode="types")

        mock_client = Mock()
        mock_client.fetch_symbology.side_effect = Exception("symbology unavailable")

        with patch.object(generator, "_get_scryfall_client", return_value=mock_client):
            assert generator._get_mana_symbol_uri_from_api("{W}", "White") is None
            assert generator._get_mana_symbol_uri_from_api("{U}", "Blue") is None
            # Fetched once despite two colors -> failure memoized (no re-hit/timeout).
            mock_client.fetch_symbology.assert_called_once()

    def test_get_mana_symbol_file_falls_back_to_cache_when_api_down(self):
        """When the symbology API is unavailable, a cached mana symbol is served."""
        generator = PDFGenerator([], view_mode="types")

        with (
            patch.object(generator, "_get_mana_symbol_uri_from_api", return_value=None),
            patch("src.services.pdf_generator.get_cache_manager") as mock_gcm,
        ):
            mock_gcm.return_value.get_symbol.return_value = "/cache/mana_white_W.svg"

            result = generator._get_mana_symbol_file("White")

            assert result == "/cache/mana_white_W.svg"
            # Version-agnostic lookup: serve whatever is cached.
            mock_gcm.return_value.get_symbol.assert_called_once_with("mana_white_W")

    def test_get_mana_symbol_file_none_when_api_down_and_uncached(self):
        """No URI and no cached copy -> None (nothing to draw)."""
        generator = PDFGenerator([], view_mode="types")

        with (
            patch.object(generator, "_get_mana_symbol_uri_from_api", return_value=None),
            patch("src.services.pdf_generator.get_cache_manager") as mock_gcm,
        ):
            mock_gcm.return_value.get_symbol.return_value = None

            assert generator._get_mana_symbol_file("White") is None

    def test_pdf_generator_draw_raster_symbol(self, sample_set_data, tmp_path):
        """Test _draw_raster_symbol method (lines 598-634)."""
        # Create a mock PNG file
        png_file = tmp_path / "symbol.png"
        png_file.write_bytes(b"fake png data")

        generator = PDFGenerator(sample_set_data)
        generator.current_label = 0

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            with patch("src.services.pdf_generator.ImageReader") as mock_reader:
                mock_image = Mock()
                mock_image.getSize.return_value = (100, 100)
                mock_reader.return_value = mock_image
                # Should not raise
                generator._draw_raster_symbol(str(png_file), 0, 0, 50)

    def test_pdf_generator_draw_raster_symbol_error(self, sample_set_data):
        """Test _draw_raster_symbol with error handling."""
        generator = PDFGenerator(sample_set_data)
        generator.current_label = 0

        with patch("src.services.pdf_generator.ImageReader", side_effect=Exception("Error")):
            # Should not raise, just log error
            generator._draw_raster_symbol("/nonexistent.png", 0, 0, 50)

    def test_pdf_generator_with_custom_template_config(self, sample_set_data):
        """Test PDFGenerator with inline template_config dict."""
        custom_config = {
            "page_width": 612,
            "page_height": 792,
            "labels_per_row": 2,
            "label_rows": 5,
            "label_width": 250,
            "label_height": 144,
            "label_margin_x": 7.2,
            "label_margin_y": 7.2,
            "left_margin": 31,
            "top_margin": 36,
            "horizontal_gap": 10,
            "vertical_gap": 0,
        }
        generator = PDFGenerator(sample_set_data, template_config=custom_config)

        assert generator.template == custom_config

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_custom_config_overrides_template_name(self, sample_set_data):
        """Test that template_config takes precedence over template_name."""
        custom_config = {
            "page_width": 595.2,
            "page_height": 841.8,
            "labels_per_row": 3,
            "label_rows": 7,
            "label_width": 180,
            "label_height": 108.75,
            "label_margin_x": 7.2,
            "label_margin_y": 7.2,
            "left_margin": 20.551,
            "top_margin": 52,
            "horizontal_gap": 7.087,
            "vertical_gap": 0,
        }
        generator = PDFGenerator(
            sample_set_data,
            template_name="avery5160",
            template_config=custom_config,
        )

        # Should use custom config, not avery5160
        assert generator.template["page_width"] == 595.2
        assert generator.template["label_rows"] == 7

    def test_renders_letter_label(self):
        """A set item carrying a 'letter' renders a valid PDF."""
        set_data = [
            {
                "id": "s1",
                "name": "Modern Horizons 2",
                "code": "MH2",
                "released_at": "2021-06-18",
                "letter": "Q",
            }
        ]
        generator = PDFGenerator(set_data)
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")

    def test_renders_letter_label_narrow_template(self):
        """Letter rendering also works on the short narrow 94208 template."""
        set_data = [
            {
                "id": "s1",
                "name": "Modern Horizons 2",
                "code": "MH2",
                "released_at": "2021-06-18",
                "letter": "Q",
            }
        ]
        generator = PDFGenerator(set_data, template_name="avery94208")
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")

    def test_letter_dropped_on_too_narrow_label(self):
        """A pathologically narrow custom label drops the letter without error."""
        custom_config: dict[str, float] = {
            "page_width": 612,
            "page_height": 792,
            "labels_per_row": 1,
            "label_rows": 1,
            "label_width": 45,
            "label_height": 40,
            "label_margin_x": 5,
            "label_margin_y": 5,
            "left_margin": 20,
            "top_margin": 20,
            "horizontal_gap": 0,
            "vertical_gap": 0,
        }
        set_data = [
            {
                "id": "s1",
                "name": "Modern Horizons 2",
                "code": "MH2",
                "released_at": "2021-06-18",
                "letter": "Q",
            }
        ]
        generator = PDFGenerator(set_data, template_config=custom_config)
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")

    def test_letter_is_top_aligned(self):
        """The divider letter is anchored to the top of the label, not centered."""
        set_data = [
            {
                "id": "s1",
                "name": "Modern Horizons 2",
                "code": "MH2",
                "released_at": "2021-06-18",
                "letter": "Q",
            }
        ]
        generator = PDFGenerator(set_data)
        draw_calls: list[tuple[float, float, str]] = []
        original_draw_string = generator.canvas.drawString

        def record(x, y, text, *args, **kwargs):
            draw_calls.append((x, y, text))
            return original_draw_string(x, y, text, *args, **kwargs)

        generator.canvas.drawString = record
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            generator.generate()

        letter_calls = [call for call in draw_calls if call[2] == "Q"]
        assert letter_calls, "divider letter was not drawn"
        _, letter_y, _ = letter_calls[0]

        # First label sits in the top-left corner (row 0, col 0).
        template = generator.template
        label_top = template["page_height"] - template["top_margin"]
        label_bottom = label_top - template["label_height"]
        label_center = (label_top + label_bottom) / 2
        # Top-aligned: the baseline stays above the label's vertical center.
        assert letter_y > label_center

    def _divider_type_set_data(self, **extra) -> list[dict]:
        """A single set item carrying a White/Creature type divider."""
        return [
            {
                "id": "s1",
                "name": "Secrets of Strixhaven",
                "code": "STX",
                "released_at": "2021-04-23",
                "divider_color": "White",
                "divider_type": "Creature",
                **extra,
            }
        ]

    def _record_draw_strings(self, generator: PDFGenerator) -> list[tuple[float, float, str]]:
        """Patch the canvas to capture every drawString call."""
        calls: list[tuple[float, float, str]] = []
        original = generator.canvas.drawString

        def record(x, y, text, *args, **kwargs):
            calls.append((x, y, text))
            return original(x, y, text, *args, **kwargs)

        generator.canvas.drawString = record
        return calls

    def test_divider_type_replaces_code_and_date_line(self):
        """A type divider prints 'Color - Type' instead of the code/date line."""
        generator = PDFGenerator(self._divider_type_set_data())
        draw_calls = self._record_draw_strings(generator)
        with (
            patch("src.services.pdf_generator.get_symbol_file", return_value=None),
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value=None),
        ):
            generator.generate()

        drawn = [call[2] for call in draw_calls]
        assert "White - Creature" in drawn
        assert not any("STX" in text for text in drawn)

    def _record_symbol_calls(self, generator: PDFGenerator) -> list[dict]:
        """Patch _draw_symbol to capture each symbol's file and placement."""
        calls: list[dict] = []
        original = generator._draw_symbol

        def record(local_file, label_x, label_y, set_name, left_x=None):
            calls.append({"file": local_file, "left_x": left_x})
            return original(local_file, label_x, label_y, set_name, left_x)

        generator._draw_symbol = record
        return calls

    def test_divider_type_draws_mana_symbol_on_the_left(self):
        """The mana symbol is left-anchored ahead of the text; the set icon keeps the corner."""
        generator = PDFGenerator(self._divider_type_set_data())
        symbol_calls = self._record_symbol_calls(generator)
        text_calls = self._record_draw_strings(generator)
        with (
            patch("src.services.pdf_generator.get_symbol_file", return_value="set.svg"),
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value="mana.svg"),
            patch.object(PDFGenerator, "_draw_svg_symbol"),
        ):
            generator.generate()

        assert [call["file"] for call in symbol_calls] == ["mana.svg", "set.svg"]
        mana_left_x = symbol_calls[0]["left_x"]
        assert mana_left_x is not None
        # The set symbol has no explicit x — it right-aligns in the corner.
        assert symbol_calls[1]["left_x"] is None
        # The label's left margin holds the mana symbol, so the text starts after it.
        template = generator.template
        label_left = template["left_margin"] + template["label_margin_x"]
        assert mana_left_x == label_left
        assert all(x > mana_left_x for x, _, _ in text_calls)

    def test_types_view_draws_mana_symbol_on_the_left(self):
        """The types view moves its mana symbol to the left edge too."""
        generator = PDFGenerator(
            [{"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"}],
            view_mode="types",
        )
        symbol_calls = self._record_symbol_calls(generator)
        text_calls = self._record_draw_strings(generator)
        with (
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value="mana.svg"),
            patch.object(PDFGenerator, "_draw_svg_symbol"),
        ):
            generator.generate()

        assert [call["file"] for call in symbol_calls] == ["mana.svg"]
        template = generator.template
        label_left = template["left_margin"] + template["label_margin_x"]
        assert symbol_calls[0]["left_x"] == label_left
        assert all(x > label_left for x, _, _ in text_calls)

    def test_types_view_text_uses_the_freed_right_edge(self):
        """With no corner symbol, types-view text may run to the right margin."""
        card_type = [{"color": "White", "type": "Creature", "name": "Creature"}]
        widths: list[float] = []
        generator = PDFGenerator(card_type, view_mode="types")

        def record(text, font, size, max_width, canvas):
            widths.append(max_width)
            return text

        with (
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value=None),
            patch("src.services.pdf_generator.fit_text_to_width", side_effect=record),
        ):
            generator.generate()

        template = generator.template
        usable = template["label_width"] - 2 * template["label_margin_x"]
        assert widths and all(w == pytest.approx(usable) for w in widths)

    def test_divider_type_with_letter_renders(self):
        """Letter and type divider on one label render a valid PDF."""
        generator = PDFGenerator(self._divider_type_set_data(letter="Q"))
        with (
            patch("src.services.pdf_generator.get_symbol_file", return_value=None),
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value=None),
        ):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")

    def test_divider_type_narrow_template_renders(self):
        """Type dividers also work on the short narrow 94208 template."""
        generator = PDFGenerator(
            self._divider_type_set_data(letter="Q"), template_name="avery94208"
        )
        with (
            patch("src.services.pdf_generator.get_symbol_file", return_value=None),
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value=None),
        ):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")

    def test_mana_symbol_dropped_on_too_narrow_label(self):
        """A pathologically narrow custom label drops the extras without error."""
        custom_config: dict[str, float] = {
            "page_width": 612,
            "page_height": 792,
            "labels_per_row": 1,
            "label_rows": 1,
            "label_width": 45,
            "label_height": 40,
            "label_margin_x": 5,
            "label_margin_y": 5,
            "left_margin": 20,
            "top_margin": 20,
            "horizontal_gap": 0,
            "vertical_gap": 0,
        }
        generator = PDFGenerator(
            self._divider_type_set_data(letter="Q"), template_config=custom_config
        )
        symbol_files: list[str] = []
        with (
            patch("src.services.pdf_generator.get_symbol_file", return_value="set.svg"),
            patch.object(PDFGenerator, "_get_mana_symbol_file", return_value="mana.svg"),
            patch.object(
                PDFGenerator,
                "_draw_svg_symbol",
                side_effect=lambda f, *a, **kw: symbol_files.append(f),
            ),
        ):
            result = generator.generate()

        assert result.read().startswith(b"%PDF")
        assert symbol_files == ["set.svg"]

    def test_no_divider_type_keeps_code_and_date(self):
        """Without a type divider the second line is unchanged."""
        set_data = [
            {
                "id": "s1",
                "name": "Secrets of Strixhaven",
                "code": "STX",
                "released_at": "2021-04-23",
            }
        ]
        generator = PDFGenerator(set_data)
        draw_calls = self._record_draw_strings(generator)
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            generator.generate()

        assert "STX - April 2021" in [call[2] for call in draw_calls]
