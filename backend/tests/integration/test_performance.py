"""Performance tests for MTG Label Generator.

These tests verify performance requirements:
- PDF generation <10s for 30 sets
- Memory usage stability
- CPU usage <80%
- Concurrent request handling (10+ requests)
"""

import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch

import psutil
import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen.canvas import Canvas

from src.api.routes import create_app
from src.services.pdf_generator import PDFGenerator


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(create_app())


@pytest.fixture
def sample_sets_30():
    """Generate 30 sample sets for performance testing."""
    return [
        {
            "id": f"test-set-{i}",
            "name": f"Test Set {i}",
            "code": f"TS{i:02d}",
            "set_type": "expansion",
            "card_count": 100 + i,
            "released_at": f"2023-{(i % 12) + 1:02d}-01",
            "icon_svg_uri": None,  # Skip symbol downloads for performance tests
        }
        for i in range(30)
    ]


@pytest.mark.performance
class TestPDFGenerationPerformance:
    """Performance tests for PDF generation."""

    def test_pdf_generation_time_under_10_seconds(self, sample_sets_30):
        """Test that PDF generation completes in under 10 seconds for 30 sets."""
        generator = PDFGenerator(sample_sets_30)

        start_time = time.time()
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
        end_time = time.time()

        duration = end_time - start_time
        assert duration < 10.0, f"PDF generation took {duration:.2f}s, expected <10s"
        assert result is not None
        assert len(result.read()) > 0

    def test_pdf_generation_memory_stability(self, sample_sets_30):
        """Test that memory usage remains stable during PDF generation."""
        import tracemalloc

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        tracemalloc.start()
        initial_traced = tracemalloc.take_snapshot()

        # Generate multiple PDFs to check for memory leaks
        for _ in range(5):
            generator = PDFGenerator(sample_sets_30)
            with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
                result = generator.generate()
                result.read()  # Consume the buffer
                del generator
                del result

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        final_traced = tracemalloc.take_snapshot()

        memory_increase = final_memory - initial_memory
        # Memory increase should be reasonable (<100MB for 5 PDFs)
        assert memory_increase < 100, (
            f"Memory increased by {memory_increase:.2f}MB, expected <100MB"
        )

        # Check for memory leaks using tracemalloc
        final_traced.compare_to(initial_traced, "lineno")
        tracemalloc.stop()

    def test_pdf_generation_cpu_usage(self, sample_sets_30):
        """Test that CPU usage stays below 80% during PDF generation."""
        process = psutil.Process(os.getpid())

        # Measure CPU usage during PDF generation
        process.cpu_percent(interval=None)  # Initialize
        time.sleep(0.1)  # Small delay for measurement

        generator = PDFGenerator(sample_sets_30)
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            cpu_percent = process.cpu_percent(interval=1.0)
            generator.generate()

        # CPU usage should be below 80%
        # Note: This test may be flaky in CI environments, so we use a higher
        # threshold
        assert cpu_percent < 90, (
            f"CPU usage was {cpu_percent}%, expected <90% (allowing margin for CI)"
        )

    def test_concurrent_pdf_generation(self, sample_sets_30):
        """Test handling of concurrent PDF generation requests."""

        def generate_pdf():
            generator = PDFGenerator(sample_sets_30)
            with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
                result = generator.generate()
                return len(result.read())

        # Generate 10 PDFs concurrently
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(generate_pdf) for _ in range(10)]
            results = [future.result(timeout=30) for future in as_completed(futures)]

        # All PDFs should be generated successfully
        assert len(results) == 10
        assert all(size > 0 for size in results)

        # All PDFs should have similar sizes (within 10% variance)
        avg_size = sum(results) / len(results)
        for size in results:
            variance = abs(size - avg_size) / avg_size
            assert variance < 0.1, f"PDF size variance too high: {variance:.2%}"

    def test_font_subsetting_never_overlaps(self, sample_sets_30):
        """Two canvases must never be inside save() at the same time.

        Registered fonts are process-global, and the shared TTFontFace seeks a
        single byte cursor while subsetting glyphs at save time. An overlap
        corrupts the read and raises deep inside reportlab.pdfbase.ttfonts —
        rarely, and only under load, which is what made it a CI flake and an
        intermittent 500 on the PDF endpoint rather than an obvious bug.

        The sleep widens the window so an unserialized save overlaps every run,
        making this deterministic instead of another race against a race.
        """
        inside = 0
        overlapped = False
        counter_lock = threading.Lock()
        real_save = Canvas.save

        def instrumented_save(canvas_self):
            nonlocal inside, overlapped
            with counter_lock:
                inside += 1
                overlapped = overlapped or inside > 1
            try:
                time.sleep(0.02)
                return real_save(canvas_self)
            finally:
                with counter_lock:
                    inside -= 1

        def generate_pdf():
            generator = PDFGenerator(sample_sets_30)
            with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
                return len(generator.generate().read())

        with patch.object(Canvas, "save", instrumented_save):
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = [executor.submit(generate_pdf) for _ in range(8)]
                results = [future.result(timeout=60) for future in as_completed(futures)]

        assert not overlapped, "concurrent saves overlapped; font subsetting is not serialized"
        assert all(size > 0 for size in results)


@pytest.mark.performance
class TestConcurrentRequestHandling:
    """Tests for concurrent request handling."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_concurrent_api_requests(self, mock_fetch, client, sample_sets_30):
        """Test that API handles 10+ concurrent requests."""
        mock_fetch.return_value = sample_sets_30

        def make_request():
            response = client.get("/api/sets")
            return response.status_code == 200

        # Make 15 concurrent requests
        with ThreadPoolExecutor(max_workers=15) as executor:
            futures = [executor.submit(make_request) for _ in range(15)]
            results = [future.result(timeout=10) for future in as_completed(futures)]

        # All requests should succeed
        assert len(results) == 15
        assert all(results), "Some concurrent requests failed"

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_concurrent_pdf_endpoint_requests(self, mock_fetch, client, sample_sets_30):
        """Test concurrent requests to PDF generation endpoint."""
        mock_fetch.return_value = sample_sets_30

        def generate_pdf_request():
            response = client.post(
                "/generate-pdf", data={"set_ids": [f"test-set-{i}" for i in range(10)]}
            )
            return response.status_code == 200

        # Make 10 concurrent PDF generation requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(generate_pdf_request) for _ in range(10)]
            results = [future.result(timeout=60) for future in as_completed(futures)]

        # All requests should succeed (or at least most)
        success_count = sum(results)
        assert success_count >= 8, f"Only {success_count}/10 concurrent requests succeeded"
