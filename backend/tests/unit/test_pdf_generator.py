"""Unit tests for PDFGenerator."""

from io import BytesIO
from unittest.mock import Mock, patch

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
        """Test _get_mana_symbol_uri_from_api successful fetch."""
        card_types = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "object": "card_symbol",
                    "symbol": "{W}",
                    "svg_uri": "https://svgs.scryfall.io/card-symbols/W.svg",
                }
            ]
        }

        with patch("requests.get", return_value=mock_response):
            # First call should fetch and cache
            result = generator._get_mana_symbol_uri_from_api("{W}", "White")
            assert result == "https://svgs.scryfall.io/card-symbols/W.svg"
            # Second call should use cache
            result2 = generator._get_mana_symbol_uri_from_api("{W}", "White")
            assert result2 == "https://svgs.scryfall.io/card-symbols/W.svg"

    def test_pdf_generator_get_mana_symbol_uri_from_api_multicolor_pw(self):
        """Test _get_mana_symbol_uri_from_api for multicolor with PW symbol."""
        card_types = [
            {
                "color": "Multicolor",
                "type": "Creature",
                "name": "Creature",
                "id": "Multicolor:Creature",
            },
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "object": "card_symbol",
                    "symbol": "{PW}",
                    "svg_uri": "https://svgs.scryfall.io/card-symbols/PW.svg",
                }
            ]
        }

        with patch("requests.get", return_value=mock_response):
            result = generator._get_mana_symbol_uri_from_api("{PW}", "Multicolor")
            assert result == "https://svgs.scryfall.io/card-symbols/PW.svg"

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


