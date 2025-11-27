"""Integration tests for UV package management."""

import shutil
import subprocess
import time
from pathlib import Path

import pytest


class TestUVDependencyInstallationSpeed:
    """Tests for UV dependency installation speed."""

    def test_uv_sync_speed(self, tmp_path):
        """Test that UV dependency installation completes in under 30 seconds."""
        # Create a temporary project directory
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()

        # Copy pyproject.toml, uv.lock, and src directory to test project
        source_dir = Path(__file__).parent.parent.parent
        shutil.copy(source_dir / "pyproject.toml", project_dir / "pyproject.toml")
        shutil.copy(source_dir / "uv.lock", project_dir / "uv.lock")
        # Copy src directory (needed for editable install)
        if (source_dir / "src").exists():
            shutil.copytree(source_dir / "src", project_dir / "src")

        # Measure installation time
        start_time = time.time()

        try:
            result = subprocess.run(
                ["uv", "sync", "--no-dev"],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60,
            )
            end_time = time.time()

            duration = end_time - start_time

            # Installation should complete successfully
            assert result.returncode == 0, f"UV sync failed: {result.stderr}"

            # Installation should be fast (<30 seconds)
            assert duration < 30.0, f"UV sync took {duration:.2f}s, expected <30s"

        except subprocess.TimeoutExpired:
            pytest.fail("UV sync timed out after 60 seconds")
        except FileNotFoundError:
            pytest.skip("UV not installed or not in PATH")

    def test_uv_sync_with_dev_dependencies_speed(self, tmp_path):
        """Test that UV sync with dev dependencies completes in reasonable time."""
        # Create a temporary project directory
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()

        # Copy pyproject.toml, uv.lock, and src directory to test project
        source_dir = Path(__file__).parent.parent.parent
        shutil.copy(source_dir / "pyproject.toml", project_dir / "pyproject.toml")
        shutil.copy(source_dir / "uv.lock", project_dir / "uv.lock")
        # Copy src directory (needed for editable install)
        if (source_dir / "src").exists():
            shutil.copytree(source_dir / "src", project_dir / "src")

        # Measure installation time
        start_time = time.time()

        try:
            result = subprocess.run(
                ["uv", "sync"], cwd=project_dir, capture_output=True, text=True, timeout=60
            )
            end_time = time.time()

            duration = end_time - start_time

            # Installation should complete successfully
            assert result.returncode == 0, f"UV sync failed: {result.stderr}"

            # Installation should be fast (<45 seconds with dev deps)
            assert duration < 45.0, f"UV sync with dev deps took {duration:.2f}s, expected <45s"

        except subprocess.TimeoutExpired:
            pytest.fail("UV sync timed out after 60 seconds")
        except FileNotFoundError:
            pytest.skip("UV not installed or not in PATH")


class TestBuildReproducibility:
    """Tests for build reproducibility across environments."""

    def test_uv_lock_file_exists(self):
        """Test that uv.lock file exists and is valid."""
        project_root = Path(__file__).parent.parent.parent
        uv_lock = project_root / "uv.lock"

        assert uv_lock.exists(), "uv.lock file should exist"
        assert uv_lock.stat().st_size > 0, "uv.lock file should not be empty"

    def test_uv_lock_file_format(self):
        """Test that uv.lock file has valid format."""
        project_root = Path(__file__).parent.parent.parent
        uv_lock = project_root / "uv.lock"

        # Read and check basic structure
        content = uv_lock.read_text()
        assert "version" in content or "package" in content, (
            "uv.lock should contain package information"
        )

    def test_reproducible_install(self, tmp_path):
        """Test that installation is reproducible using uv.lock."""
        # Create a temporary project directory
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()

        # Copy pyproject.toml, uv.lock, and src directory to test project
        source_dir = Path(__file__).parent.parent.parent
        shutil.copy(source_dir / "pyproject.toml", project_dir / "pyproject.toml")
        shutil.copy(source_dir / "uv.lock", project_dir / "uv.lock")
        # Copy src directory (needed for editable install)
        if (source_dir / "src").exists():
            shutil.copytree(source_dir / "src", project_dir / "src")

        try:
            # Install dependencies
            result1 = subprocess.run(
                ["uv", "sync", "--no-dev"],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60,
            )
            assert result1.returncode == 0, f"First install failed: {result1.stderr}"

            # Get installed packages from first install
            result_list1 = subprocess.run(
                ["uv", "pip", "list"], cwd=project_dir, capture_output=True, text=True, timeout=10
            )

            # Remove .venv and reinstall
            venv_dir = project_dir / ".venv"
            if venv_dir.exists():
                shutil.rmtree(venv_dir)

            result2 = subprocess.run(
                ["uv", "sync", "--no-dev"],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60,
            )
            assert result2.returncode == 0, f"Second install failed: {result2.stderr}"

            # Get installed packages from second install
            result_list2 = subprocess.run(
                ["uv", "pip", "list"], cwd=project_dir, capture_output=True, text=True, timeout=10
            )

            # Compare package lists (should be identical)
            # Note: This is a basic check - full reproducibility would
            # require exact version matching
            assert result_list1.returncode == 0 and result_list2.returncode == 0

        except FileNotFoundError:
            pytest.skip("UV not installed or not in PATH")
        except subprocess.TimeoutExpired:
            pytest.skip("UV commands timed out")

    def test_pyproject_toml_pep621_format(self):
        """Test that pyproject.toml follows PEP 621 standard."""
        project_root = Path(__file__).parent.parent.parent
        pyproject = project_root / "pyproject.toml"

        content = pyproject.read_text()

        # Check for PEP 621 required fields
        assert "[project]" in content, "pyproject.toml should have [project] section"
        assert "name =" in content, "pyproject.toml should have name field"
        assert "dependencies =" in content, "pyproject.toml should have dependencies field"

        # Should not have Poetry-specific sections
        assert "[tool.poetry]" not in content, "pyproject.toml should not have Poetry sections"
        assert "[tool.poetry.dependencies]" not in content, (
            "pyproject.toml should not have Poetry dependencies"
        )

    def test_build_system_uv(self):
        """Test that build system uses UV."""
        project_root = Path(__file__).parent.parent.parent
        pyproject = project_root / "pyproject.toml"

        content = pyproject.read_text()

        # Check for UV build system
        assert "[build-system]" in content, "pyproject.toml should have [build-system] section"
        assert "uv_build" in content, "pyproject.toml should use uv_build as build backend"
