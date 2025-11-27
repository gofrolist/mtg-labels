"""Unit tests for memory leak detection."""

import gc
import tracemalloc
from unittest.mock import patch

from src.services.pdf_generator import PDFGenerator


class TestMemoryLeakDetection:
    """Tests to detect memory leaks in PDF generation."""

    def test_pdf_generator_memory_cleanup(self):
        """Test that PDFGenerator properly cleans up memory after generation."""
        sets = [
            {"id": f"test-{i}", "name": f"Set {i}", "code": f"S{i}", "released_at": "2023-01-01"}
            for i in range(10)
        ]

        tracemalloc.start()
        initial_snapshot = tracemalloc.take_snapshot()

        # Generate PDF multiple times
        for _ in range(5):
            generator = PDFGenerator(sets)
            with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
                result = generator.generate()
                result.read()  # Consume buffer
                del generator
                del result
            gc.collect()  # Force garbage collection

        final_snapshot = tracemalloc.take_snapshot()
        tracemalloc.stop()

        # Compare memory usage
        top_stats = final_snapshot.compare_to(initial_snapshot, "lineno")

        # Check that memory growth is reasonable
        total_diff = sum(stat.size_diff for stat in top_stats)
        # Allow some memory growth but not excessive (e.g., <10MB)
        assert total_diff < 10 * 1024 * 1024, (
            f"Memory leak detected: {total_diff / 1024 / 1024:.2f}MB growth"
        )

    def test_multiple_pdf_generations_no_leak(self):
        """Test that multiple PDF generations don't cause memory leaks."""
        import os

        import psutil

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        sets = [
            {"id": f"test-{i}", "name": f"Set {i}", "code": f"S{i}", "released_at": "2023-01-01"}
            for i in range(20)
        ]

        # Generate many PDFs
        for _ in range(20):
            generator = PDFGenerator(sets)
            with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
                result = generator.generate()
                result.read()
                del generator
                del result
            gc.collect()

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (<200MB for 20 PDFs)
        assert memory_increase < 200, f"Memory leak detected: {memory_increase:.2f}MB increase"

    def test_canvas_cleanup(self):
        """Test that ReportLab canvas objects are properly cleaned up."""
        sets = [{"id": "test-1", "name": "Test Set", "code": "TS", "released_at": "2023-01-01"}]

        # Track object count before
        gc.collect()
        initial_count = len(gc.get_objects())

        # Generate PDF
        generator = PDFGenerator(sets)
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
            result.read()

        # Clean up
        del generator
        del result
        gc.collect()

        # Object count should return to near initial
        final_count = len(gc.get_objects())
        # Allow some variance but not excessive growth
        object_growth = final_count - initial_count
        assert object_growth < 1000, f"Too many objects remaining: {object_growth} objects"