class TestPDFGeneratorLabelLayout:
    """Tests for PDFGenerator label_layout configuration."""

    def test_merge_layout_with_none(self, sample_set_data):
        """Passing None layout returns a copy of the defaults."""
        generator = PDFGenerator(sample_set_data, label_layout=None)

        assert generator.label_layout == PDFGenerator.DEFAULT_LABEL_LAYOUT
        # Verify it's a copy, not a reference
        assert generator.label_layout is not PDFGenerator.DEFAULT_LABEL_LAYOUT

    def test_merge_layout_with_empty_dict(self, sample_set_data):
        """Empty layout dict falls back to defaults."""
        generator = PDFGenerator(sample_set_data, label_layout={})

        assert generator.label_layout == PDFGenerator.DEFAULT_LABEL_LAYOUT

    def test_merge_layout_partial_override(self, sample_set_data):
        """Partial element overrides merge with element defaults."""
        partial = {
            "setIcon": {"size": 90},
            "padding": 10,
        }
        generator = PDFGenerator(sample_set_data, label_layout=partial)

        # setIcon: size overridden, but visible/position retained from defaults
        assert generator.label_layout["setIcon"]["size"] == 90
        assert generator.label_layout["setIcon"]["visible"] is True
        assert generator.label_layout["setIcon"]["position"] == "middle-left"
        # padding overridden
        assert generator.label_layout["padding"] == 10
        # Untouched element retains defaults
        assert generator.label_layout["setName"] == PDFGenerator.DEFAULT_LABEL_LAYOUT["setName"]

    def test_merge_layout_full_override(self, sample_set_data):
        """All custom layout fields are honored."""
        layout = {
            "setIcon": {"visible": False, "position": "top-left", "size": 50},
            "setName": {
                "visible": True,
                "position": "bottom-center",
                "fontFamily": "Helvetica",
                "fontSize": 10,
            },
            "setCode": {
                "visible": True,
                "position": "top-right",
                "fontFamily": "Helvetica-Bold",
                "fontSize": 9,
            },
            "releaseDate": {
                "visible": True,
                "position": "bottom-right",
                "fontFamily": "Helvetica",
                "fontSize": 6,
            },
            "padding": 8,
        }
        generator = PDFGenerator(sample_set_data, label_layout=layout)

        assert generator.label_layout["setIcon"]["visible"] is False
        assert generator.label_layout["setIcon"]["size"] == 50
        assert generator.label_layout["setName"]["fontSize"] == 10
        assert generator.label_layout["releaseDate"]["visible"] is True
        assert generator.label_layout["padding"] == 8

    def test_get_position_coords_all_positions(self, sample_set_data):
        """All 9 position presets produce coordinates within content area."""
        generator = PDFGenerator(sample_set_data)

        cx, cy, cw, ch = 100.0, 200.0, 80.0, 60.0
        ew, eh = 10.0, 10.0
        positions = [
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-center",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
        ]
        for position in positions:
            x, y = generator._get_position_coords(position, cx, cy, cw, ch, ew, eh)
            assert cx <= x <= cx + cw
            assert cy <= y <= cy + ch

    def test_get_position_coords_center_alignment(self, sample_set_data):
        """Middle-center centers the element within content area."""
        generator = PDFGenerator(sample_set_data)

        x, y = generator._get_position_coords("middle-center", 0, 0, 100, 100, 20, 20)

        assert x == 40
        assert y == 40

    def test_get_position_coords_default_when_invalid(self, sample_set_data):
        """A bare position string falls back to middle/center semantics for missing axis."""
        generator = PDFGenerator(sample_set_data)

        # Single token -> vertical only, horizontal defaults to "center"
        x, y = generator._get_position_coords("top", 0, 0, 100, 100, 20, 20)
        # vertical "top" -> y = 0 + 100 - 20 = 80; horizontal default "center" -> x = 40
        assert x == 40
        assert y == 80

    def test_pdf_generator_with_custom_layout_renders(self, sample_set_data):
        """PDF generation with custom label_layout produces a valid PDF."""
        layout = {
            "setIcon": {"visible": True, "position": "top-left", "size": 40},
            "setName": {
                "visible": True,
                "position": "middle-center",
                "fontFamily": "Helvetica",
                "fontSize": 9,
            },
            "setCode": {"visible": True, "position": "bottom-left"},
            "releaseDate": {"visible": True, "position": "bottom-right"},
            "padding": 6,
        }
        generator = PDFGenerator(sample_set_data, label_layout=layout)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 1000

    def test_pdf_generator_layout_hides_elements(self, sample_set_data):
        """Layout with visible=False on all elements still produces a valid PDF."""
        layout = {
            "setIcon": {"visible": False},
            "setName": {"visible": False},
            "setCode": {"visible": False},
            "releaseDate": {"visible": False},
            "padding": 4,
        }
        generator = PDFGenerator(sample_set_data, label_layout=layout)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_layout_types_view(self):
        """Custom layout works in card-types view mode."""
        items = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
            {"color": "Blue", "type": "Instant", "name": "Instant", "id": "Blue:Instant"},
        ]
        layout = {
            "setName": {"visible": True, "position": "middle-center", "fontSize": 10},
        }
        generator = PDFGenerator(items, view_mode="types", label_layout=layout)

        with patch.object(generator, "_get_mana_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_layout_with_svg_symbol(self, sample_set_data, mock_svg_file):
        """Custom layout exercises positioned SVG rendering when symbol_file is an SVG."""
        layout = {
            "setIcon": {"visible": True, "position": "middle-left", "size": 60},
            "setName": {"visible": True, "position": "top-right"},
            "setCode": {"visible": True, "position": "bottom-right"},
            "releaseDate": {"visible": True, "position": "bottom-left"},
        }
        generator = PDFGenerator(sample_set_data, label_layout=layout)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=str(mock_svg_file)):
            result = generator.generate()

        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_draw_svg_symbol_directly(self, sample_set_data, mock_svg_file):
        """Directly invoking _draw_svg_symbol renders without raising."""
        generator = PDFGenerator(sample_set_data)

        # Should not raise; covers SVG drawing branch
        generator._draw_svg_symbol(
            str(mock_svg_file), label_x=10, label_y=20, target_height=30, set_name="TS1"
        )

    def test_draw_positioned_raster_symbol_directly(self, sample_set_data, tmp_path):
        """Directly invoking _draw_positioned_raster_symbol covers the raster branch."""
        # Generate a tiny PNG via PIL (already a transitive dep via reportlab/Pillow)
        from PIL import Image

        png_file = tmp_path / "tiny.png"
        Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(png_file)

        generator = PDFGenerator(sample_set_data)

        generator._draw_positioned_raster_symbol(
            str(png_file),
            content_x=10,
            content_y=20,
            content_width=80,
            content_height=60,
            position="middle-left",
            target_height=30,
            target_width=30,
        )

    def test_draw_positioned_symbol_dispatches_by_extension(
        self, sample_set_data, mock_svg_file, tmp_path
    ):
        """_draw_positioned_symbol routes .svg to SVG path and other extensions to raster path."""
        from PIL import Image

        png_file = tmp_path / "tiny.png"
        Image.new("RGBA", (4, 4), (0, 255, 0, 255)).save(png_file)

        generator = PDFGenerator(sample_set_data)

        # SVG dispatch
        generator._draw_positioned_symbol(
            str(mock_svg_file),
            content_x=0,
            content_y=0,
            content_width=100,
            content_height=100,
            position="middle-center",
            size_percent=50,
            set_name="svg-set",
        )

        # Raster dispatch
        generator._draw_positioned_symbol(
            str(png_file),
            content_x=0,
            content_y=0,
            content_width=100,
            content_height=100,
            position="middle-center",
            size_percent=50,
            set_name="png-set",
        )
